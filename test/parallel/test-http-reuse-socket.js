// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';
const common = require('../common');
const http = require('http');
const assert = require('assert');
const Countdown = require('../common/countdown');

// The HEAD:204, GET:200 was the most pathological test case I could find.
// GETs following a 204 response with a content-encoding header failed.
// Responses without bodies and without content-length or encoding caused
//   the socket to be closed.
const codes = [204, 200, 200];
const methods = ['HEAD', 'HEAD', 'GET'];

const sockets = [];
const agent = new http.Agent();
agent.maxSockets = 1;

const countdown = new Countdown(codes.length, () => server.close());

const server = http.createServer(common.mustCall((req, res) => {
  const code = codes.shift();
  assert.strictEqual(typeof code, 'number');
  assert.ok(code > 0);
  res.writeHead(code, {});
  res.end();
}, codes.length));

function nextRequest() {

  const request = http.request({
    port: server.address().port,
    path: '/',
    agent: agent,
    method: methods.shift()
  }, common.mustCall((response) => {
    response.on('end', common.mustCall(() => {
      if (countdown.dec()) {
        nextRequest();
      }
      assert.strictEqual(sockets.length, 1);
    }));
    response.resume();
  }));
  request.on('socket', common.mustCall((socket) => {
    if (sockets.indexOf(socket) === -1) {
      sockets.push(socket);
    }
  }));
  request.end();
}

server.listen(0, nextRequest);

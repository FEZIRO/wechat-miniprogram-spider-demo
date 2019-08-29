module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1542288006498, function(require, module, exports) {
'use strict';

/**
 * Module dependencies.
 */

const debug = require('debug')('superagent');
const formidable = require('formidable');
const FormData = require('form-data');
const Response = require('./response');
const parse = require('url').parse;
const format = require('url').format;
const resolve = require('url').resolve;
let methods = require('methods');
const Stream = require('stream');
const utils = require('../utils');
const unzip = require('./unzip').unzip;
const mime = require('mime');
const https = require('https');
const http = require('http');
const fs = require('fs');
const qs = require('qs');
const zlib = require('zlib');
const util = require('util');
const pkg = require('../../package.json');
const RequestBase = require('../request-base');
const CookieJar = require('cookiejar');
let http2;
try {
  http2 = require('./http2wrapper');
  console.warn('superagent: Enable experimental feature http2');
} catch (_) {
}

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new exports.Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new exports.Request('GET', method);
  }

  return new exports.Request(method, url);
}
exports = module.exports = request;

/**
 * Expose `Request`.
 */

exports.Request = Request;

/**
 * Expose the agent function
 */

exports.agent = require('./agent');

/**
 * Noop.
 */

function noop(){};

/**
 * Expose `Response`.
 */

exports.Response = Response;

/**
 * Define "form" mime type.
 */

mime.define({
  'application/x-www-form-urlencoded': ['form', 'urlencoded', 'form-data']
}, true);

/**
 * Protocol map.
 */

exports.protocols = {
  'http:': http,
  'https:': https,
  'http2:': http2,
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

exports.serialize = {
  'application/x-www-form-urlencoded': qs.stringify,
  'application/json': JSON.stringify,
};

/**
 * Default parsers.
 *
 *     superagent.parse['application/xml'] = function(res, fn){
 *       fn(null, res);
 *     };
 *
 */

exports.parse = require('./parsers');


/**
 * Default buffering map. Can be used to set certain
 * response types to buffer/not buffer.
 *
 *     superagent.buffer['application/xml'] = true;
 */
exports.buffer = {};

/**
 * Initialize internal header tracking properties on a request instance.
 *
 * @param {Object} req the instance
 * @api private
 */
function _initHeaders(req) {
  const ua = `node-superagent/${pkg.version}`;
  req._header = { // coerces header names to lowercase
    'user-agent': ua
  };
  req.header = { // preserves header name case
    'User-Agent': ua
  };
}

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String|Object} url
 * @api public
 */

function Request(method, url) {
  Stream.call(this);
  if ('string' != typeof url) url = format(url);
  this._enableHttp2 = !!process.env.HTTP2_TEST; // internal only
  this._agent = false;
  this._formData = null;
  this.method = method;
  this.url = url;
  _initHeaders(this);
  this.writable = true;
  this._redirects = 0;
  this.redirects(method === 'HEAD' ? 0 : 5);
  this.cookies = '';
  this.qs = {};
  this._query = [];
  this.qsRaw = this._query; // Unused, for backwards compatibility only
  this._redirectList = [];
  this._streamRequest = false;
  this.once('end', this.clearTimeout.bind(this));
}

/**
 * Inherit from `Stream` (which inherits from `EventEmitter`).
 * Mixin `RequestBase`.
 */
util.inherits(Request, Stream);
RequestBase(Request.prototype);

/**
 * Enable or Disable http2.
 *
 * Enable http2.
 *
 * ``` js
 * request.get('http://localhost/')
 *   .http2()
 *   .end(callback);
 *
 * request.get('http://localhost/')
 *   .http2(true)
 *   .end(callback);
 * ```
 *
 * Disable http2.
 *
 * ``` js
 * request = request.http2();
 * request.get('http://localhost/')
 *   .http2(false)
 *   .end(callback);
 * ```
 *
 * @param {Boolean} enable
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.http2 = function(bool){
  if (exports.protocols['http2:'] === undefined){
    throw new Error('superagent: does not support http2');
  }
  this._enableHttp2 = bool === undefined ? true : bool;
  return this;
}

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `options` (or filename).
 *
 * ``` js
 * request.post('http://localhost/upload')
 *   .attach('field', Buffer.from('<b>Hello world</b>'), 'hello.html')
 *   .end(callback);
 * ```
 *
 * A filename may also be used:
 *
 * ``` js
 * request.post('http://localhost/upload')
 *   .attach('files', 'image.jpg')
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {String|fs.ReadStream|Buffer} file
 * @param {String|Object} options
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, options){
  if (file) {
    if (this._data) {
      throw Error("superagent can't mix .send() and .attach()");
    }

    let o = options || {};
    if ('string' == typeof options) {
      o = { filename: options };
    }

    if ('string' == typeof file) {
      if (!o.filename) o.filename = file;
      debug('creating `fs.ReadStream` instance for file: %s', file);
      file = fs.createReadStream(file);
    } else if (!o.filename && file.path) {
      o.filename = file.path;
    }

    this._getFormData().append(field, file, o);
  }
  return this;
};

Request.prototype._getFormData = function() {
  if (!this._formData) {
    this._formData = new FormData();
    this._formData.on('error', err => {
      this.emit('error', err);
      this.abort();
    });
  }
  return this._formData;
};

/**
 * Gets/sets the `Agent` to use for this HTTP request. The default (if this
 * function is not called) is to opt out of connection pooling (`agent: false`).
 *
 * @param {http.Agent} agent
 * @return {http.Agent}
 * @api public
 */

Request.prototype.agent = function(agent){
  if (!arguments.length) return this._agent;
  this._agent = agent;
  return this;
};

/**
 * Set _Content-Type_ response header passed through `mime.getType()`.
 *
 * Examples:
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('json')
 *        .send(jsonstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/json')
 *        .send(jsonstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type) {
  return this.set(
    'Content-Type',
    ~type.indexOf('/') ? type : mime.getType(type)
  );
};

/**
 * Set _Accept_ response header passed through `mime.getType()`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  return this.set('Accept', ~type.indexOf('/')
    ? type
    : mime.getType(type));
};

/**
 * Add query-string `val`.
 *
 * Examples:
 *
 *   request.get('/shoes')
 *     .query('size=10')
 *     .query({ color: 'blue' })
 *
 * @param {Object|String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.query = function(val){
  if ('string' == typeof val) {
    this._query.push(val);
  } else {
    Object.assign(this.qs, val);
  }
  return this;
};

/**
 * Write raw `data` / `encoding` to the socket.
 *
 * @param {Buffer|String} data
 * @param {String} encoding
 * @return {Boolean}
 * @api public
 */

Request.prototype.write = function(data, encoding){
  const req = this.request();
  if (!this._streamRequest) {
    this._streamRequest = true;
  }
  return req.write(data, encoding);
};

/**
 * Pipe the request body to `stream`.
 *
 * @param {Stream} stream
 * @param {Object} options
 * @return {Stream}
 * @api public
 */

Request.prototype.pipe = function(stream, options){
  this.piped = true; // HACK...
  this.buffer(false);
  this.end();
  return this._pipeContinue(stream, options);
};

Request.prototype._pipeContinue = function(stream, options){
  this.req.once('response', res => {
    // redirect
    const redirect = isRedirect(res.statusCode);
    if (redirect && this._redirects++ != this._maxRedirects) {
      return this._redirect(res)._pipeContinue(stream, options);
    }

    this.res = res;
    this._emitResponse();
    if (this._aborted) return;

    if (this._shouldUnzip(res)) {
      const unzipObj = zlib.createUnzip();
      unzipObj.on('error', err => {
        if (err && err.code === 'Z_BUF_ERROR') { // unexpected end of file is ignored by browsers and curl
          stream.emit('end');
          return;
        }
        stream.emit('error', err);
      });
      res.pipe(unzipObj).pipe(stream, options);
    } else {
      res.pipe(stream, options);
    }
    res.once('end', () => {
      this.emit('end');
    });
  });
  return stream;
};

/**
 * Enable / disable buffering.
 *
 * @return {Boolean} [val]
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.buffer = function(val){
  this._buffer = (false !== val);
  return this;
};

/**
 * Redirect to `url
 *
 * @param {IncomingMessage} res
 * @return {Request} for chaining
 * @api private
 */

Request.prototype._redirect = function(res){
  let url = res.headers.location;
  if (!url) {
    return this.callback(new Error('No location header for redirect'), res);
  }

  debug('redirect %s -> %s', this.url, url);

  // location
  url = resolve(this.url, url);

  // ensure the response is being consumed
  // this is required for Node v0.10+
  res.resume();

  let headers = this.req._headers;

  const changesOrigin = parse(url).host !== parse(this.url).host;

  // implementation of 302 following defacto standard
  if (res.statusCode == 301 || res.statusCode == 302){
    // strip Content-* related fields
    // in case of POST etc
    headers = utils.cleanHeader(this.req._headers, changesOrigin);

    // force GET
    this.method = 'HEAD' == this.method
      ? 'HEAD'
      : 'GET';

    // clear data
    this._data = null;
  }
  // 303 is always GET
  if (res.statusCode == 303) {
    // strip Content-* related fields
    // in case of POST etc
    headers = utils.cleanHeader(this.req._headers, changesOrigin);

    // force method
    this.method = 'GET';

    // clear data
    this._data = null;
  }
  // 307 preserves method
  // 308 preserves method
  delete headers.host;

  delete this.req;
  delete this._formData;

  // remove all add header except User-Agent
  _initHeaders(this);

  // redirect
  this._endCalled = false;
  this.url = url;
  this.qs = {};
  this._query.length = 0;
  this.set(headers);
  this.emit('redirect', res);
  this._redirectList.push(this.url);
  this.end(this._callback);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * Examples:
 *
 *   .auth('tobi', 'learnboost')
 *   .auth('tobi:learnboost')
 *   .auth('tobi')
 *   .auth(accessToken, { type: 'bearer' })
 *
 * @param {String} user
 * @param {String} [pass]
 * @param {Object} [options] options with authorization type 'basic' or 'bearer' ('basic' is default)
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass, options){
  if (1 === arguments.length) pass = '';
  if (typeof pass === 'object' && pass !== null) { // pass is optional and can be replaced with options
    options = pass;
    pass = '';
  }
  if (!options) {
    options = { type: 'basic' };
  }

  const encoder = string => new Buffer.from(string).toString('base64');

  return this._auth(user, pass, options, encoder);
};

/**
 * Set the certificate authority option for https request.
 *
 * @param {Buffer | Array} cert
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.ca = function(cert){
  this._ca = cert;
  return this;
};

/**
 * Set the client certificate key option for https request.
 *
 * @param {Buffer | String} cert
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.key = function(cert){
  this._key = cert;
  return this;
};

/**
 * Set the key, certificate, and CA certs of the client in PFX or PKCS12 format.
 *
 * @param {Buffer | String} cert
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.pfx = function(cert) {
  if (typeof cert === 'object' && !Buffer.isBuffer(cert)) {
    this._pfx = cert.pfx;
    this._passphrase = cert.passphrase;
  } else {
    this._pfx = cert;
  }
  return this;
};

/**
 * Set the client certificate option for https request.
 *
 * @param {Buffer | String} cert
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.cert = function(cert){
  this._cert = cert;
  return this;
};

/**
 * Return an http[s] request.
 *
 * @return {OutgoingMessage}
 * @api private
 */

Request.prototype.request = function(){
  if (this.req) return this.req;

  const options = {};

  try {
    const query = qs.stringify(this.qs, {
      indices: false,
      strictNullHandling: true,
    });
    if (query) {
      this.qs = {};
      this._query.push(query);
    }
    this._finalizeQueryString();
  } catch (e) {
    return this.emit('error', e);
  }

  let url = this.url;
  const retries = this._retries;

  // Capture backticks as-is from the final query string built above.
  // Note: this'll only find backticks entered in req.query(String)
  // calls, because qs.stringify unconditionally encodes backticks.
  let queryStringBackticks;
  if(url.indexOf('`') > -1) {
    const queryStartIndex = url.indexOf("?");

    if(queryStartIndex !== -1) {
      const queryString = url.substr(queryStartIndex + 1);
      queryStringBackticks = queryString.match(/`|\%60/g);
    }
  }

  // default to http://
  if (0 != url.indexOf('http')) url = `http://${url}`;
  url = parse(url);

  // See https://github.com/visionmedia/superagent/issues/1367
  if(queryStringBackticks) {
    let i = 0;
    url.query = url.query.replace(/\%60/g, () => queryStringBackticks[i++]);
    url.search = `?${url.query}`;
    url.path = url.pathname + url.search;
  }

  // support unix sockets
  if (/^https?\+unix:/.test(url.protocol) === true) {
    // get the protocol
    url.protocol = `${url.protocol.split('+')[0]}:`;

    // get the socket, path
    const unixParts = url.path.match(/^([^/]+)(.+)$/);
    options.socketPath = unixParts[1].replace(/%2F/g, '/');
    url.path = unixParts[2];
  }

  // options
  options.method = this.method;
  options.port = url.port;
  options.path = url.path;
  options.host = url.hostname;
  options.ca = this._ca;
  options.key = this._key;
  options.pfx = this._pfx;
  options.cert = this._cert;
  options.passphrase = this._passphrase;
  options.agent = this._agent;

  // Allows request.get('https://1.2.3.4/').set('Host', 'example.com')
  if (this._header['host']) {
    options.servername = this._header['host'].replace(/:[0-9]+$/,'');
  }

  // initiate request
  const mod = this._enableHttp2 ? exports.protocols['http2:'].setProtocol(url.protocol) : exports.protocols[url.protocol];

  // request
  const req = (this.req = mod.request(options));

  // set tcp no delay
  req.setNoDelay(true);

  if ('HEAD' != options.method) {
    req.setHeader('Accept-Encoding', 'gzip, deflate');
  }
  this.protocol = url.protocol;
  this.host = url.host;

  // expose events
  req.once('drain', () => { this.emit('drain'); });

  req.on('error', err => {
    // flag abortion here for out timeouts
    // because node will emit a faux-error "socket hang up"
    // when request is aborted before a connection is made
    if (this._aborted) return;
    // if not the same, we are in the **old** (cancelled) request,
    // so need to continue (same as for above)
    if (this._retries !== retries) return;
    // if we've received a response then we don't want to let
    // an error in the request blow up the response
    if (this.response) return;
    this.callback(err);
  });

  // auth
  if (url.auth) {
    const auth = url.auth.split(':');
    this.auth(auth[0], auth[1]);
  }
  if (this.username && this.password) {
    this.auth(this.username, this.password);
  }
  for (const key in this.header) {
    if (this.header.hasOwnProperty(key))
      req.setHeader(key, this.header[key]);
  }

  // add cookies
  if (this.cookies) {
    if(this._header.hasOwnProperty('cookie')) {
      // merge
      const tmpJar = new CookieJar.CookieJar();
      tmpJar.setCookies(this._header.cookie.split(';'));
      tmpJar.setCookies(this.cookies.split(';'));
      req.setHeader('Cookie',tmpJar.getCookies(CookieJar.CookieAccessInfo.All).toValueString());
    } else {
      req.setHeader('Cookie', this.cookies);
    }
  }

  return req;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  if (this._shouldRetry(err, res)) {
    return this._retry();
  }

  // Avoid the error which is emitted from 'socket hang up' to cause the fn undefined error on JS runtime.
  const fn = this._callback || noop;
  this.clearTimeout();
  if (this.called) return console.warn('superagent: double callback bug');
  this.called = true;

  if (!err) {
    try {
      if (!this._isResponseOK(res)) {
        let msg = 'Unsuccessful HTTP response';
        if (res) {
          msg = http.STATUS_CODES[res.status] || msg;
        }
        err = new Error(msg);
        err.status = res ? res.status : undefined;
      }
    } catch (new_err) {
      err = new_err;
    }
  }
  // It's important that the callback is called outside try/catch
  // to avoid double callback
  if (!err) {
    return fn(null, res);
  }

  err.response = res;
  if (this._maxRetries) err.retries = this._retries - 1;

  // only emit error event if there is a listener
  // otherwise we assume the callback to `.end()` will get the error
  if (err && this.listeners('error').length > 0) {
    this.emit('error', err);
  }

  fn(err, res);
};

/**
 * Check if `obj` is a host object,
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */
Request.prototype._isHost = function _isHost(obj) {
  return Buffer.isBuffer(obj) || obj instanceof Stream || obj instanceof FormData;
}

/**
 * Initiate request, invoking callback `fn(err, res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype._emitResponse = function(body, files) {
  const response = new Response(this);
  this.response = response;
  response.redirects = this._redirectList;
  if (undefined !== body) {
    response.body = body;
  }
  response.files = files;
  if (this._endCalled) {
    response.pipe = function() {
      throw Error("end() has already been called, so it's too late to start piping");
    }
  }
  this.emit('response', response);
  return response;
};

Request.prototype.end = function(fn) {
  this.request();
  debug('%s %s', this.method, this.url);

  if (this._endCalled) {
    throw Error(
      '.end() was called twice. This is not supported in superagent'
    );
  }
  this._endCalled = true;

  // store callback
  this._callback = fn || noop;

  this._end();
};

Request.prototype._end = function() {
  if (this._aborted) return this.callback(Error("The request has been aborted even before .end() was called"));

  let data = this._data;
  const req = this.req;
  const method = this.method;

  this._setTimeouts();

  // body
  if ('HEAD' != method && !req._headerSent) {
    // serialize stuff
    if ('string' != typeof data) {
      let contentType = req.getHeader('Content-Type');
      // Parse out just the content type from the header (ignore the charset)
      if (contentType) contentType = contentType.split(';')[0];
      let serialize = this._serializer || exports.serialize[contentType];
      if (!serialize && isJSON(contentType)) {
        serialize = exports.serialize['application/json'];
      }
      if (serialize) data = serialize(data);
    }

    // content-length
    if (data && !req.getHeader('Content-Length')) {
      req.setHeader('Content-Length', Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
    }
  }

  // response
  req.once('response', res => {
    debug('%s %s -> %s', this.method, this.url, res.statusCode);

    if (this._responseTimeoutTimer) {
      clearTimeout(this._responseTimeoutTimer);
    }

    if (this.piped) {
      return;
    }

    const max = this._maxRedirects;
    const mime = utils.type(res.headers['content-type'] || '') || 'text/plain';
    const type = mime.split('/')[0];
    const multipart = 'multipart' == type;
    const redirect = isRedirect(res.statusCode);
    const responseType = this._responseType;

    this.res = res;

    // redirect
    if (redirect && this._redirects++ != max) {
      return this._redirect(res);
    }

    if ('HEAD' == this.method) {
      this.emit('end');
      this.callback(null, this._emitResponse());
      return;
    }

    // zlib support
    if (this._shouldUnzip(res)) {
      unzip(req, res);
    }

    let buffer = this._buffer;
    if (buffer === undefined && mime in exports.buffer){
      buffer = !!exports.buffer[mime];
    }

    let parser = this._parser;
    if (undefined === buffer) {
      if (parser) {
        console.warn("A custom superagent parser has been set, but buffering strategy for the parser hasn't been configured. Call `req.buffer(true or false)` or set `superagent.buffer[mime] = true or false`");
        buffer = true;
      }
    }

    if (!parser) {
      if (responseType) {
        parser = exports.parse.image; // It's actually a generic Buffer
        buffer = true;
      } else if (multipart) {
        const form = new formidable.IncomingForm();
        parser = form.parse.bind(form);
        buffer = true;
      } else if (isImageOrVideo(mime)) {
        parser = exports.parse.image;
        buffer = true; // For backwards-compatibility buffering default is ad-hoc MIME-dependent
      } else if (exports.parse[mime]) {
        parser = exports.parse[mime];
      } else if ('text' == type) {
        parser = exports.parse.text;
        buffer = (buffer !== false);

        // everyone wants their own white-labeled json
      } else if (isJSON(mime)) {
        parser = exports.parse['application/json'];
        buffer = (buffer !== false);
      } else if (buffer) {
        parser = exports.parse.text;
      } else if (undefined === buffer) {
        parser = exports.parse.image; // It's actually a generic Buffer
        buffer = true;
      }
    }

    // by default only buffer text/*, json and messed up thing from hell
    if ((undefined === buffer && isText(mime)) || isJSON(mime)) {
      buffer = true;
    }

    this._resBuffered = buffer;
    let parserHandlesEnd = false;
    if (buffer) {
      // Protectiona against zip bombs and other nuisance
      let responseBytesLeft = this._maxResponseSize || 200000000;
      res.on('data', buf => {
        responseBytesLeft -= buf.byteLength || buf.length;
        if (responseBytesLeft < 0) {
          // This will propagate through error event
          const err = Error("Maximum response size reached");
          err.code = "ETOOLARGE";
          // Parsers aren't required to observe error event,
          // so would incorrectly report success
          parserHandlesEnd = false;
          // Will emit error event
          res.destroy(err);
        }
      });
    }

    if (parser) {
      try {
        // Unbuffered parsers are supposed to emit response early,
        // which is weird BTW, because response.body won't be there.
        parserHandlesEnd = buffer;

        parser(res, (err, obj, files) => {
          if (this.timedout) {
            // Timeout has already handled all callbacks
            return;
          }

          // Intentional (non-timeout) abort is supposed to preserve partial response,
          // even if it doesn't parse.
          if (err && !this._aborted) {
            return this.callback(err);
          }

          if (parserHandlesEnd) {
            this.emit('end');
            this.callback(null, this._emitResponse(obj, files));
          }
        });
      } catch (err) {
        this.callback(err);
        return;
      }
    }

    this.res = res;

    // unbuffered
    if (!buffer) {
      debug('unbuffered %s %s', this.method, this.url);
      this.callback(null, this._emitResponse());
      if (multipart) return; // allow multipart to handle end event
      res.once('end', () => {
        debug('end %s %s', this.method, this.url);
        this.emit('end');
      });
      return;
    }

    // terminating events
    res.once('error', err => {
      parserHandlesEnd = false;
      this.callback(err, null);
    });
    if (!parserHandlesEnd)
      res.once('end', () => {
        debug('end %s %s', this.method, this.url);
        // TODO: unless buffering emit earlier to stream
        this.emit('end');
        this.callback(null, this._emitResponse());
      });
  });

  this.emit('request', this);

  const getProgressMonitor = () => {
    const lengthComputable = true;
    const total = req.getHeader('Content-Length');
    let loaded = 0;

    const progress = new Stream.Transform();
    progress._transform = (chunk, encoding, cb) => {
      loaded += chunk.length;
      this.emit('progress', {
        direction: 'upload',
        lengthComputable,
        loaded,
        total,
      });
      cb(null, chunk);
    };
    return progress;
  };

  const bufferToChunks = (buffer) => {
    const chunkSize = 16 * 1024; // default highWaterMark value
    const chunking = new Stream.Readable();
    const totalLength = buffer.length;
    const remainder = totalLength % chunkSize;
    const cutoff = totalLength - remainder;

    for (let i = 0; i < cutoff; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);
      chunking.push(chunk);
    }

    if (remainder > 0) {
      const remainderBuffer = buffer.slice(-remainder);
      chunking.push(remainderBuffer);
    }

    chunking.push(null); // no more data

    return chunking;
  }

  // if a FormData instance got created, then we send that as the request body
  const formData = this._formData;
  if (formData) {

    // set headers
    const headers = formData.getHeaders();
    for (const i in headers) {
      debug('setting FormData header: "%s: %s"', i, headers[i]);
      req.setHeader(i, headers[i]);
    }

    // attempt to get "Content-Length" header
    formData.getLength((err, length) => {
      // TODO: Add chunked encoding when no length (if err)

      debug('got FormData Content-Length: %s', length);
      if ('number' == typeof length) {
        req.setHeader('Content-Length', length);
      }

      formData.pipe(getProgressMonitor()).pipe(req);
    });
  } else if (Buffer.isBuffer(data)) {
    bufferToChunks(data).pipe(getProgressMonitor()).pipe(req);
  } else {
    req.end(data);
  }
};

/**
 * Check whether response has a non-0-sized gzip-encoded body
 */
Request.prototype._shouldUnzip = res => {
  if (res.statusCode === 204 || res.statusCode === 304) {
    // These aren't supposed to have any body
    return false;
  }

  // header content is a string, and distinction between 0 and no information is crucial
  if ('0' === res.headers['content-length']) {
    // We know that the body is empty (unfortunately, this check does not cover chunked encoding)
    return false;
  }

  // console.log(res);
  return /^\s*(?:deflate|gzip)\s*$/.test(res.headers['content-encoding']);
};

// generate HTTP verb methods
if (methods.indexOf('del') == -1) {
  // create a copy so we don't cause conflicts with
  // other packages using the methods package and
  // npm 3.x
  methods = methods.slice(0);
  methods.push('del');
}
methods.forEach(method => {
  const name = method;
  method = 'del' == method ? 'delete' : method;

  method = method.toUpperCase();
  request[name] = (url, data, fn) => {
    const req = request(method, url);
    if ('function' == typeof data) (fn = data), (data = null);
    if (data) {
      if (method === 'GET' || method === 'HEAD') {
        req.query(data);
      } else {
        req.send(data);
      }
    }
    fn && req.end(fn);
    return req;
  };
});

/**
 * Check if `mime` is text and should be buffered.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api public
 */

function isText(mime) {
  const parts = mime.split('/');
  const type = parts[0];
  const subtype = parts[1];

  return 'text' == type || 'x-www-form-urlencoded' == subtype;
}

function isImageOrVideo(mime) {
  const type = mime.split('/')[0];

  return 'image' == type || 'video' == type;
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function isJSON(mime) {
  // should match /json or +json
  // but not /json-seq
  return /[\/+]json($|[^-\w])/.test(mime);
}

/**
 * Check if we should follow the redirect `code`.
 *
 * @param {Number} code
 * @return {Boolean}
 * @api private
 */

function isRedirect(code) {
  return ~[301, 302, 303, 305, 307, 308].indexOf(code);
}

}, function(modId) {var map = {"./response":1542288006499,"../utils":1542288006501,"./unzip":1542288006502,"../../package.json":1542288006503,"../request-base":1542288006504,"./http2wrapper":1542288006506,"./agent":1542288006507,"./parsers":1542288006509}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006499, function(require, module, exports) {
'use strict';

/**
 * Module dependencies.
 */

const util = require('util');
const Stream = require('stream');
const ResponseBase = require('../response-base');

/**
 * Expose `Response`.
 */

module.exports = Response;

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * @param {Request} req
 * @param {Object} options
 * @constructor
 * @extends {Stream}
 * @implements {ReadableStream}
 * @api private
 */

function Response(req) {
  Stream.call(this);
  const res = (this.res = req.res);
  this.request = req;
  this.req = req.req;
  this.text = res.text;
  this.body = res.body !== undefined ? res.body : {};
  this.files = res.files || {};
  this.buffered = req._resBuffered;
  this.header = this.headers = res.headers;
  this._setStatusProperties(res.statusCode);
  this._setHeaderProperties(this.header);
  this.setEncoding = res.setEncoding.bind(res);
  res.on('data', this.emit.bind(this, 'data'));
  res.on('end', this.emit.bind(this, 'end'));
  res.on('close', this.emit.bind(this, 'close'));
  res.on('error', this.emit.bind(this, 'error'));
}

/**
 * Inherit from `Stream`.
 */

util.inherits(Response, Stream);
ResponseBase(Response.prototype);

/**
 * Implements methods of a `ReadableStream`
 */

Response.prototype.destroy = function(err){
  this.res.destroy(err);
};

/**
 * Pause.
 */

Response.prototype.pause = function(){
  this.res.pause();
};

/**
 * Resume.
 */

Response.prototype.resume = function(){
  this.res.resume();
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function() {
  const req = this.req;
  const method = req.method;
  const path = req.path;

  const msg = `cannot ${method} ${path} (${this.status})`;
  const err = new Error(msg);
  err.status = this.status;
  err.text = this.text;
  err.method = method;
  err.path = path;

  return err;
};


Response.prototype.setStatusProperties = function(status){
  console.warn("In superagent 2.x setStatusProperties is a private method");
  return this._setStatusProperties(status);
};

/**
 * To json.
 *
 * @return {Object}
 * @api public
 */

Response.prototype.toJSON = function() {
  return {
    req: this.request.toJSON(),
    header: this.header,
    status: this.status,
    text: this.text,
  };
};

}, function(modId) { var map = {"../response-base":1542288006500}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006500, function(require, module, exports) {
'use strict';

/**
 * Module dependencies.
 */

const utils = require('./utils');

/**
 * Expose `ResponseBase`.
 */

module.exports = ResponseBase;

/**
 * Initialize a new `ResponseBase`.
 *
 * @api public
 */

function ResponseBase(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (const key in ResponseBase.prototype) {
    obj[key] = ResponseBase.prototype[key];
  }
  return obj;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

ResponseBase.prototype.get = function(field) {
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

ResponseBase.prototype._setHeaderProperties = function(header){
    // TODO: moar!
    // TODO: make this a util

    // content-type
    const ct = header['content-type'] || '';
    this.type = utils.type(ct);

    // params
    const params = utils.params(ct);
    for (const key in params) this[key] = params[key];

    this.links = {};

    // links
    try {
        if (header.link) {
            this.links = utils.parseLinks(header.link);
        }
    } catch (err) {
        // ignore
    }
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

ResponseBase.prototype._setStatusProperties = function(status){
    const type = status / 100 | 0;

    // status / class
    this.status = this.statusCode = status;
    this.statusType = type;

    // basics
    this.info = 1 == type;
    this.ok = 2 == type;
    this.redirect = 3 == type;
    this.clientError = 4 == type;
    this.serverError = 5 == type;
    this.error = (4 == type || 5 == type)
        ? this.toError()
        : false;

    // sugar
    this.created = 201 == status;
    this.accepted = 202 == status;
    this.noContent = 204 == status;
    this.badRequest = 400 == status;
    this.unauthorized = 401 == status;
    this.notAcceptable = 406 == status;
    this.forbidden = 403 == status;
    this.notFound = 404 == status;
    this.unprocessableEntity = 422 == status;
};

}, function(modId) { var map = {"./utils":1542288006501}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006501, function(require, module, exports) {
'use strict';

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

exports.type = str => str.split(/ *; */).shift();

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.params = str => str.split(/ *; */).reduce((obj, str) => {
  const parts = str.split(/ *= */);
  const key = parts.shift();
  const val = parts.shift();

  if (key && val) obj[key] = val;
  return obj;
}, {});

/**
 * Parse Link header fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.parseLinks = str => str.split(/ *, */).reduce((obj, str) => {
  const parts = str.split(/ *; */);
  const url = parts[0].slice(1, -1);
  const rel = parts[1].split(/ *= */)[1].slice(1, -1);
  obj[rel] = url;
  return obj;
}, {});

/**
 * Strip content related fields from `header`.
 *
 * @param {Object} header
 * @return {Object} header
 * @api private
 */

exports.cleanHeader = (header, changesOrigin) => {
  delete header['content-type'];
  delete header['content-length'];
  delete header['transfer-encoding'];
  delete header['host'];
  // secuirty
  if (changesOrigin) {
    delete header['authorization'];
    delete header['cookie'];
  }
  return header;
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006502, function(require, module, exports) {
'use strict';

/**
 * Module dependencies.
 */

const StringDecoder = require('string_decoder').StringDecoder;
const Stream = require('stream');
const zlib = require('zlib');

/**
 * Buffers response data events and re-emits when they're unzipped.
 *
 * @param {Request} req
 * @param {Response} res
 * @api private
 */

exports.unzip = (req, res) => {
  const unzip = zlib.createUnzip();
  const stream = new Stream();
  let decoder;

  // make node responseOnEnd() happy
  stream.req = req;

  unzip.on('error', err => {
    if (err && err.code === 'Z_BUF_ERROR') {
      // unexpected end of file is ignored by browsers and curl
      stream.emit('end');
      return;
    }
    stream.emit('error', err);
  });

  // pipe to unzip
  res.pipe(unzip);

  // override `setEncoding` to capture encoding
  res.setEncoding = type => {
    decoder = new StringDecoder(type);
  };

  // decode upon decompressing with captured encoding
  unzip.on('data', buf => {
    if (decoder) {
      const str = decoder.write(buf);
      if (str.length) stream.emit('data', str);
    } else {
      stream.emit('data', buf);
    }
  });

  unzip.on('end', () => {
    stream.emit('end');
  });

  // override `on` to capture data listeners
  const _on = res.on;
  res.on = function(type, fn) {
    if ('data' == type || 'end' == type) {
      stream.on(type, fn.bind(res));
    } else if ('error' == type) {
      stream.on(type, fn.bind(res));
      _on.call(res, type, fn);
    } else {
      _on.call(res, type, fn);
    }
    return this;
  };
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006503, function(require, module, exports) {
module.exports = {
  "_from": "superagent",
  "_id": "superagent@4.0.0-beta.5",
  "_inBundle": false,
  "_integrity": "sha512-v4FTm6kg6zJOfLcot9kCTcWy/wjD/hvtUXWcv0Pd8TlUqxKDctif2rtDPRb4gW6Df9MMXU1BHB+1z5U2VFVsYg==",
  "_location": "/superagent",
  "_phantomChildren": {},
  "_requested": {
    "type": "tag",
    "registry": true,
    "raw": "superagent",
    "name": "superagent",
    "escapedName": "superagent",
    "rawSpec": "",
    "saveSpec": null,
    "fetchSpec": "latest"
  },
  "_requiredBy": [
    "#USER",
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/superagent/-/superagent-4.0.0-beta.5.tgz",
  "_shasum": "441a89214113515e87d2f545fc8dd08aaa30cb29",
  "_spec": "superagent",
  "_where": "E:\\WeChatMiniApp\\ZDXH_News\\cloudfunctions\\getNewsList",
  "author": {
    "name": "TJ Holowaychuk",
    "email": "tj@vision-media.ca"
  },
  "browser": {
    "./lib/node/index.js": "./lib/client.js",
    "./test/support/server.js": "./test/support/blank.js"
  },
  "bugs": {
    "url": "https://github.com/visionmedia/superagent/issues"
  },
  "bundleDependencies": false,
  "component": {
    "scripts": {
      "superagent": "lib/client.js"
    }
  },
  "contributors": [
    {
      "name": "Kornel Lesiński",
      "email": "kornel@geekhood.net"
    },
    {
      "name": "Peter Lyons",
      "email": "pete@peterlyons.com"
    },
    {
      "name": "Hunter Loftis",
      "email": "hunter@hunterloftis.com"
    }
  ],
  "dependencies": {
    "component-emitter": "^1.2.0",
    "cookiejar": "^2.1.2",
    "debug": "^4.0.0",
    "form-data": "^2.3.2",
    "formidable": "^1.2.0",
    "methods": "^1.1.1",
    "mime": "^2.0.3",
    "qs": "^6.5.1",
    "readable-stream": "^3.0.3"
  },
  "deprecated": false,
  "description": "elegant & feature rich browser / node HTTP with a fluent API",
  "devDependencies": {
    "Base64": "^1.0.1",
    "babel-core": "^6.26.3",
    "babel-preset-es2015": "^6.24.1",
    "babelify": "^8.0.0",
    "basic-auth-connect": "^1.0.0",
    "body-parser": "^1.18.2",
    "browserify": "^16.2.0",
    "cookie-parser": "^1.4.3",
    "express": "^4.16.3",
    "express-session": "^1.15.6",
    "marked": "^0.5.0",
    "mocha": "^3.5.3",
    "multer": "^1.3.0",
    "should": "^13.2.0",
    "should-http": "^0.1.1",
    "zuul": "^3.12.0"
  },
  "engines": {
    "node": ">= 6.0"
  },
  "homepage": "https://github.com/visionmedia/superagent#readme",
  "keywords": [
    "http",
    "ajax",
    "request",
    "agent"
  ],
  "license": "MIT",
  "main": "./lib/node/index.js",
  "name": "superagent",
  "repository": {
    "type": "git",
    "url": "git://github.com/visionmedia/superagent.git"
  },
  "scripts": {
    "prepare": "make all",
    "test": "make test",
    "test-http2": "make test-node-http2"
  },
  "version": "4.0.0-beta.5"
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006504, function(require, module, exports) {
'use strict';

/**
 * Module of mixed-in functions shared between node and client code
 */
const isObject = require('./is-object');

/**
 * Expose `RequestBase`.
 */

module.exports = RequestBase;

/**
 * Initialize a new `RequestBase`.
 *
 * @api public
 */

function RequestBase(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (const key in RequestBase.prototype) {
    obj[key] = RequestBase.prototype[key];
  }
  return obj;
}

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.clearTimeout = function _clearTimeout(){
  clearTimeout(this._timer);
  clearTimeout(this._responseTimeoutTimer);
  delete this._timer;
  delete this._responseTimeoutTimer;
  return this;
};

/**
 * Override default response body parser
 *
 * This function will be called to convert incoming data into request.body
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.parse = function parse(fn){
  this._parser = fn;
  return this;
};

/**
 * Set format of binary response body.
 * In browser valid formats are 'blob' and 'arraybuffer',
 * which return Blob and ArrayBuffer, respectively.
 *
 * In Node all values result in Buffer.
 *
 * Examples:
 *
 *      req.get('/')
 *        .responseType('blob')
 *        .end(callback);
 *
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.responseType = function(val){
  this._responseType = val;
  return this;
};

/**
 * Override default request body serializer
 *
 * This function will be called to convert data set via .send or .attach into payload to send
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.serialize = function serialize(fn){
  this._serializer = fn;
  return this;
};

/**
 * Set timeouts.
 *
 * - response timeout is time between sending request and receiving the first byte of the response. Includes DNS and connection time.
 * - deadline is the time from start of the request to receiving response body in full. If the deadline is too short large files may not load at all on slow connections.
 *
 * Value of 0 or false means no timeout.
 *
 * @param {Number|Object} ms or {response, deadline}
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.timeout = function timeout(options){
  if (!options || 'object' !== typeof options) {
    this._timeout = options;
    this._responseTimeout = 0;
    return this;
  }

  for(const option in options) {
    switch(option) {
      case 'deadline':
        this._timeout = options.deadline;
        break;
      case 'response':
        this._responseTimeout = options.response;
        break;
      default:
        console.warn("Unknown timeout option", option);
    }
  }
  return this;
};

/**
 * Set number of retry attempts on error.
 *
 * Failed requests will be retried 'count' times if timeout or err.code >= 500.
 *
 * @param {Number} count
 * @param {Function} [fn]
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.retry = function retry(count, fn){
  // Default to 1 if no count passed or true
  if (arguments.length === 0 || count === true) count = 1;
  if (count <= 0) count = 0;
  this._maxRetries = count;
  this._retries = 0;
  this._retryCallback = fn;
  return this;
};

const ERROR_CODES = [
  'ECONNRESET',
  'ETIMEDOUT',
  'EADDRINFO',
  'ESOCKETTIMEDOUT'
];

/**
 * Determine if a request should be retried.
 * (Borrowed from segmentio/superagent-retry)
 *
 * @param {Error} err
 * @param {Response} [res]
 * @returns {Boolean}
 */
RequestBase.prototype._shouldRetry = function(err, res) {
  if (!this._maxRetries || this._retries++ >= this._maxRetries) {
    return false;
  }
  if (this._retryCallback) {
    try {
      const override = this._retryCallback(err, res);
      if (override === true) return true;
      if (override === false) return false;
      // undefined falls back to defaults
    } catch(e) {
      console.error(e);
    }
  }
  if (res && res.status && res.status >= 500 && res.status != 501) return true;
  if (err) {
    if (err.code && ~ERROR_CODES.indexOf(err.code)) return true;
    // Superagent timeout
    if (err.timeout && err.code == 'ECONNABORTED') return true;
    if (err.crossDomain) return true;
  }
  return false;
};

/**
 * Retry request
 *
 * @return {Request} for chaining
 * @api private
 */

RequestBase.prototype._retry = function() {

  this.clearTimeout();

  // node
  if (this.req) {
    this.req = null;
    this.req = this.request();
  }

  this._aborted = false;
  this.timedout = false;

  return this._end();
};

/**
 * Promise support
 *
 * @param {Function} resolve
 * @param {Function} [reject]
 * @return {Request}
 */

RequestBase.prototype.then = function then(resolve, reject) {
  if (!this._fullfilledPromise) {
    const self = this;
    if (this._endCalled) {
      console.warn("Warning: superagent request was sent twice, because both .end() and .then() were called. Never call .end() if you use promises");
    }
    this._fullfilledPromise = new Promise((innerResolve, innerReject) => {
      self.on('error', innerReject);
      self.end((err, res) => {
        if (err) innerReject(err);
        else innerResolve(res);
      });
    });
  }
  return this._fullfilledPromise.then(resolve, reject);
};

RequestBase.prototype['catch'] = function(cb) {
  return this.then(undefined, cb);
};

/**
 * Allow for extension
 */

RequestBase.prototype.use = function use(fn) {
  fn(this);
  return this;
};

RequestBase.prototype.ok = function(cb) {
  if ('function' !== typeof cb) throw Error("Callback required");
  this._okCallback = cb;
  return this;
};

RequestBase.prototype._isResponseOK = function(res) {
  if (!res) {
    return false;
  }

  if (this._okCallback) {
    return this._okCallback(res);
  }

  return res.status >= 200 && res.status < 300;
};

/**
 * Get request header `field`.
 * Case-insensitive.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

RequestBase.prototype.get = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Get case-insensitive header `field` value.
 * This is a deprecated internal API. Use `.get(field)` instead.
 *
 * (getHeader is no longer used internally by the superagent code base)
 *
 * @param {String} field
 * @return {String}
 * @api private
 * @deprecated
 */

RequestBase.prototype.getHeader = RequestBase.prototype.get;

/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.set = function(field, val){
  if (isObject(field)) {
    for (const key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 */
RequestBase.prototype.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Write the field `name` and `val`, or multiple fields with one object
 * for "multipart/form-data" request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 *
 * request.post('/upload')
 *   .field({ foo: 'bar', baz: 'qux' })
 *   .end(callback);
 * ```
 *
 * @param {String|Object} name
 * @param {String|Blob|File|Buffer|fs.ReadStream} val
 * @return {Request} for chaining
 * @api public
 */
RequestBase.prototype.field = function(name, val) {
  // name should be either a string or an object.
  if (null === name || undefined === name) {
    throw new Error('.field(name, val) name can not be empty');
  }

  if (this._data) {
    throw new Error(".field() can't be used if .send() is used. Please use only .send() or only .field() & .attach()");
  }

  if (isObject(name)) {
    for (const key in name) {
      this.field(key, name[key]);
    }
    return this;
  }

  if (Array.isArray(val)) {
    for (const i in val) {
      this.field(name, val[i]);
    }
    return this;
  }

  // val should be defined now
  if (null === val || undefined === val) {
    throw new Error('.field(name, val) val can not be empty');
  }
  if ('boolean' === typeof val) {
    val = '' + val;
  }
  this._getFormData().append(name, val);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */
RequestBase.prototype.abort = function(){
  if (this._aborted) {
    return this;
  }
  this._aborted = true;
  this.xhr && this.xhr.abort(); // browser
  this.req && this.req.abort(); // node
  this.clearTimeout();
  this.emit('abort');
  return this;
};

RequestBase.prototype._auth = function(user, pass, options, base64Encoder) {
  switch (options.type) {
    case 'basic':
      this.set('Authorization', `Basic ${base64Encoder(`${user}:${pass}`)}`);
      break;

    case 'auto':
      this.username = user;
      this.password = pass;
      break;

    case 'bearer': // usage would be .auth(accessToken, { type: 'bearer' })
      this.set('Authorization', `Bearer ${user}`);
      break;
  }
  return this;
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

RequestBase.prototype.withCredentials = function(on) {
  // This is browser-only functionality. Node side is no-op.
  if (on == undefined) on = true;
  this._withCredentials = on;
  return this;
};

/**
 * Set the max redirects to `n`. Does noting in browser XHR implementation.
 *
 * @param {Number} n
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.redirects = function(n){
  this._maxRedirects = n;
  return this;
};

/**
 * Maximum size of buffered response body, in bytes. Counts uncompressed size.
 * Default 200MB.
 *
 * @param {Number} n
 * @return {Request} for chaining
 */
RequestBase.prototype.maxResponseSize = function(n){
  if ('number' !== typeof n) {
    throw TypeError("Invalid argument");
  }
  this._maxResponseSize = n;
  return this;
};

/**
 * Convert to a plain javascript object (not JSON string) of scalar properties.
 * Note as this method is designed to return a useful non-this value,
 * it cannot be chained.
 *
 * @return {Object} describing method, url, and data of this request
 * @api public
 */

RequestBase.prototype.toJSON = function() {
  return {
    method: this.method,
    url: this.url,
    data: this._data,
    headers: this._header,
  };
};

/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
 *      request.post('/user')
 *        .send('name=tobi')
 *        .send('species=ferret')
 *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.send = function(data){
  const isObj = isObject(data);
  let type = this._header['content-type'];

  if (this._formData) {
    throw new Error(".send() can't be used if .attach() or .field() is used. Please use only .send() or only .field() & .attach()");
  }

  if (isObj && !this._data) {
    if (Array.isArray(data)) {
      this._data = [];
    } else if (!this._isHost(data)) {
      this._data = {};
    }
  } else if (data && this._data && this._isHost(this._data)) {
    throw Error("Can't merge these send calls");
  }

  // merge
  if (isObj && isObject(this._data)) {
    for (const key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    // default to x-www-form-urlencoded
    if (!type) this.type('form');
    type = this._header['content-type'];
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? `${this._data}&${data}`
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!isObj || this._isHost(data)) {
    return this;
  }

  // default to json
  if (!type) this.type('json');
  return this;
};

/**
 * Sort `querystring` by the sort function
 *
 *
 * Examples:
 *
 *       // default order
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery()
 *         .end(callback)
 *
 *       // customized sort function
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery(function(a, b){
 *           return a.length - b.length;
 *         })
 *         .end(callback)
 *
 *
 * @param {Function} sort
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.sortQuery = function(sort) {
  // _sort default to true but otherwise can be a function or boolean
  this._sort = typeof sort === 'undefined' ? true : sort;
  return this;
};

/**
 * Compose querystring to append to req.url
 *
 * @api private
 */
RequestBase.prototype._finalizeQueryString = function(){
  const query = this._query.join('&');
  if (query) {
    this.url += (this.url.indexOf('?') >= 0 ? '&' : '?') + query;
  }
  this._query.length = 0; // Makes the call idempotent

  if (this._sort) {
    const index = this.url.indexOf('?');
    if (index >= 0) {
      const queryArr = this.url.substring(index + 1).split('&');
      if ('function' === typeof this._sort) {
        queryArr.sort(this._sort);
      } else {
        queryArr.sort();
      }
      this.url = this.url.substring(0, index) + '?' + queryArr.join('&');
    }
  }
};

// For backwards compat only
RequestBase.prototype._appendQueryString = () => {console.trace("Unsupported");}

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

RequestBase.prototype._timeoutError = function(reason, timeout, errno){
  if (this._aborted) {
    return;
  }
  const err = new Error(`${reason + timeout}ms exceeded`);
  err.timeout = timeout;
  err.code = 'ECONNABORTED';
  err.errno = errno;
  this.timedout = true;
  this.abort();
  this.callback(err);
};

RequestBase.prototype._setTimeouts = function() {
  const self = this;

  // deadline
  if (this._timeout && !this._timer) {
    this._timer = setTimeout(() => {
      self._timeoutError('Timeout of ', self._timeout, 'ETIME');
    }, this._timeout);
  }
  // response timeout
  if (this._responseTimeout && !this._responseTimeoutTimer) {
    this._responseTimeoutTimer = setTimeout(() => {
      self._timeoutError('Response timeout of ', self._responseTimeout, 'ETIMEDOUT');
    }, this._responseTimeout);
  }
};

}, function(modId) { var map = {"./is-object":1542288006505}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006505, function(require, module, exports) {
'use strict';

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return null !== obj && 'object' === typeof obj;
}

module.exports = isObject;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006506, function(require, module, exports) {
'use strict';

const http2 = require('http2');
const Stream = require('stream');
const util = require('util');
const net = require('net');
const tls = require('tls');
const parse = require('url').parse;

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_AUTHORITY,
  HTTP2_HEADER_HOST,
  HTTP2_HEADER_SET_COOKIE,
  NGHTTP2_CANCEL,
} = http2.constants;


function setProtocol(protocol) {
  return {
    request: function (options) {
      return new Request(protocol, options);
    }
  }
}

function Request(protocol, options) {
  Stream.call(this);
  const defaultPort = protocol === 'https:' ? 443 : 80;
  const defaultHost = 'localhost'
  const port = options.port || defaultPort;
  const host = options.host || defaultHost;

  delete options.port
  delete options.host

  this.method = options.method;
  this.path = options.path;
  this.protocol = protocol;
  this.host = host;

  delete options.method
  delete options.path

  const sessionOptions = Object.assign({}, options);
  if (options.socketPath) {
    sessionOptions.socketPath = options.socketPath;
    sessionOptions.createConnection = this.createUnixConnection.bind(this);
  }

  this._headers = {};

  const session = http2.connect(`${protocol}//${host}:${port}`, sessionOptions);
  this.setHeader('host', `${host}:${port}`)

  session.on('error', (err) => this.emit('error', err));

  this.session = session;
}

/**
 * Inherit from `Stream` (which inherits from `EventEmitter`).
 */
util.inherits(Request, Stream);

Request.prototype.createUnixConnection = function (authority, options) {
  switch (this.protocol) {
    case 'http:':
      return net.connect(options.socketPath);
    case 'https:':
      options.ALPNProtocols = ['h2'];
      options.servername = this.host;
      options.allowHalfOpen = true;
      return tls.connect(options.socketPath, options);
    default:
      throw new Error('Unsupported protocol', this.protocol);
  }
}

Request.prototype.setNoDelay = function (bool) {
  // We can not use setNoDelay with HTTP/2.
  // Node 10 limits http2session.socket methods to ones safe to use with HTTP/2.
  // See also https://nodejs.org/api/http2.html#http2_http2session_socket
}

Request.prototype.getFrame = function () {
  if (this.frame) {
    return this.frame;
  }

  const method = {
    [HTTP2_HEADER_PATH]: this.path,
    [HTTP2_HEADER_METHOD]: this.method,
  }

  let headers = this.mapToHttp2Header(this._headers);

  headers = Object.assign(headers, method);

  const frame = this.session.request(headers);
  frame.once('response', (headers, flags) => {
    headers = this.mapToHttpHeader(headers);
    frame.headers = headers;
    frame.status = frame.statusCode = headers[HTTP2_HEADER_STATUS];
    this.emit('response', frame);
  });

  this._headerSent = true;

  frame.once('drain', () => this.emit('drain'));
  frame.on('error', (err) => this.emit('error', err));
  frame.on('close', () => this.session.close());

  this.frame = frame;
  return frame;
}

Request.prototype.mapToHttpHeader = function (headers) {
  const keys = Object.keys(headers);
  const http2Headers = {};
  for (var i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = headers[key];
    key = key.toLowerCase();
    switch (key) {
      case HTTP2_HEADER_SET_COOKIE:
        value = Array.isArray(value) ? value : [value];
        break;
      default:
        break;
    }
    http2Headers[key] = value;
  }
  return http2Headers;
}

Request.prototype.mapToHttp2Header = function (headers) {
  const keys = Object.keys(headers);
  const http2Headers = {};
  for (var i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = headers[key];
    key = key.toLowerCase();
    switch (key) {
      case HTTP2_HEADER_HOST:
        key = HTTP2_HEADER_AUTHORITY;
        value = /^http\:\/\/|^https\:\/\//.test(value) ? parse(value).host : value;
        break;
      default:
        break;
    }
    http2Headers[key] = value;
  }
  return http2Headers;
}

Request.prototype.setHeader = function (name, value) {
  this._headers[name.toLowerCase()] = value;
}

Request.prototype.getHeader = function (name) {
  return this._headers[name.toLowerCase()];
}

Request.prototype.write = function (data, encoding) {
  const frame = this.getFrame();
  return frame.write(data, encoding);
};

Request.prototype.pipe = function (stream, options) {
  const frame = this.getFrame();
  return frame.pipe(stream, options);
}

Request.prototype.end = function (data) {
  const frame = this.getFrame();
  frame.end(data);
}

Request.prototype.abort = function (data) {
  const frame = this.getFrame();
  frame.close(NGHTTP2_CANCEL);
  this.session.destroy();
}

exports.setProtocol = setProtocol;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006507, function(require, module, exports) {
'use strict';

/**
 * Module dependencies.
 */

const CookieJar = require('cookiejar').CookieJar;
const CookieAccess = require('cookiejar').CookieAccessInfo;
const parse = require('url').parse;
const request = require('../..');
const AgentBase = require('../agent-base');
let methods = require('methods');

/**
 * Expose `Agent`.
 */

module.exports = Agent;

/**
 * Initialize a new `Agent`.
 *
 * @api public
 */

function Agent(options) {
  if (!(this instanceof Agent)) {
    return new Agent(options);
  }
  AgentBase.call(this);
  this.jar = new CookieJar();

  if (options) {
    if (options.ca) {this.ca(options.ca);}
    if (options.key) {this.key(options.key);}
    if (options.pfx) {this.pfx(options.pfx);}
    if (options.cert) {this.cert(options.cert);}
  }
}

Agent.prototype = Object.create(AgentBase.prototype);

/**
 * Save the cookies in the given `res` to
 * the agent's cookie jar for persistence.
 *
 * @param {Response} res
 * @api private
 */

Agent.prototype._saveCookies = function(res) {
  const cookies = res.headers['set-cookie'];
  if (cookies) this.jar.setCookies(cookies);
};

/**
 * Attach cookies when available to the given `req`.
 *
 * @param {Request} req
 * @api private
 */

Agent.prototype._attachCookies = function(req) {
  const url = parse(req.url);
  const access = CookieAccess(
    url.hostname,
    url.pathname,
    'https:' == url.protocol
  );
  const cookies = this.jar.getCookies(access).toValueString();
  req.cookies = cookies;
};

methods.forEach(name => {
  const method = name.toUpperCase();
  Agent.prototype[name] = function(url, fn) {
    const req = new request.Request(method, url);

    req.on('response', this._saveCookies.bind(this));
    req.on('redirect', this._saveCookies.bind(this));
    req.on('redirect', this._attachCookies.bind(this, req));
    this._attachCookies(req);
    this._setDefaults(req);

    if (fn) {
      req.end(fn);
    }
    return req;
  };
});

Agent.prototype.del = Agent.prototype['delete'];

}, function(modId) { var map = {"../agent-base":1542288006508}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006508, function(require, module, exports) {
function Agent() {
  this._defaults = [];
}

["use", "on", "once", "set", "query", "type", "accept", "auth", "withCredentials", "sortQuery", "retry", "ok", "redirects",
 "timeout", "buffer", "serialize", "parse", "ca", "key", "pfx", "cert"].forEach(fn => {
  /** Default setting for all requests from this agent */
  Agent.prototype[fn] = function(...args) {
    this._defaults.push({fn, args});
    return this;
  }
});

Agent.prototype._setDefaults = function(req) {
    this._defaults.forEach(def => {
      req[def.fn].apply(req, def.args);
    });
};

module.exports = Agent;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006509, function(require, module, exports) {
'use strict';

exports['application/x-www-form-urlencoded'] = require('./urlencoded');
exports['application/json'] = require('./json');
exports.text = require('./text');

const binary = require('./image');
exports['application/octet-stream'] = binary;
exports['application/pdf'] = binary;
exports.image = binary;

}, function(modId) { var map = {"./urlencoded":1542288006510,"./json":1542288006511,"./text":1542288006512,"./image":1542288006513}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006510, function(require, module, exports) {
'use strict';

/**
 * Module dependencies.
 */

const qs = require('qs');

module.exports = (res, fn) => {
  res.text = '';
  res.setEncoding('ascii');
  res.on('data', chunk => {
    res.text += chunk;
  });
  res.on('end', () => {
    try {
      fn(null, qs.parse(res.text));
    } catch (err) {
      fn(err);
    }
  });
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006511, function(require, module, exports) {
'use strict';

module.exports = function parseJSON(res, fn){
  res.text = '';
  res.setEncoding('utf8');
  res.on('data', chunk => {
    res.text += chunk;
  });
  res.on('end', () => {
    try {
      var body = res.text && JSON.parse(res.text);
    } catch (e) {
      var err = e;
      // issue #675: return the raw response if the response parsing fails
      err.rawResponse = res.text || null;
      // issue #876: return the http status code if the response parsing fails
      err.statusCode = res.statusCode;
    } finally {
      fn(err, body);
    }
  });
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006512, function(require, module, exports) {
'use strict';

module.exports = (res, fn) => {
  res.text = '';
  res.setEncoding('utf8');
  res.on('data', chunk => {
    res.text += chunk;
  });
  res.on('end', fn);
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1542288006513, function(require, module, exports) {
'use strict';

module.exports = (res, fn) => {
  const data = []; // Binary data needs binary storage

  res.on('data', chunk => {
    data.push(chunk);
  });
  res.on('end', () => {
    fn(null, Buffer.concat(data));
  });
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1542288006498);
})()
//# sourceMappingURL=index.js.map
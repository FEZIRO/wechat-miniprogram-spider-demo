module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1542288006497, function(require, module, exports) {
'use strict'

/**
 * Module dependencies
 */

const iconv = require('iconv-lite')

/**
 * util
 */

const checkEncoding = enc => {
  // check iconv supported encoding
  if (enc && !iconv.encodingExists(enc)) {
    return new Error('encoding not supported by iconv-lite')
  }
}

/**
 * install the charset()
 */

module.exports = function install(superagent) {
  const Request = superagent.Request

  /**
   * add `charset` to request
   *
   * @param {String} enc : the encoding
   */

  Request.prototype.charset = function(enc) {
    if (enc) {
      let err = checkEncoding(enc)
      if (err) throw err
    }

    // set the parser
    this._parser = function(res, cb) { // res not instanceof http.IncomingMessage
      const chunks = []

      res.on('data', function(chunk) {
        chunks.push(chunk)
      })

      res.on('end', function() {
        let text, err
        const buf = Buffer.concat(chunks)

        // detect if encoding if not specified
        if (!enc) {
          if (res.headers['content-type']) {
            // Extracted from headers
            enc = (res.headers['content-type'].match(/charset=(.+)/) || []).pop()
          }

          if (!enc) {
            // Extracted from <meta charset="gb2312"> or <meta http-equiv=Content-Type content="text/html;charset=gb2312">
            enc = (buf.toString().match(/<meta.+?charset=['"]?([^"']+)/i) || []).pop()
          }

          // check
          err = checkEncoding(enc)
          if (err) return cb(err)

          if (!enc) {
            // Default utf8
            enc = 'utf-8'
          }
        }

        try {
          text = iconv.decode(buf, enc)
        } catch (e) {
          /* istanbul ignore next */
          err = e
        } finally {
          res.text = text
          cb(err)
        }
      })
    }

    return this
  }

  return superagent
}
}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1542288006497);
})()
//# sourceMappingURL=index.js.map
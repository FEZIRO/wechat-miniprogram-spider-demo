module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1543419325240, function(require, module, exports) {
"use strict";

module.exports = CSSselect;

var Pseudos       = require("./lib/pseudos.js"),
    DomUtils      = require("domutils"),
    findOne       = DomUtils.findOne,
    findAll       = DomUtils.findAll,
    getChildren   = DomUtils.getChildren,
    removeSubsets = DomUtils.removeSubsets,
    falseFunc     = require("boolbase").falseFunc,
    compile       = require("./lib/compile.js"),
    compileUnsafe = compile.compileUnsafe,
    compileToken  = compile.compileToken;

function getSelectorFunc(searchFunc){
	return function select(query, elems, options){
        if(typeof query !== "function") query = compileUnsafe(query, options, elems);
        if(!Array.isArray(elems)) elems = getChildren(elems);
		else elems = removeSubsets(elems);
		return searchFunc(query, elems);
	};
}

var selectAll = getSelectorFunc(function selectAll(query, elems){
	return (query === falseFunc || !elems || elems.length === 0) ? [] : findAll(query, elems);
});

var selectOne = getSelectorFunc(function selectOne(query, elems){
	return (query === falseFunc || !elems || elems.length === 0) ? null : findOne(query, elems);
});

function is(elem, query, options){
	return (typeof query === "function" ? query : compile(query, options))(elem);
}

/*
	the exported interface
*/
function CSSselect(query, elems, options){
	return selectAll(query, elems, options);
}

CSSselect.compile = compile;
CSSselect.filters = Pseudos.filters;
CSSselect.pseudos = Pseudos.pseudos;

CSSselect.selectAll = selectAll;
CSSselect.selectOne = selectOne;

CSSselect.is = is;

//legacy methods (might be removed)
CSSselect.parse = compile;
CSSselect.iterate = selectAll;

//hooks
CSSselect._compileUnsafe = compileUnsafe;
CSSselect._compileToken = compileToken;

}, function(modId) {var map = {"./lib/pseudos.js":1543419325241,"./lib/compile.js":1543419325243}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1543419325241, function(require, module, exports) {
/*
	pseudo selectors

	---

	they are available in two forms:
	* filters called when the selector
	  is compiled and return a function
	  that needs to return next()
	* pseudos get called on execution
	  they need to return a boolean
*/

var DomUtils    = require("domutils"),
    isTag       = DomUtils.isTag,
    getText     = DomUtils.getText,
    getParent   = DomUtils.getParent,
    getChildren = DomUtils.getChildren,
    getSiblings = DomUtils.getSiblings,
    hasAttrib   = DomUtils.hasAttrib,
    getName     = DomUtils.getName,
    getAttribute= DomUtils.getAttributeValue,
    getNCheck   = require("nth-check"),
    checkAttrib = require("./attributes.js").rules.equals,
    BaseFuncs   = require("boolbase"),
    trueFunc    = BaseFuncs.trueFunc,
    falseFunc   = BaseFuncs.falseFunc;

//helper methods
function getFirstElement(elems){
	for(var i = 0; elems && i < elems.length; i++){
		if(isTag(elems[i])) return elems[i];
	}
}

function getAttribFunc(name, value){
	var data = {name: name, value: value};
	return function attribFunc(next){
		return checkAttrib(next, data);
	};
}

function getChildFunc(next){
	return function(elem){
		return !!getParent(elem) && next(elem);
	};
}

var filters = {
	contains: function(next, text){
		return function contains(elem){
			return next(elem) && getText(elem).indexOf(text) >= 0;
		};
	},
	icontains: function(next, text){
		var itext = text.toLowerCase();
		return function icontains(elem){
			return next(elem) &&
				getText(elem).toLowerCase().indexOf(itext) >= 0;
		};
	},

	//location specific methods
	"nth-child": function(next, rule){
		var func = getNCheck(rule);

		if(func === falseFunc) return func;
		if(func === trueFunc)  return getChildFunc(next);

		return function nthChild(elem){
			var siblings = getSiblings(elem);

			for(var i = 0, pos = 0; i < siblings.length; i++){
				if(isTag(siblings[i])){
					if(siblings[i] === elem) break;
					else pos++;
				}
			}

			return func(pos) && next(elem);
		};
	},
	"nth-last-child": function(next, rule){
		var func = getNCheck(rule);

		if(func === falseFunc) return func;
		if(func === trueFunc)  return getChildFunc(next);

		return function nthLastChild(elem){
			var siblings = getSiblings(elem);

			for(var pos = 0, i = siblings.length - 1; i >= 0; i--){
				if(isTag(siblings[i])){
					if(siblings[i] === elem) break;
					else pos++;
				}
			}

			return func(pos) && next(elem);
		};
	},
	"nth-of-type": function(next, rule){
		var func = getNCheck(rule);

		if(func === falseFunc) return func;
		if(func === trueFunc)  return getChildFunc(next);

		return function nthOfType(elem){
			var siblings = getSiblings(elem);

			for(var pos = 0, i = 0; i < siblings.length; i++){
				if(isTag(siblings[i])){
					if(siblings[i] === elem) break;
					if(getName(siblings[i]) === getName(elem)) pos++;
				}
			}

			return func(pos) && next(elem);
		};
	},
	"nth-last-of-type": function(next, rule){
		var func = getNCheck(rule);

		if(func === falseFunc) return func;
		if(func === trueFunc)  return getChildFunc(next);

		return function nthLastOfType(elem){
			var siblings = getSiblings(elem);

			for(var pos = 0, i = siblings.length - 1; i >= 0; i--){
				if(isTag(siblings[i])){
					if(siblings[i] === elem) break;
					if(getName(siblings[i]) === getName(elem)) pos++;
				}
			}

			return func(pos) && next(elem);
		};
	},

    //TODO determine the actual root element
    root: function(next){
        return function(elem){
            return !getParent(elem) && next(elem);
        };
    },

    scope: function(next, rule, options, context){
        if(!context || context.length === 0){
            //equivalent to :root
            return filters.root(next);
        }

        if(context.length === 1){
            //NOTE: can't be unpacked, as :has uses this for side-effects
            return function(elem){
                return context[0] === elem && next(elem);
            };
        }

        return function(elem){
            return context.indexOf(elem) >= 0 && next(elem);
        };
    },

	//jQuery extensions (others follow as pseudos)
	checkbox: getAttribFunc("type", "checkbox"),
	file: getAttribFunc("type", "file"),
	password: getAttribFunc("type", "password"),
	radio: getAttribFunc("type", "radio"),
	reset: getAttribFunc("type", "reset"),
	image: getAttribFunc("type", "image"),
	submit: getAttribFunc("type", "submit")
};

//while filters are precompiled, pseudos get called when they are needed
var pseudos = {
	empty: function(elem){
		return !getChildren(elem).some(function(elem){
			return isTag(elem) || elem.type === "text";
		});
	},

	"first-child": function(elem){
		return getFirstElement(getSiblings(elem)) === elem;
	},
	"last-child": function(elem){
		var siblings = getSiblings(elem);

		for(var i = siblings.length - 1; i >= 0; i--){
			if(siblings[i] === elem) return true;
			if(isTag(siblings[i])) break;
		}

		return false;
	},
	"first-of-type": function(elem){
		var siblings = getSiblings(elem);

		for(var i = 0; i < siblings.length; i++){
			if(isTag(siblings[i])){
				if(siblings[i] === elem) return true;
				if(getName(siblings[i]) === getName(elem)) break;
			}
		}

		return false;
	},
	"last-of-type": function(elem){
		var siblings = getSiblings(elem);

		for(var i = siblings.length-1; i >= 0; i--){
			if(isTag(siblings[i])){
				if(siblings[i] === elem) return true;
				if(getName(siblings[i]) === getName(elem)) break;
			}
		}

		return false;
	},
	"only-of-type": function(elem){
		var siblings = getSiblings(elem);

		for(var i = 0, j = siblings.length; i < j; i++){
			if(isTag(siblings[i])){
				if(siblings[i] === elem) continue;
				if(getName(siblings[i]) === getName(elem)) return false;
			}
		}

		return true;
	},
	"only-child": function(elem){
		var siblings = getSiblings(elem);

		for(var i = 0; i < siblings.length; i++){
			if(isTag(siblings[i]) && siblings[i] !== elem) return false;
		}

		return true;
	},

	//:matches(a, area, link)[href]
	link: function(elem){
		return hasAttrib(elem, "href");
	},
	visited: falseFunc, //seems to be a valid implementation
	//TODO: :any-link once the name is finalized (as an alias of :link)

	//forms
	//to consider: :target

	//:matches([selected], select:not([multiple]):not(> option[selected]) > option:first-of-type)
	selected: function(elem){
		if(hasAttrib(elem, "selected")) return true;
		else if(getName(elem) !== "option") return false;

		//the first <option> in a <select> is also selected
		var parent = getParent(elem);

		if(
			!parent ||
			getName(parent) !== "select" ||
			hasAttrib(parent, "multiple")
		) return false;

		var siblings = getChildren(parent),
			sawElem  = false;

		for(var i = 0; i < siblings.length; i++){
			if(isTag(siblings[i])){
				if(siblings[i] === elem){
					sawElem = true;
				} else if(!sawElem){
					return false;
				} else if(hasAttrib(siblings[i], "selected")){
					return false;
				}
			}
		}

		return sawElem;
	},
	//https://html.spec.whatwg.org/multipage/scripting.html#disabled-elements
	//:matches(
	//  :matches(button, input, select, textarea, menuitem, optgroup, option)[disabled],
	//  optgroup[disabled] > option),
	// fieldset[disabled] * //TODO not child of first <legend>
	//)
	disabled: function(elem){
		return hasAttrib(elem, "disabled");
	},
	enabled: function(elem){
		return !hasAttrib(elem, "disabled");
	},
	//:matches(:matches(:radio, :checkbox)[checked], :selected) (TODO menuitem)
	checked: function(elem){
		return hasAttrib(elem, "checked") || pseudos.selected(elem);
	},
	//:matches(input, select, textarea)[required]
	required: function(elem){
		return hasAttrib(elem, "required");
	},
	//:matches(input, select, textarea):not([required])
	optional: function(elem){
		return !hasAttrib(elem, "required");
	},

	//jQuery extensions

	//:not(:empty)
	parent: function(elem){
		return !pseudos.empty(elem);
	},
	//:matches(h1, h2, h3, h4, h5, h6)
	header: function(elem){
		var name = getName(elem);
		return name === "h1" ||
		       name === "h2" ||
		       name === "h3" ||
		       name === "h4" ||
		       name === "h5" ||
		       name === "h6";
	},

	//:matches(button, input[type=button])
	button: function(elem){
		var name = getName(elem);
		return name === "button" ||
		       name === "input" &&
		       getAttribute(elem, "type") === "button";
	},
	//:matches(input, textarea, select, button)
	input: function(elem){
		var name = getName(elem);
		return name === "input" ||
		       name === "textarea" ||
		       name === "select" ||
		       name === "button";
	},
	//input:matches(:not([type!='']), [type='text' i])
	text: function(elem){
		var attr;
		return getName(elem) === "input" && (
			!(attr = getAttribute(elem, "type")) ||
			attr.toLowerCase() === "text"
		);
	}
};

function verifyArgs(func, name, subselect){
	if(subselect === null){
		if(func.length > 1 && name !== "scope"){
			throw new SyntaxError("pseudo-selector :" + name + " requires an argument");
		}
	} else {
		if(func.length === 1){
			throw new SyntaxError("pseudo-selector :" + name + " doesn't have any arguments");
		}
	}
}

//FIXME this feels hacky
var re_CSS3 = /^(?:(?:nth|last|first|only)-(?:child|of-type)|root|empty|(?:en|dis)abled|checked|not)$/;

module.exports = {
	compile: function(next, data, options, context){
		var name = data.name,
			subselect = data.data;

		if(options && options.strict && !re_CSS3.test(name)){
			throw SyntaxError(":" + name + " isn't part of CSS3");
		}

		if(typeof filters[name] === "function"){
			verifyArgs(filters[name], name,  subselect);
			return filters[name](next, subselect, options, context);
		} else if(typeof pseudos[name] === "function"){
			var func = pseudos[name];
			verifyArgs(func, name, subselect);

			if(next === trueFunc) return func;

			return function pseudoArgs(elem){
				return func(elem, subselect) && next(elem);
			};
		} else {
			throw new SyntaxError("unmatched pseudo-class :" + name);
		}
	},
	filters: filters,
	pseudos: pseudos
};

}, function(modId) { var map = {"./attributes.js":1543419325242}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1543419325242, function(require, module, exports) {
var DomUtils  = require("domutils"),
    hasAttrib = DomUtils.hasAttrib,
    getAttributeValue = DomUtils.getAttributeValue,
    falseFunc = require("boolbase").falseFunc;

//https://github.com/slevithan/XRegExp/blob/master/src/xregexp.js#L469
var reChars = /[-[\]{}()*+?.,\\^$|#\s]/g;

/*
	attribute selectors
*/

var attributeRules = {
	__proto__: null,
	equals: function(next, data){
		var name  = data.name,
		    value = data.value;

		if(data.ignoreCase){
			value = value.toLowerCase();

			return function equalsIC(elem){
				var attr = getAttributeValue(elem, name);
				return attr != null && attr.toLowerCase() === value && next(elem);
			};
		}

		return function equals(elem){
			return getAttributeValue(elem, name) === value && next(elem);
		};
	},
	hyphen: function(next, data){
		var name  = data.name,
		    value = data.value,
		    len = value.length;

		if(data.ignoreCase){
			value = value.toLowerCase();

			return function hyphenIC(elem){
				var attr = getAttributeValue(elem, name);
				return attr != null &&
						(attr.length === len || attr.charAt(len) === "-") &&
						attr.substr(0, len).toLowerCase() === value &&
						next(elem);
			};
		}

		return function hyphen(elem){
			var attr = getAttributeValue(elem, name);
			return attr != null &&
					attr.substr(0, len) === value &&
					(attr.length === len || attr.charAt(len) === "-") &&
					next(elem);
		};
	},
	element: function(next, data){
		var name = data.name,
		    value = data.value;

		if(/\s/.test(value)){
			return falseFunc;
		}

		value = value.replace(reChars, "\\$&");

		var pattern = "(?:^|\\s)" + value + "(?:$|\\s)",
		    flags = data.ignoreCase ? "i" : "",
		    regex = new RegExp(pattern, flags);

		return function element(elem){
			var attr = getAttributeValue(elem, name);
			return attr != null && regex.test(attr) && next(elem);
		};
	},
	exists: function(next, data){
		var name = data.name;
		return function exists(elem){
			return hasAttrib(elem, name) && next(elem);
		};
	},
	start: function(next, data){
		var name  = data.name,
		    value = data.value,
		    len = value.length;

		if(len === 0){
			return falseFunc;
		}
		
		if(data.ignoreCase){
			value = value.toLowerCase();

			return function startIC(elem){
				var attr = getAttributeValue(elem, name);
				return attr != null && attr.substr(0, len).toLowerCase() === value && next(elem);
			};
		}

		return function start(elem){
			var attr = getAttributeValue(elem, name);
			return attr != null && attr.substr(0, len) === value && next(elem);
		};
	},
	end: function(next, data){
		var name  = data.name,
		    value = data.value,
		    len   = -value.length;

		if(len === 0){
			return falseFunc;
		}

		if(data.ignoreCase){
			value = value.toLowerCase();

			return function endIC(elem){
				var attr = getAttributeValue(elem, name);
				return attr != null && attr.substr(len).toLowerCase() === value && next(elem);
			};
		}

		return function end(elem){
			var attr = getAttributeValue(elem, name);
			return attr != null && attr.substr(len) === value && next(elem);
		};
	},
	any: function(next, data){
		var name  = data.name,
		    value = data.value;

		if(value === ""){
			return falseFunc;
		}

		if(data.ignoreCase){
			var regex = new RegExp(value.replace(reChars, "\\$&"), "i");

			return function anyIC(elem){
				var attr = getAttributeValue(elem, name);
				return attr != null && regex.test(attr) && next(elem);
			};
		}

		return function any(elem){
			var attr = getAttributeValue(elem, name);
			return attr != null && attr.indexOf(value) >= 0 && next(elem);
		};
	},
	not: function(next, data){
		var name  = data.name,
		    value = data.value;

		if(value === ""){
			return function notEmpty(elem){
				return !!getAttributeValue(elem, name) && next(elem);
			};
		} else if(data.ignoreCase){
			value = value.toLowerCase();

			return function notIC(elem){
				var attr = getAttributeValue(elem, name);
				return attr != null && attr.toLowerCase() !== value && next(elem);
			};
		}

		return function not(elem){
			return getAttributeValue(elem, name) !== value && next(elem);
		};
	}
};

module.exports = {
	compile: function(next, data, options){
		if(options && options.strict && (
			data.ignoreCase || data.action === "not"
		)) throw SyntaxError("Unsupported attribute selector");
		return attributeRules[data.action](next, data);
	},
	rules: attributeRules
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1543419325243, function(require, module, exports) {
/*
	compiles a selector to an executable function
*/

module.exports = compile;
module.exports.compileUnsafe = compileUnsafe;
module.exports.compileToken = compileToken;

var parse       = require("css-what"),
    DomUtils    = require("domutils"),
    isTag       = DomUtils.isTag,
    Rules       = require("./general.js"),
    sortRules   = require("./sort.js"),
    BaseFuncs   = require("boolbase"),
    trueFunc    = BaseFuncs.trueFunc,
    falseFunc   = BaseFuncs.falseFunc,
    procedure   = require("./procedure.json");

function compile(selector, options, context){
	var next = compileUnsafe(selector, options, context);
	return wrap(next);
}

function wrap(next){
	return function base(elem){
		return isTag(elem) && next(elem);
	};
}

function compileUnsafe(selector, options, context){
	var token = parse(selector, options);
	return compileToken(token, options, context);
}

function includesScopePseudo(t){
    return t.type === "pseudo" && (
        t.name === "scope" || (
            Array.isArray(t.data) &&
            t.data.some(function(data){
                return data.some(includesScopePseudo);
            })
        )
    );
}

var DESCENDANT_TOKEN = {type: "descendant"},
    SCOPE_TOKEN = {type: "pseudo", name: "scope"},
    PLACEHOLDER_ELEMENT = {},
    getParent = DomUtils.getParent;

//CSS 4 Spec (Draft): 3.3.1. Absolutizing a Scope-relative Selector
//http://www.w3.org/TR/selectors4/#absolutizing
function absolutize(token, context){
    //TODO better check if context is document
    var hasContext = !!context && !!context.length && context.every(function(e){
        return e === PLACEHOLDER_ELEMENT || !!getParent(e);
    });


    token.forEach(function(t){
        if(t.length > 0 && isTraversal(t[0]) && t[0].type !== "descendant"){
            //don't return in else branch
        } else if(hasContext && !includesScopePseudo(t)){
            t.unshift(DESCENDANT_TOKEN);
        } else {
            return;
        }

        t.unshift(SCOPE_TOKEN);
    });
}

function compileToken(token, options, context){
    token = token.filter(function(t){ return t.length > 0; });

	token.forEach(sortRules);

	var isArrayContext = Array.isArray(context);

    context = (options && options.context) || context;

    if(context && !isArrayContext) context = [context];

    absolutize(token, context);

	return token
		.map(function(rules){ return compileRules(rules, options, context, isArrayContext); })
		.reduce(reduceRules, falseFunc);
}

function isTraversal(t){
	return procedure[t.type] < 0;
}

function compileRules(rules, options, context, isArrayContext){
	var acceptSelf = (isArrayContext && rules[0].name === "scope" && rules[1].type === "descendant");
	return rules.reduce(function(func, rule, index){
		if(func === falseFunc) return func;
		return Rules[rule.type](func, rule, options, context, acceptSelf && index === 1);
	}, options && options.rootFunc || trueFunc);
}

function reduceRules(a, b){
	if(b === falseFunc || a === trueFunc){
		return a;
	}
	if(a === falseFunc || b === trueFunc){
		return b;
	}

	return function combine(elem){
		return a(elem) || b(elem);
	};
}

//:not, :has and :matches have to compile selectors
//doing this in lib/pseudos.js would lead to circular dependencies,
//so we add them here

var Pseudos     = require("./pseudos.js"),
    filters     = Pseudos.filters,
    existsOne   = DomUtils.existsOne,
    isTag       = DomUtils.isTag,
    getChildren = DomUtils.getChildren;


function containsTraversal(t){
	return t.some(isTraversal);
}

filters.not = function(next, token, options, context){
	var opts = {
	    	xmlMode: !!(options && options.xmlMode),
	    	strict: !!(options && options.strict)
	    };

	if(opts.strict){
		if(token.length > 1 || token.some(containsTraversal)){
			throw new SyntaxError("complex selectors in :not aren't allowed in strict mode");
		}
	}

    var func = compileToken(token, opts, context);

	if(func === falseFunc) return next;
	if(func === trueFunc)  return falseFunc;

	return function(elem){
		return !func(elem) && next(elem);
	};
};

filters.has = function(next, token, options){
	var opts = {
		xmlMode: !!(options && options.xmlMode),
		strict: !!(options && options.strict)
	};

    //FIXME: Uses an array as a pointer to the current element (side effects)
    var context = token.some(containsTraversal) ? [PLACEHOLDER_ELEMENT] : null;

	var func = compileToken(token, opts, context);

	if(func === falseFunc) return falseFunc;
	if(func === trueFunc)  return function(elem){
			return getChildren(elem).some(isTag) && next(elem);
		};

	func = wrap(func);

    if(context){
        return function has(elem){
		return next(elem) && (
                (context[0] = elem), existsOne(func, getChildren(elem))
            );
	};
    }

    return function has(elem){
		return next(elem) && existsOne(func, getChildren(elem));
	};
};

filters.matches = function(next, token, options, context){
	var opts = {
		xmlMode: !!(options && options.xmlMode),
		strict: !!(options && options.strict),
		rootFunc: next
	};

	return compileToken(token, opts, context);
};

}, function(modId) { var map = {"./general.js":1543419325244,"./sort.js":1543419325245,"./procedure.json":1543419325246,"./pseudos.js":1543419325241}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1543419325244, function(require, module, exports) {
var DomUtils    = require("domutils"),
    isTag       = DomUtils.isTag,
    getParent   = DomUtils.getParent,
    getChildren = DomUtils.getChildren,
    getSiblings = DomUtils.getSiblings,
    getName     = DomUtils.getName;

/*
	all available rules
*/
module.exports = {
	__proto__: null,

	attribute: require("./attributes.js").compile,
	pseudo: require("./pseudos.js").compile,

	//tags
	tag: function(next, data){
		var name = data.name;
		return function tag(elem){
			return getName(elem) === name && next(elem);
		};
	},

	//traversal
	descendant: function(next, rule, options, context, acceptSelf){
		return function descendant(elem){

			if (acceptSelf && next(elem)) return true;

			var found = false;

			while(!found && (elem = getParent(elem))){
				found = next(elem);
			}

			return found;
		};
	},
	parent: function(next, data, options){
		if(options && options.strict) throw SyntaxError("Parent selector isn't part of CSS3");

		return function parent(elem){
			return getChildren(elem).some(test);
		};

		function test(elem){
			return isTag(elem) && next(elem);
		}
	},
	child: function(next){
		return function child(elem){
			var parent = getParent(elem);
			return !!parent && next(parent);
		};
	},
	sibling: function(next){
		return function sibling(elem){
			var siblings = getSiblings(elem);

			for(var i = 0; i < siblings.length; i++){
				if(isTag(siblings[i])){
					if(siblings[i] === elem) break;
					if(next(siblings[i])) return true;
				}
			}

			return false;
		};
	},
	adjacent: function(next){
		return function adjacent(elem){
			var siblings = getSiblings(elem),
			    lastElement;

			for(var i = 0; i < siblings.length; i++){
				if(isTag(siblings[i])){
					if(siblings[i] === elem) break;
					lastElement = siblings[i];
				}
			}

			return !!lastElement && next(lastElement);
		};
	},
	universal: function(next){
		return next;
	}
};
}, function(modId) { var map = {"./attributes.js":1543419325242,"./pseudos.js":1543419325241}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1543419325245, function(require, module, exports) {
module.exports = sortByProcedure;

/*
	sort the parts of the passed selector,
	as there is potential for optimization
	(some types of selectors are faster than others)
*/

var procedure = require("./procedure.json");

var attributes = {
	__proto__: null,
	exists: 10,
	equals: 8,
	not: 7,
	start: 6,
	end: 6,
	any: 5,
	hyphen: 4,
	element: 4
};

function sortByProcedure(arr){
	var procs = arr.map(getProcedure);
	for(var i = 1; i < arr.length; i++){
		var procNew = procs[i];

		if(procNew < 0) continue;

		for(var j = i - 1; j >= 0 && procNew < procs[j]; j--){
			var token = arr[j + 1];
			arr[j + 1] = arr[j];
			arr[j] = token;
			procs[j + 1] = procs[j];
			procs[j] = procNew;
		}
	}
}

function getProcedure(token){
	var proc = procedure[token.type];

	if(proc === procedure.attribute){
		proc = attributes[token.action];

		if(proc === attributes.equals && token.name === "id"){
			//prefer ID selectors (eg. #ID)
			proc = 9;
		}

		if(token.ignoreCase){
			//ignoreCase adds some overhead, prefer "normal" token
			//this is a binary operation, to ensure it's still an int
			proc >>= 1;
		}
	} else if(proc === procedure.pseudo){
		if(!token.data){
			proc = 3;
		} else if(token.name === "has" || token.name === "contains"){
			proc = 0; //expensive in any case
		} else if(token.name === "matches" || token.name === "not"){
			proc = 0;
			for(var i = 0; i < token.data.length; i++){
				//TODO better handling of complex selectors
				if(token.data[i].length !== 1) continue;
				var cur = getProcedure(token.data[i][0]);
				//avoid executing :has or :contains
				if(cur === 0){
					proc = 0;
					break;
				}
				if(cur > proc) proc = cur;
			}
			if(token.data.length > 1 && proc > 0) proc -= 1;
		} else {
			proc = 1;
		}
	}
	return proc;
}

}, function(modId) { var map = {"./procedure.json":1543419325246}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1543419325246, function(require, module, exports) {
module.exports = {
  "universal": 50,
  "tag": 30,
  "attribute": 1,
  "pseudo": 0,
  "descendant": -1,
  "child": -1,
  "parent": -1,
  "sibling": -1,
  "adjacent": -1
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1543419325240);
})()
//# sourceMappingURL=index.js.map
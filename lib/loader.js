"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const css = require("css");
const selectorTokenizer = require("css-selector-tokenizer");
const CleanCSS = require("clean-css");
class RuleSetEntry {
    constructor(selector, rules, index) {
        this.selector = selector;
        this.rules = rules;
        this.index = index;
        this.refcnt = 0;
    }
}
exports.RuleSetEntry = RuleSetEntry;
// export type CssRuleValue = string & { important?: boolean }
class CssRuleValue extends String {
    constructor(val, important) {
        super(val);
        this.important = important;
    }
}
exports.CssRuleValue = CssRuleValue;
// byClass = {
//     ".class-name": {
//         "group-id": {
//             groupBy: "...",
//             rules: {
//                 key: "value"
//             }
//         }
//     }
// }
class Loader {
    constructor() {
        this.entries = {};
        this.unhandable = {};
        this._emptyGroupId = {
            kind: "none",
            id: "@global"
        };
    }
    append(group, selector, rules) {
        if (selector.nodes.length > 0) {
            // console.log("append", group, selector, rules)
            let entry = new RuleSetEntry(selector, rules, ++Loader.ruleCounter);
            let primarySelector = selector.nodes[0];
            let primaryId;
            let target;
            if (primarySelector.type === "class") {
                primaryId = primarySelector.name;
                target = this.entries;
            }
            else {
                primaryId = selector.raw;
                target = this.unhandable;
            }
            if (target[primaryId] == null) {
                target[primaryId] = {};
            }
            if (target[primaryId][group.id] == null) {
                target[primaryId][group.id] = {
                    groupBy: group,
                    entries: []
                };
            }
            target[primaryId][group.id].entries.push(entry);
        }
        else {
            throw new Error("Invalid selector: " + selector);
        }
    }
    find(className) {
        let res = [];
        if (this.entries[className] != null) {
            res = res.concat(Object.values(this.entries[className]));
        }
        if (this.parent) {
            res = res.concat(this.parent.find(className));
        }
        return res;
    }
    makeGroupId(rule) {
        if (rule == null) {
            return this._emptyGroupId;
        }
        else if (rule.type === "document") {
            return {
                kind: "document",
                id: `document[${this.removeWS(rule.document)}]`,
                rule: rule
            };
        }
        else if (rule.type === "media") {
            return {
                kind: "media",
                id: `media[${this.removeWS(rule.media)}]`,
                rule: rule
            };
        }
        else if (rule.type === "font-face") {
            let id1 = "", id2 = "", id3 = "";
            for (const d of rule.declarations) {
                switch (d.property) {
                    case "font-family":
                        id1 += d.value;
                        break;
                    case "font-style":
                        id2 += d.value;
                        break;
                    case "font-weight":
                        id3 += d.value;
                        break;
                }
            }
            return {
                kind: "font",
                id: `font[${id1}/${id2}/${id3}]`,
                rule: rule
            };
        }
        throw new Error(`Not supported rule type: ${rule.type}`);
    }
    *getUnhandables() {
        for (let k in this.unhandable) {
            for (let j in this.unhandable[k]) {
                yield this.unhandable[k][j];
            }
        }
    }
    newChildLoader() {
        const ctor = this.constructor;
        const obj = new ctor();
        obj.parent = this;
        return obj;
    }
    removeWS(str) {
        return str.replace(/[ \t\r\n]+/g, " ");
    }
}
exports.Loader = Loader;
Loader.ruleCounter = 0;
class CssLoader extends Loader {
    load(content) {
        let minified = CssLoader.minifier.minify(content);
        let document = css.parse(minified.styles);
        if (document.stylesheet.parsingErrors
            && document.stylesheet.parsingErrors.length) {
            throw new Error("Css parsing error:\n  " + document.stylesheet.parsingErrors.join("\n  "));
        }
        this.appendRules(this.makeGroupId(), document.stylesheet.rules);
    }
    appendRules(group, rules) {
        for (let rule of rules) {
            switch (rule.type) {
                case "rule":
                    let selectors = rule.selectors.map((value) => {
                        let selectorList = selectorTokenizer.parse(value);
                        let res = selectorList.nodes[0];
                        res.raw = value;
                        return res;
                    });
                    let rules = {};
                    for (let kv of rule.declarations) {
                        if (/!important\s*$/.test(kv.value)) {
                            rules[kv.property] = new CssRuleValue(kv.value.replace(/\s*!important\s*$/, ""), true);
                        }
                        else {
                            rules[kv.property] = new CssRuleValue(kv.value);
                        }
                    }
                    for (let selector of selectors) {
                        this.append(group, selector, rules);
                    }
                    break;
                case "media":
                    this.appendRules(this.makeGroupId(rule), rule.rules);
                    break;
                // case "document":
                //     this.appendRules(this.makeGroupId(rule), rule.rules)
                //     break
                default:
                    let fontGroup = this.makeGroupId(rule);
                    if (!this.unhandable["@font-face"]) {
                        this.unhandable["@font-face"] = {};
                    }
                    if (!this.unhandable["@font-face"][fontGroup.id]) {
                        this.unhandable["@font-face"][fontGroup.id] = {
                            groupBy: fontGroup,
                            entries: []
                        };
                    }
                    this.unhandable["@font-face"][fontGroup.id].entries.push(rule);
                    break;
            }
        }
    }
}
exports.CssLoader = CssLoader;
CssLoader.minifier = new CleanCSS({
    inline: false,
    level: 1
});
class ObjectLoader extends Loader {
}
exports.ObjectLoader = ObjectLoader;
//# sourceMappingURL=loader.js.map
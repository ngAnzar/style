"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Tokenizer = require("css-selector-tokenizer");
const css = require("css");
const isPlainObject = require("is-plain-object");
function isSubselector(name, value) {
    return typeof value !== "string" && !/^[a-z\-]/.test(name);
}
function* iterSelector(selector) {
    if (Array.isArray(selector)) {
        for (const s of selector) {
            yield* iterSelector(Tokenizer.parse(s));
        }
    }
    else if (selector.type === "selectors") {
        for (const s of selector.nodes) {
            yield* iterSelector(s);
        }
    }
    else if (selector.type === "selector") {
        if (selector.nodes.length > 0) {
            if (selector.nodes[0].type === "class") {
                let name = selector.nodes[0].name;
                let other = null;
                selector.nodes.splice(0, 1);
                if (selector.nodes.length) {
                    if (selector.nodes[0].type === "spacing") {
                        selector.nodes.splice(0, 1);
                        other = Tokenizer.stringify(selector);
                    }
                    else {
                        other = "&" + Tokenizer.stringify(selector);
                    }
                }
                yield { name: name, other: other };
            }
            else {
                throw new Error("All CSS selectors must begin with class name selector.");
            }
        }
    }
}
function makeRegisterable(selfRules, name, namespace) {
    let cache = null;
    return {
        name: name,
        register(registry) {
            if (cache !== null) {
                return cache;
            }
            let classNames = [];
            // let rules: ObjectRules = selfRules[name]
            // if (parentRules && parentRules[name]) {
            // 	if (selfRules[name]) {
            // 		rules = {}
            // 		mergeRules(rules, parentRules[name])
            // 		mergeRules(rules, selfRules[name])
            // 	} else {
            // 		rules = parentRules[name]
            // 	}
            // }
            for (const rule of ruleIterator(selfRules[name])) {
                classNames.push(registry.append(rule.key, rule.val, rule.selector, rule.media, namespace));
            }
            return cache = classNames.join(" ");
        },
        dispose(registry) {
            if (cache === null || !selfRules[name]) {
                return;
            }
            for (const rule of ruleIterator(selfRules[name])) {
                registry.remove(rule.key, rule.val, rule.selector, rule.media, namespace);
            }
        }
    };
}
function* ruleIterator(rules) {
    rules = Object.assign({}, rules);
    for (const k of Object.keys(rules)) {
        if (/^[a-z\-]/i.test(k[0]) && typeof rules[k] === "string") {
            yield { selector: null, media: null, key: k, val: rules[k] };
            delete rules[k];
        }
    }
    for (const k in rules) {
        if (k.substr(0, 6) === "@media") {
            for (const sub of ruleIterator(rules[k])) {
                sub.media = k;
                yield sub;
            }
        }
        else if (isPlainObject(rules[k])) {
            for (const sub of ruleIterator(rules[k])) {
                sub.selector = (k[0] === "&" ? k.substr(1) : " " + k) + (sub.selector || "");
                yield sub;
            }
            delete rules[k];
        }
    }
}
function mergeRules(target, rules, selector = null, media = null) {
    if (media) {
        if (!target[media]) {
            target[media] = {};
        }
        return mergeRules(target[media], rules);
    }
    if (selector) {
        if (!target[selector]) {
            target[selector] = {};
        }
        return mergeRules(target[selector], rules);
    }
    if (Array.isArray(rules)) {
        for (const rule of rules) {
            const important = /!important$/.test(rule.value);
            if (typeof target[rule.property] === "string" &&
                target[rule.property].important &&
                !important) {
                continue;
            }
            // if (important) {
            // 	rule.value = rule.value.replace(/\s*!important$/, "")
            // }
            target[rule.property] = rule.value;
        }
    }
    else {
        for (const k in rules) {
            if (k.substr(0, 6) === "@media") {
                mergeRules(target, rules[k], selector, k);
            }
            else if (isSubselector(k, rules[k])) {
                mergeRules(target, rules[k], k, media);
            }
            else if (typeof target[k] === "string" && target[k].important) {
                continue;
            }
            else {
                target[k] = rules[k];
            }
        }
    }
}
class Loader {
    constructor(namespace, parentRules) {
        this.namespace = namespace;
        this.parentRules = parentRules;
        this.rules = {};
        if (parentRules) {
            this.rules = JSON.parse(JSON.stringify(parentRules));
        }
    }
    /**
     * Load sytle definition from CSS syntax
     *
     * @example
     *	loadCss(".example { width: 10px; }")
     */
    loadCss(cssText) {
        // TODO: give filepath in options
        const parsed = css.parse(cssText);
        if (parsed.stylesheet.parsingErrors.length) {
            throw new Error("Failed to parse css:\n" + parsed.stylesheet.parsingErrors.join("\n"));
        }
        const names = [];
        for (const block of parsed.stylesheet.rules) {
            if (block.type === "rule" && block.selectors) {
                for (let selector of iterSelector(block.selectors)) {
                    if (!this.rules[selector.name]) {
                        this.rules[selector.name] = {};
                    }
                    names.push(selector.name);
                    mergeRules(this.rules[selector.name], block.declarations, selector.other);
                }
            }
            else if (block.type === "media" && block.rules) {
                for (let rule of block.rules) {
                    for (let selector of iterSelector(rule.selectors)) {
                        if (!this.rules[selector.name]) {
                            this.rules[selector.name] = {};
                        }
                        names.push(selector.name);
                        mergeRules(this.rules[selector.name], rule.declarations, selector.other, "@media " + block.media);
                    }
                }
            }
        }
        return names.map(name => makeRegisterable(this.rules, name, this.namespace));
    }
    /**
     * Load Object notation syntax
     *
     * @example
     *	loadObject(".example", {width: "10px"})
     */
    loadObject(selector, obj) {
        const names = [];
        for (const s of iterSelector(Tokenizer.parse(selector))) {
            if (!this.rules[s.name]) {
                this.rules[s.name] = {};
            }
            names.push(s.name);
            mergeRules(this.rules[s.name], obj, s.other);
        }
        return names.map(name => makeRegisterable(this.rules, name, this.namespace));
    }
    newScope(namespace) {
        // TODO: maybe copy this.rules
        return new Loader(namespace, this.rules);
    }
    dispose() {
        this.rules = {};
        this.parentRules = {};
    }
}
exports.Loader = Loader;
//# sourceMappingURL=loader.js.map
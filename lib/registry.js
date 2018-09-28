"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const selectorTokenizer = require("css-selector-tokenizer");
// export interface Property {
//     name: string
//     value: CssRuleValue
// }
class RegisteredProperty {
    constructor(mangledName, 
    // public property: Property,
    ruleName, ruleValue, isImportant, selectors, groups, index) {
        this.mangledName = mangledName;
        this.ruleName = ruleName;
        this.ruleValue = ruleValue;
        this.isImportant = isImportant;
        this.selectors = selectors;
        this.groups = groups;
        this.index = index;
    }
    append(group, selector, index, isImportant) {
        this.index = Math.min(this.index, index);
        this.isImportant = this.isImportant || isImportant;
        if (!this.selectors.find((element) => element.raw === selector.raw)) {
            this.selectors.push(selector);
        }
        if (!this.groups.find((element) => element.id === group.id)) {
            this.groups.push(group);
        }
    }
}
exports.RegisteredProperty = RegisteredProperty;
class Registry {
    // protected common:
    constructor(name) {
        this.name = name;
        // static readonly CANT_GROUP_SELECTOR = /:[^:]*placeholder\b/ig
        this.depends = [];
        this.entries = {};
        this.uidCounter = 0;
        this.uidOffset = 10;
        this.uidMaxAlpha = 35;
        this.uidPower = 1;
    }
    addDependency(dep) {
        if (this.depends.indexOf(dep) === -1) {
            this.depends.push(dep);
        }
    }
    getAllDeps() {
        let deps = this.depends.slice(0);
        for (let d of this.depends) {
            deps = deps.concat(d.getAllDeps());
        }
        return deps.filter((value, index, self) => self.indexOf(value) === index);
    }
    set canMangleName(val) {
        this._canMangleName = val;
    }
    get root() {
        if (this._root != null) {
            return this._root;
        }
        else if (this.depends.length === 0) {
            return this;
        }
        else {
            for (let d of this.depends) {
                if (d.root) {
                    return this._root = d.root;
                }
            }
        }
        return null;
    }
    register(ruleset) {
        let res = [];
        for (let entry of ruleset.entries) {
            for (let ruleName in entry.rules) {
                let ruleValue = entry.rules[ruleName];
                let rule = `${ruleName}:${ruleValue}`;
                let registered = this.findProperty(rule);
                if (registered) {
                    registered.append(ruleset.groupBy, entry.selector, entry.index, ruleValue.important || false);
                    res.push(registered);
                }
                else {
                    this.entries[rule] = registered = new RegisteredProperty("", ruleName, ruleValue.toString(), ruleValue.important || false, [entry.selector], [ruleset.groupBy], entry.index);
                    res.push(registered);
                }
            }
        }
        return res;
    }
    getClassNames(props, request) {
        let res = [];
        for (let prop of props) {
            let unmangled = null;
            for (let sel of prop.selectors) {
                if (this._canMangleName && !this._canMangleName(sel)) {
                    let primary = sel.nodes[0];
                    if (primary.type === "class" && primary.name === request) {
                        unmangled = primary.name;
                        break;
                    }
                }
            }
            if (unmangled) {
                if (res.indexOf(unmangled) === -1) {
                    res.push(unmangled);
                }
            }
            else {
                if (!prop.mangledName) {
                    prop.mangledName = this.nextId();
                }
                if (res.indexOf(prop.mangledName) === -1) {
                    res.push(prop.mangledName);
                }
            }
        }
        return res;
    }
    findProperty(property) {
        let result = this.entries[property];
        if (result != null) {
            return result;
        }
        else {
            for (let d of this.depends) {
                let result = d.findProperty(property);
                if (result !== null) {
                    return result;
                }
            }
        }
        return null;
    }
    registerUnhandled(loader) {
        for (let rs of loader.getUnhandables()) {
            this.register(rs);
        }
    }
    nextId() {
        if (this.root && this.root !== this) {
            return this.root.nextId();
        }
        else {
            const nextId = this.uidCounter + this.uidOffset;
            if (nextId >= this.uidMaxAlpha) {
                this.uidOffset += (this.uidMaxAlpha + 1) * 9;
                this.uidMaxAlpha = Math.pow(36, ++this.uidPower) - 1;
            }
            ++this.uidCounter;
            return nextId.toString(36);
        }
    }
    renderCss(options = {}) {
        if (options.splitByMedia === true) {
            return this._renderByGroup(options);
        }
        else {
            return this._renderFlat(options);
        }
    }
    _renderByGroup(options) {
        let byGroup = {};
        for (let prop of Object.values(this.entries)) {
            for (let group of prop.groups) {
                if (byGroup[group.id] == null) {
                    byGroup[group.id] = {
                        group: group,
                        name: this.name,
                        content: ""
                    };
                }
                byGroup[group.id].content += this._renderProperty(options, prop);
            }
        }
        return Object.values(byGroup);
    }
    _renderFlat(options) {
        let content = "";
        let parts = this._renderByGroup(options).sort((a, b) => {
            if (!a.group || a.group.kind === "none") {
                return -1;
            }
            else if (!b.group || b.group.kind === "none") {
                return 1;
            }
            else {
                return a.group.id.localeCompare(b.group.id);
            }
        });
        for (let part of parts) {
            if (!part.group || part.group.kind === "none") {
                content += part.content;
            }
            else if (part.group.kind === "media") {
                content += "@media " + part.group.rule.media + "{";
                content += part.content;
                content += "}";
            }
        }
        return [{ name: this.name, content: content }];
    }
    _renderProperty(options, prop) {
        let result = "";
        for (let v of this._expandProperty(options, prop)) {
            result += `${v.selectors.join(",")}{${prop.ruleName}:${prop.ruleValue}}`;
        }
        return result;
        // let selectors: string[] = []
        // for (let sel of prop.selectors) {
        //     if (!this._canMangleName || this._canMangleName(sel)) {
        //         selectors.push(selectorTokenizer.stringify({
        //             type: "selectors",
        //             nodes: [{
        //                 type: "selector",
        //                 nodes: [{ type: "class", name: prop.mangledName }].concat(sel.nodes.slice(1) as any)
        //             }]
        //         }))
        //     } else {
        //         selectors.push(selectorTokenizer.stringify({
        //             type: "selectors",
        //             nodes: [sel]
        //         }))
        //     }
        // }
        // selectors = selectors.filter((value, index, self) => self.indexOf(value) === index)
        // return `${selectors.join(",")}{${prop.ruleName}:${prop.ruleValue}}`
    }
    *_expandProperty(options, prop) {
        let multi = [];
        for (let sel of prop.selectors) {
            let selector = "";
            if (!this._canMangleName || this._canMangleName(sel)) {
                selector = selectorTokenizer.stringify({
                    type: "selectors",
                    nodes: [{
                            type: "selector",
                            nodes: [{ type: "class", name: prop.mangledName }].concat(sel.nodes.slice(1))
                        }]
                });
            }
            else {
                selector = selectorTokenizer.stringify({
                    type: "selectors",
                    nodes: [sel]
                });
            }
            if (/:[^:]*placeholder\b/ig.test(selector)) {
                yield { selectors: [selector], property: prop };
            }
            else if (selector.length > 0) {
                multi.push(selector);
            }
        }
        if (multi.length) {
            yield {
                selectors: multi.filter((value, index, self) => self.indexOf(value) === index),
                property: prop
            };
        }
    }
}
exports.Registry = Registry;
//# sourceMappingURL=registry.js.map
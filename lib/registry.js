"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Registry {
    constructor() {
        this.normalEntries = {};
        this.mediaEntries = {};
        this.uidCounter = 0;
        this.uidOffset = 10;
        this.uidMaxAlpha = 35;
        this.uidPower = 1;
    }
    append(key, value, selector, media, namespace) {
        // public append(selector: Selector, rules: CssRules, media?: MediaQuery): string[] {
        let entries;
        if (media) {
            if (!this.mediaEntries[media]) {
                this.mediaEntries[media] = {};
            }
            entries = this.mediaEntries[media];
        }
        else {
            entries = this.normalEntries;
        }
        return this._appendRule(entries, selector, key + ":" + value, namespace);
    }
    remove(key, value, selector, media, namespace) {
        let entries;
        if (media) {
            if (!this.mediaEntries[media]) {
                this.mediaEntries[media] = {};
            }
            entries = this.mediaEntries[media];
        }
        else {
            entries = this.normalEntries;
        }
        if (this._removeRule(entries, selector, key + ":" + value, namespace)) {
            if (media && Object.keys(this.mediaEntries[media]).length === 0) {
                delete this.mediaEntries[media];
            }
            return true;
        }
        return false;
    }
    nextId() {
        const nextId = this.uidCounter + this.uidOffset;
        if (nextId >= this.uidMaxAlpha) {
            this.uidOffset += (this.uidMaxAlpha + 1) * 9;
            this.uidMaxAlpha = Math.pow(36, ++this.uidPower) - 1;
        }
        ++this.uidCounter;
        return nextId.toString(36);
    }
    toStyleSheet(format = false) {
        let res = "";
        let renderRule = format
            ? (selectors, prop) => {
                return selectors.join(", ") + " { " + prop + " }\n";
            }
            : (selectors, prop) => {
                return selectors.join(",") + "{" + prop + "}";
            };
        for (const prop in this.normalEntries) {
            const entry = this.normalEntries[prop];
            res += renderRule(Object.keys(entry.selectors), prop);
        }
        for (const media in this.mediaEntries) {
            res += media + (format ? " {\n" : "{");
            for (const prop in this.mediaEntries[media]) {
                const entry = this.mediaEntries[media][prop];
                res += (format ? "\t" : "") + renderRule(Object.keys(entry.selectors), prop);
            }
            res += (format ? "\n}" : "}");
        }
        return res;
    }
    _appendRule(entries, selector, rule, namespace) {
        if (!entries[rule]) {
            entries[rule] = {
                baseSelector: {},
                selectors: {}
            };
        }
        let [baseSelector, newSelector] = this._entrySelectors(entries[rule], selector, namespace, true);
        if (!entries[rule].selectors[newSelector]) {
            entries[rule].selectors[newSelector] = 1;
        }
        else {
            entries[rule].selectors[newSelector]++;
        }
        return baseSelector;
    }
    _removeRule(entries, selector, rule, namespace) {
        if (!entries[rule]) {
            return false;
        }
        let entry = entries[rule];
        let [baseSelector, newSelector] = this._entrySelectors(entry, selector, namespace, false);
        if (entry.selectors[newSelector] > 0) {
            entry.selectors[newSelector]--;
            if (entry.selectors[newSelector] <= 0) {
                delete entry.selectors[newSelector];
            }
        }
        if (Object.keys(entry.selectors).length === 0) {
            delete entries[rule];
        }
        return true;
    }
    _entrySelectors(entry, selector, namespace, create = false) {
        let baseSelector;
        if (selector) {
            if (!entry.baseSelector[selector] && create) {
                baseSelector = entry.baseSelector[selector] = this.nextId();
            }
            else {
                baseSelector = entry.baseSelector[selector];
            }
        }
        else if (!entry.baseSelector["*"] && create) {
            baseSelector = entry.baseSelector["*"] = this.nextId();
        }
        else {
            baseSelector = entry.baseSelector["*"];
        }
        selector = "." + baseSelector + (selector || "");
        return [baseSelector, selector];
    }
}
exports.Registry = Registry;
//# sourceMappingURL=registry.js.map
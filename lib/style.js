"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function defineDependentStyles(style, registries, loader) {
    for (let reg of registries) {
        Object.defineProperty(style, reg.name, {
            enumerable: true,
            configurable: false,
            value: newStyle(reg, loader)
        });
    }
}
function newStyle(registry, loader) {
    const style = ((...classNames) => {
        let res = [];
        for (let cls_ of classNames) {
            for (let cls of cls_.split(/\s+(?!,)|(?:\s*,\s*)/)) {
                let rules = loader.find(cls);
                if (rules && rules.length) {
                    for (let rs of rules) {
                        for (let regd of registry.getClassNames(registry.register(rs), cls)) {
                            if (res.indexOf(regd) === -1) {
                                res.push(regd);
                            }
                        }
                    }
                }
                else if (res.indexOf(cls) === -1) {
                    res.push(cls);
                }
            }
        }
        return res.join(" ");
    });
    registry.registerUnhandled(loader);
    defineDependentStyles(style, registry.getAllDeps(), loader);
    return style;
}
exports.newStyle = newStyle;
//# sourceMappingURL=style.js.map
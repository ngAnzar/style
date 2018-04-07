"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isPlainObject = require("is-plain-object");
function defineGetter(target, registry, reg) {
    if (!(reg.name in target)) {
        Object.defineProperty(target, reg.name, {
            enumerable: true,
            configurable: false,
            get: () => {
                return reg.register(registry);
            }
        });
    }
}
/**
 * usage:
 *	const style = newStyle(loader, registry)
 *	style.define(".someClass { width: 10px; height: 10px; }")
 *	style.someClass // returns generated class names
 *	style("someClass") // returns generated class names
 *	style("someClass anotherNotDefinedClass") // returns generated class names + anotherNotDefinedClass
 *	const subStyle = style.newScope("uniqueid", "button") // if uniqueid is exists destroy, and create a new scope
 */
function newStyle(loader, registry) {
    const scopes = {};
    const registers = [];
    const style = (...classNames) => {
        const res = [];
        for (const className of classNames) {
            for (let cn of className.split(/\s+/)) {
                if (cn[0] === ".") {
                    cn = cn.substr(1);
                }
                if (cn in style) {
                    res.push.apply(res, style[cn].split(/\s+/));
                }
                else {
                    res.push[cn];
                }
            }
        }
        return res.filter(function (value, index) {
            return res.indexOf(value) === index;
        }).join(" ");
    };
    style.define = (arg1, arg2) => {
        if (arg2) {
            if (isPlainObject(arg2)) {
                for (let reg of loader.loadObject(arg1, arg2)) {
                    registers.push(reg);
                    defineGetter(style, registry, reg);
                }
            }
            else {
                throw new Error("Invalid type of second argument");
            }
        }
        else {
            for (let reg of loader.loadCss(arg1)) {
                registers.push(reg);
                defineGetter(style, registry, reg);
            }
        }
    };
    style.newScope = (id, namespace) => {
        if (id in scopes) {
            scopes[id].style.dispose();
        }
        scopes[id] = {
            style: newStyle(loader.newScope(namespace), registry)
        };
        if (namespace) {
            scopes[id].namespace = namespace;
        }
        return scopes[id].style;
    };
    style.dispose = () => {
        for (const reg of registers) {
            reg.dispose(registry);
        }
        for (const id in scopes) {
            scopes[id].style.dispose();
        }
        registers.length = 0;
        loader.dispose();
    };
    return style;
}
exports.newStyle = newStyle;
//# sourceMappingURL=style.js.map


import { ObjectRules } from "./loader"
import { Loader } from "./loader"
import { Registry } from "./registry"

/**
 * Usage:
 *
 * const criticalCss = new Registry()
 * const commonCss = new Registry(criticalCss)
 *
 * const loader = new CssLoader()
 * loader.load("...")
 *
 * const style = newStyle(commonCss, loader)
 *
 */


export type IStyle<T> = ((...classNames: string[]) => string)
    & { [P in keyof T]: T[P] }
    & { [key: string]: any }
export type Style = IStyle<StyleMethods>


export interface StyleMethods {
    define(css: string): void
    define(selector: string, css: ObjectRules): void
    // newScope(id: string, namespace?: string): Style
    dispose(): void
}


function defineDependentStyles(style: Style, registries: Registry[], loader: Loader) {
    for (let reg of registries) {
        Object.defineProperty(style, reg.name, {
            enumerable: true,
            configurable: false,
            value: newStyle(reg, loader)
        })
    }
}


export function newStyle(registry: Registry, loader: Loader): Style {
    const style = ((...classNames: string[]): string => {
        let res: string[] = []

        for (let cls_ of classNames) {
            for (let cls of cls_.split(/\s+(?!,)|(?:\s*,\s*)/)) {
                let rules = loader.find(cls)
                if (rules && rules.length) {
                    for (let rs of rules) {
                        for (let regd of registry.getClassNames(registry.register(rs), cls)) {
                            if (res.indexOf(regd) === -1) {
                                res.push(regd)
                            }
                        }
                    }
                } else if (res.indexOf(cls) === -1) {
                    res.push(cls)
                }
            }
        }

        return res.join(" ")
    }) as Style

    registry.registerUnhandled(loader)
    defineDependentStyles(style, registry.getAllDeps(), loader)

    return style
}

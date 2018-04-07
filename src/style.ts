import * as isPlainObject from "is-plain-object"
import { Loader, ObjectRules, MediaQuery, Registerable } from "./loader"
import { Registry } from "./registry"


function defineGetter(target: Object, registry: Registry, reg: Registerable) {
	if (!(reg.name in target)) {
		Object.defineProperty(target, reg.name, {
			enumerable: true,
			configurable: false,
			get: () => {
				return reg.register(registry)
			}
		})
	}
}


/**
 * const style = new Style(registry)
 * style.define(".helloWorld", {...}) // css .a {...}
 * // innenstől fogva van egy helloWorld tulajdonsága a style-nak,
 * // ami visszaadja a megfelelő osztályt
 * style.helloWorld // -> .a
 * style.define(".helloWorld[attr=val]") // css .a[attr=val] {...}
 * style.define(".helloWorld:hover") // css .a:hover {...}
 * style.define(".helloWorld label") // css .a label {...}
 * style.define(".helloWorld > *") // css .a > * {...}
 */

export type IStyle<T> = ((...classNames: string[]) => string) & {[P in keyof T]: T[P]} & { [key: string]: string }
export type Style = IStyle<StyleMethods>


export interface StyleMethods {
	define(css: string): void
	define(selector: string, css: ObjectRules): void
	newScope(id: string, namespace?: string): Style
	dispose(): void
}


interface ScopedStyle {
	namespace?: string
	style: Style
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
export function newStyle(loader: Loader, registry: Registry): Style {
	const scopes: { [key: string]: ScopedStyle } = {}
	const registers: Registerable[] = []

	const style: any = (...classNames: string[]) => {
		const res: string[] = []
		for (const className of classNames) {
			for (let cn of className.split(/\s+/)) {
				if (cn[0] === ".") {
					cn = cn.substr(1)
				}

				if (cn in style) {
					res.push.apply(res, style[cn].split(/\s+/))
				} else {
					res.push[cn]
				}
			}
		}
		return res.filter(function (value, index) {
			return res.indexOf(value) === index
		}).join(" ")
	}

	style.define = (arg1: any, arg2?: any) => {
		if (arg2) {
			if (isPlainObject(arg2)) {
				for (let reg of loader.loadObject(arg1, arg2)) {
					registers.push(reg)
					defineGetter(style, registry, reg)
				}
			} else {
				throw new Error("Invalid type of second argument")
			}
		} else {
			for (let reg of loader.loadCss(arg1)) {
				registers.push(reg)
				defineGetter(style, registry, reg)
			}
		}
	}

	style.newScope = (id: string, namespace?: string): Style => {
		if (id in scopes) {
			scopes[id].style.dispose()
		}

		scopes[id] = {
			style: newStyle(loader.newScope(namespace), registry)
		}

		if (namespace) {
			scopes[id].namespace = namespace
		}

		return scopes[id].style
	}

	style.dispose = () => {
		for (const reg of registers) {
			reg.dispose(registry)
		}

		for (const id in scopes) {
			scopes[id].style.dispose()
		}

		registers.length = 0
		loader.dispose()
	}

	return style
}
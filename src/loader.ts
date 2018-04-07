import * as Tokenizer from "css-selector-tokenizer"
import * as css from "css"
import * as isPlainObject from "is-plain-object"

import { Registry } from "./registry"


export interface Selectors {
	type: "selectors"
	nodes: Selector[]
}


export interface Selector {
	type: "selector"
	nodes: SelectorPart[]
}


export interface SelectorPart {
	type: "element" | "id" | "class" | "operator" | "pseudo-element" | "spacing" | "attribute" | "nested-pseudo-class"
	name?: string
	operator?: string
	before?: string
	after?: string
	value?: string
	content?: string
	nodes?: Selector
}


export interface CssRules {
	[key: string]: string
}


export type RuleProperty = string & { important?: boolean }


export interface ObjectRules {
	[key: string]: RuleProperty | ObjectRules
}


export interface Registerable {
	name: string
	register(registry: Registry): string
	dispose(registry: Registry): void
}


export type MediaQuery = string | null


export interface StyleSheet {
	type: "stylesheet",
	stylesheet: { rules: StyleSheetRule[], parsingErrors: any[] }
}


export interface StyleSheetPosition {
	start: {
		line: number,
		column: number
	}
	end: {
		line: number,
		column: number
	}
}


export interface StyleSheetDecl {
	type: "declaration"
	property: string
	value: string
	position: StyleSheetPosition
}


export interface StyleSheetRule {
	type: "rule" | "media"
	selectors?: string[]
	declarations?: StyleSheetDecl[]
	position: StyleSheetPosition
	media?: string
	rules?: StyleSheetRule[]
}


type RulesByQuery = { media: MediaQuery, rules: CssRules }[]

function isSubselector(name: string, value: any): boolean {
	return typeof value !== "string" && !/^[a-z\-]/.test(name)
}


function* iterSelector(selector: Selectors | Selector | string[]): IterableIterator<{ name: string, other: string | null }> {
	if (Array.isArray(selector)) {
		for (const s of selector) {
			yield* iterSelector(Tokenizer.parse(s))
		}
	} else if (selector.type === "selectors") {
		for (const s of selector.nodes) {
			yield* iterSelector(s)
		}
	} else if (selector.type === "selector") {
		if (selector.nodes.length > 0) {
			if (selector.nodes[0].type === "class") {
				let name: string = selector.nodes[0].name as string
				let other: string | null = null
				selector.nodes.splice(0, 1)

				if (selector.nodes.length) {
					if (selector.nodes[0].type === "spacing") {
						selector.nodes.splice(0, 1)
						other = Tokenizer.stringify(selector)
					} else {
						other = "&" + Tokenizer.stringify(selector)
					}
				}

				yield { name: name, other: other }
			} else {
				throw new Error("All CSS selectors must begin with class name selector.")
			}
		}
	}
}


function makeRegisterable(selfRules: LoaderRules, name: string, namespace?: string): Registerable {
	let cache: string | null = null

	return {
		name: name,
		register(registry: Registry): string {
			if (cache !== null) {
				return cache
			}

			let classNames: string[] = []
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
				classNames.push(registry.append(rule.key, rule.val, rule.selector, rule.media, namespace))
			}
			return cache = classNames.join(" ")
		},
		dispose(registry: Registry) {
			if (cache === null || !selfRules[name]) {
				return
			}

			for (const rule of ruleIterator(selfRules[name])) {
				registry.remove(rule.key, rule.val, rule.selector, rule.media, namespace)
			}
		}
	}
}


function* ruleIterator(rules: ObjectRules):
	IterableIterator<{ selector: string | null, media: MediaQuery, key: string, val: string }> {
	rules = Object.assign({}, rules)

	for (const k of Object.keys(rules)) {
		if (/^[a-z\-]/i.test(k[0]) && typeof rules[k] === "string") {
			yield { selector: null, media: null, key: k, val: rules[k] as string }
			delete rules[k]
		}
	}

	for (const k in rules) {
		if (k.substr(0, 6) === "@media") {
			for (const sub of ruleIterator(rules[k] as ObjectRules)) {
				sub.media = k
				yield sub
			}
		} else if (isPlainObject(rules[k])) {
			for (const sub of ruleIterator(rules[k] as ObjectRules)) {
				sub.selector = (k[0] === "&" ? k.substr(1) : " " + k) + (sub.selector || "")
				yield sub
			}
			delete rules[k]
		}
	}
}


function mergeRules(target: ObjectRules,
	rules: StyleSheetDecl[] | ObjectRules,
	selector: string | null = null,
	media: MediaQuery | null = null): void {

	if (media) {
		if (!target[media]) {
			target[media] = {}
		}
		return mergeRules(target[media] as ObjectRules, rules)
	}

	if (selector) {
		if (!target[selector]) {
			target[selector] = {}
		}
		return mergeRules(target[selector] as ObjectRules, rules)
	}

	if (Array.isArray(rules)) {
		for (const rule of rules) {
			const important = /!important$/.test(rule.value)

			if (typeof target[rule.property] === "string" &&
				(target[rule.property] as RuleProperty).important &&
				!important) {
				continue
			}

			// if (important) {
			// 	rule.value = rule.value.replace(/\s*!important$/, "")
			// }

			target[rule.property] = rule.value
		}
	} else {
		for (const k in rules) {
			if (k.substr(0, 6) === "@media") {
				mergeRules(target, rules[k] as ObjectRules, selector, k)
			} else if (isSubselector(k, rules[k])) {
				mergeRules(target, rules[k] as ObjectRules, k, media)
			} else if (typeof target[k] === "string" && (target[k] as RuleProperty).important) {
				continue
			} else {
				target[k] = rules[k]
			}
		}
	}
}


type LoaderRules = { [key: string]: ObjectRules }


export class Loader {
	private rules: LoaderRules = {}

	public constructor(protected namespace?: string, private parentRules?: LoaderRules) {
		if (parentRules) {
			this.rules = JSON.parse(JSON.stringify(parentRules))
		}
	}

	/**
	 * Load sytle definition from CSS syntax
	 *
	 * @example
	 *	loadCss(".example { width: 10px; }")
	 */
	public loadCss(cssText: string): Registerable[] {
		// TODO: give filepath in options
		const parsed = css.parse(cssText) as StyleSheet
		if (parsed.stylesheet.parsingErrors.length) {
			throw new Error("Failed to parse css:\n" + parsed.stylesheet.parsingErrors.join("\n"))
		}

		const names: string[] = []
		for (const block of parsed.stylesheet.rules) {
			if (block.type === "rule" && block.selectors) {
				for (let selector of iterSelector(block.selectors)) {
					if (!this.rules[selector.name]) {
						this.rules[selector.name] = {}
					}
					names.push(selector.name)
					mergeRules(this.rules[selector.name], block.declarations as StyleSheetDecl[], selector.other)
				}
			} else if (block.type === "media" && block.rules) {
				for (let rule of block.rules) {
					for (let selector of iterSelector(rule.selectors as string[])) {
						if (!this.rules[selector.name]) {
							this.rules[selector.name] = {}
						}
						names.push(selector.name)
						mergeRules(
							this.rules[selector.name],
							rule.declarations as StyleSheetDecl[],
							selector.other,
							"@media " + block.media)
					}
				}
			}
		}

		return names.map(name => makeRegisterable(this.rules, name, this.namespace))
	}

	/**
	 * Load Object notation syntax
	 *
	 * @example
	 *	loadObject(".example", {width: "10px"})
	 */
	public loadObject(selector: string, obj: ObjectRules): Registerable[] {
		const names: string[] = []

		for (const s of iterSelector(Tokenizer.parse(selector))) {
			if (!this.rules[s.name]) {
				this.rules[s.name] = {}
			}
			names.push(s.name)
			mergeRules(this.rules[s.name], obj, s.other)
		}

		return names.map(name => makeRegisterable(this.rules, name, this.namespace))
	}

	public newScope(namespace?: string): Loader {
		// TODO: maybe copy this.rules
		return new Loader(namespace, this.rules)
	}

	public dispose() {
		this.rules = {}
		this.parentRules = {}
	}
}
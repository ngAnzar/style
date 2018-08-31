import * as SelectorTokenizer from "css-selector-tokenizer"
import { Selector, CssRules, MediaQuery } from "./loader"


export interface Entry {
	selectors: { [key: string]: number }
	baseSelector: { [key: string]: string }
}


export interface Entries {
	[key: string]: Entry
}


export class Registry {
	public normalEntries: Entries = {}
	public mediaEntries: { [key: string]: Entries } = {}

	private uidCounter: number = 0
	private uidOffset: number = 10
	private uidMaxAlpha: number = 35
	private uidPower: number = 1

	public append(key: string, value: string, selector: string | null, media: string | null, namespace?: string): string {
		let entries: Entries

		if (media) {
			if (!this.mediaEntries[media]) {
				this.mediaEntries[media] = {}
			}
			entries = this.mediaEntries[media]
		} else {
			entries = this.normalEntries
		}

		return this._appendRule(entries, selector, key + ":" + value, namespace)
	}

	public remove(key: string, value: string, selector: string | null, media: string | null, namespace?: string): boolean {
		let entries: Entries

		if (media) {
			if (!this.mediaEntries[media]) {
				this.mediaEntries[media] = {}
			}
			entries = this.mediaEntries[media]
		} else {
			entries = this.normalEntries
		}

		if (this._removeRule(entries, selector, key + ":" + value, namespace)) {
			if (media && Object.keys(this.mediaEntries[media]).length === 0) {
				delete this.mediaEntries[media]
			}
			return true
		}
		return false
	}

	public nextId() {
		const nextId = this.uidCounter + this.uidOffset
		if (nextId >= this.uidMaxAlpha) {
			this.uidOffset += (this.uidMaxAlpha + 1) * 9
			this.uidMaxAlpha = Math.pow(36, ++this.uidPower) - 1
		}
		++this.uidCounter
		return nextId.toString(36)
	}

	public toStyleSheet(format: boolean = false) {
		let res = ""
		let renderRule = format
			? (selectors, prop) => {
				return selectors.join(", ") + " { " + prop + " }\n"
			}
			: (selectors, prop) => {
				return selectors.join(",") + "{" + prop + "}"
			}


		for (const prop in this.normalEntries) {
			const entry = this.normalEntries[prop]
			res += renderRule(Object.keys(entry.selectors), prop)
		}

		for (const media in this.mediaEntries) {
			res += media + (format ? " {\n" : "{")
			for (const prop in this.mediaEntries[media]) {
				const entry = this.mediaEntries[media][prop]
				res += (format ? "\t" : "") + renderRule(Object.keys(entry.selectors), prop)
			}
			res += (format ? "\n}" : "}")
		}

		return res
	}

	private _appendRule(entries: Entries, selector: string | null, rule: string, namespace?: string) {
		if (!entries[rule]) {
			entries[rule] = {
				baseSelector: {},
				selectors: {}
			}
		}

		let [baseSelector, newSelector] = this._entrySelectors(entries[rule], selector, namespace, true)

		if (!entries[rule].selectors[newSelector]) {
			entries[rule].selectors[newSelector] = 1
		} else {
			entries[rule].selectors[newSelector]++
		}

		return baseSelector
	}

	private _removeRule(entries: Entries, selector: string | null, rule: string, namespace?: string): boolean {
		if (!entries[rule]) {
			return false
		}

		let entry = entries[rule]
		let [baseSelector, newSelector] = this._entrySelectors(entry, selector, namespace, false)

		if (entry.selectors[newSelector] > 0) {
			entry.selectors[newSelector]--
			if (entry.selectors[newSelector] <= 0) {
				delete entry.selectors[newSelector]
			}
		}

		if (Object.keys(entry.selectors).length === 0) {
			delete entries[rule]
		}

		return true
	}

	private _entrySelectors(entry: Entry, selector: string | null, namespace?: string, create: boolean = false): string[] {
		let baseSelector: string;

		if (selector) {
			if (!entry.baseSelector[selector] && create) {
				baseSelector = entry.baseSelector[selector] = this.nextId()
			} else {
				baseSelector = entry.baseSelector[selector]
			}
		} else if (!entry.baseSelector["*"] && create) {
			baseSelector = entry.baseSelector["*"] = this.nextId()
		} else {
			baseSelector = entry.baseSelector["*"]
		}

		selector = "." + baseSelector + (selector || "")
		return [baseSelector, selector]
	}
}

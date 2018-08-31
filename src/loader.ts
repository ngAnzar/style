import * as css from "css"
import * as selectorTokenizer from "css-selector-tokenizer"
import * as CleanCSS from "clean-css"


export interface Selectors {
    type: "selectors"
    nodes: Selector[]
}


export interface Selector {
    type: "selector"
    raw: string
    nodes: SelectorPart[]
}


export type SelectorPart =
    { type: "element", name: string } |
    { type: "id", name: string } |
    { type: "class", name: string } |
    { type: "operator", operator: string, before: string, after: string } |
    { type: "pseudo-element", name: string } |
    { type: "spacing", value: string } |
    { type: "attribute", content: string } |
    { type: "invalid", value: any } |
    { type: "universal", namespace?: string } |
    { type: "comment", content: string } |
    { type: "pseudo-class", name: string, content: string } |
    { type: "nested-pseudo-class", name: string, nodes: Selector[] }


export interface StyleSheet {
    type: "stylesheet",
    stylesheet: {
        rules: StyleSheetRule[],
        parsingErrors: any[]
    }
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

export type StyleSheetRule_KF = {
    type: "keyframe",
    values: string[],
    declarations: StyleSheetDecl[],
    position: StyleSheetPosition
}

export type StyleSheetRule_ =
    { type: "rule", selectors: string[], declarations: StyleSheetDecl[] } |
    { type: "comment", comment: string } |
    { type: "charset", charset: string } |
    { type: "custom-media", name: string, media: string } |
    { type: "document", document: string, vendor?: string, rules: StyleSheetRule[] } |
    { type: "font-face", declarations: StyleSheetDecl[] } |
    { type: "host", rules: StyleSheetRule[] } |
    { type: "import", import: string } |
    { type: "keyframes", name: string, vendor?: string, keyframes: StyleSheetRule_KF[] } |
    StyleSheetRule_KF |
    { type: "media", media: string, rules: StyleSheetRule[] } |
    { type: "namespace", namespace: string } |
    { type: "page", selectors: string[], declarations: StyleSheetDecl[] } |
    { type: "supports", supports: string, rules: StyleSheetRule[] }


export type StyleSheetRule = StyleSheetRule_ & { position?: StyleSheetPosition, _index?: number }


export interface RuleSet {
    groupBy: RuleSetGroupId
    entries: RuleSetEntry[]
}

export interface UnhandledRuleSet {
    groupBy: RuleSetGroupId
    rules: Array<RuleSetEntry | StyleSheetRule>
}

export interface RuleSetGroupId {
    kind: "none" | "media" | "document"
    id: string
    rule?: StyleSheetRule
}

export class RuleSetEntry {
    public refcnt: number = 0

    public constructor(
        public selector: Selector,
        public rules: CssRules,
        public index: number) { }
}

export type Dict<T> = { [key: string]: T }

// export type CssRuleValue = string & { important?: boolean }
export class CssRuleValue extends String {
    constructor(val: string, public important?: boolean) {
        super(val)
    }
}

export type CssRules = Dict<CssRuleValue>
export type EntriesByClass = Dict<Dict<RuleSet>>

export interface ObjectRules {
    [key: string]: CssRuleValue | ObjectRules
}

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


export abstract class Loader {
    protected static ruleCounter: number = 0

    protected entries: EntriesByClass = {}
    protected unhandable: EntriesByClass = {}

    private _emptyGroupId: RuleSetGroupId = {
        kind: "none",
        id: "@global"
    }

    public append(group: RuleSetGroupId, selector: Selector, rules: CssRules) {
        if (selector.nodes.length > 0) {
            // console.log("append", group, selector, rules)
            let entry = new RuleSetEntry(selector, rules, ++Loader.ruleCounter)
            let primarySelector = selector.nodes[0]
            let primaryId: string
            let target: EntriesByClass

            if (primarySelector.type === "class") {
                primaryId = primarySelector.name
                target = this.entries
            } else {
                primaryId = selector.raw
                target = this.unhandable
            }

            if (target[primaryId] == null) {
                target[primaryId] = {}
            }

            if (target[primaryId][group.id] == null) {
                target[primaryId][group.id] = {
                    groupBy: group,
                    entries: []
                }
            }
            target[primaryId][group.id].entries.push(entry)
        } else {
            throw new Error("Invalid selector: " + selector)
        }
    }

    public find(className: string): RuleSet[] {
        let res: RuleSet[] = []

        if (this.entries[className] != null) {
            res = res.concat(Object.values(this.entries[className]))
        }

        return res
    }

    public makeGroupId(rule?: StyleSheetRule): RuleSetGroupId {
        if (rule == null) {
            return this._emptyGroupId
        } else if (rule.type === "document") {
            return {
                kind: "document",
                id: `document[${this.removeWS(rule.document)}]`,
                rule: rule
            }
        } else if (rule.type === "media") {
            return {
                kind: "media",
                id: `media[${this.removeWS(rule.media)}]`,
                rule: rule
            }
        }
        throw new Error(`Not supported rule type: ${rule.type}`)
    }

    public *getUnhandables(): IterableIterator<RuleSet> {
        for (let k in this.unhandable) {
            for (let j in this.unhandable[k]) {
                yield this.unhandable[k][j]
            }
        }
    }

    protected removeWS(str: string): string {
        return str.replace(/[ \t\r\n]+/g, " ")
    }
}


export class CssLoader extends Loader {
    public static minifier = new CleanCSS({
        inline: false,
        level: 1
    })

    public load(content: string): void {
        let minified = CssLoader.minifier.minify(content)
        let document: StyleSheet = css.parse(minified.styles)

        if (document.stylesheet.parsingErrors
            && document.stylesheet.parsingErrors.length) {
            throw new Error("Css parsing error:\n  " + document.stylesheet.parsingErrors.join("\n  "))
        }

        this.appendRules(this.makeGroupId(), document.stylesheet.rules)
    }

    protected appendRules(group: RuleSetGroupId, rules: StyleSheetRule[]) {
        for (let rule of rules) {
            switch (rule.type) {
                case "rule":
                    let selectors: Selector[] = rule.selectors.map((value) => {
                        let selectorList = selectorTokenizer.parse(value) as Selectors
                        let res = selectorList.nodes[0]
                        res.raw = value
                        return res
                    })
                    let rules: CssRules = {}

                    for (let kv of rule.declarations) {
                        if (/!important\s*$/.test(kv.value)) {
                            rules[kv.property] = new CssRuleValue(kv.value.replace(/\s*!important\s*$/, ""), true)
                        } else {
                            rules[kv.property] = new CssRuleValue(kv.value)
                        }
                    }

                    for (let selector of selectors) {
                        this.append(group, selector, rules)
                    }
                    break

                case "media":
                    this.appendRules(this.makeGroupId(rule), rule.rules)
                    break

                // case "document":
                //     this.appendRules(this.makeGroupId(rule), rule.rules)
                //     break

                default:
                    throw new Error("Unhandled rule type: " + rule.type)
                    break
            }
        }
    }
}


export class ObjectLoader extends Loader {

}

import * as selectorTokenizer from "css-selector-tokenizer"

import { RuleSet, Dict, RuleSetGroupId, Selector, CssRuleValue, Loader, StyleSheetRule } from "./loader"


export interface RenderedCss {
    group?: RuleSetGroupId
    name: string
    content: string
}


export interface RenderOptions {
    splitByMedia?: boolean
}

// export interface Property {
//     name: string
//     value: CssRuleValue
// }

export class RegisteredProperty {
    public constructor(
        public mangledName: string,
        // public property: Property,
        public ruleName: string,
        public ruleValue: string,
        public isImportant: boolean,
        public selectors: Selector[],
        public groups: RuleSetGroupId[],
        public index: number) {
    }

    public append(group: RuleSetGroupId, selector: Selector, index: number, isImportant: boolean) {
        this.index = Math.min(this.index, index)
        this.isImportant = this.isImportant || isImportant

        if (!this.selectors.find((element) => element.raw === selector.raw)) {
            this.selectors.push(selector)
        }

        if (!this.groups.find((element) => element.id === group.id)) {
            this.groups.push(group)
        }
    }

    public renderValue(): string {
        if (this.isImportant) {
            return `${this.ruleValue} !important`
        } else {
            return this.ruleValue
        }
    }
}

/**
 * "width:20px": {
 *      name: "new-class-name",
 *      groups: []
 * }
 */
export type EntriesByProperty = Dict<RegisteredProperty>
export type CanMangleCallback = (selector: Selector) => boolean


export class Registry {
    // static readonly CANT_GROUP_SELECTOR = /:[^:]*placeholder\b/ig

    public readonly depends: Registry[] = []
    protected entries: EntriesByProperty = {}
    private fontFaces: { [key: string]: StyleSheetRule[] } = {}
    private loaders: Loader[] = []

    private uidCounter: number = 0
    private uidOffset: number = 10
    private uidMaxAlpha: number = 35
    private uidPower: number = 1

    private _canMangleName: CanMangleCallback
    // protected common:

    public constructor(public readonly name: string) {

    }

    public addLoader(loader: Loader) {
        if (this.loaders.indexOf(loader) === -1) {
            this.loaders.push(loader)
        }
    }

    public addDependency(dep: Registry): void {
        if (this.depends.indexOf(dep) === -1) {
            this.depends.push(dep)
        }
    }

    public getAllDeps(): Registry[] {
        let deps: Registry[] = this.depends.slice(0)

        for (let d of this.depends) {
            deps = deps.concat(d.getAllDeps())
        }

        return deps.filter((value, index, self) => self.indexOf(value) === index)
    }

    public set canMangleName(val: CanMangleCallback) {
        this._canMangleName = val
    }

    private _root: Registry
    public get root(): Registry | null {
        if (this._root != null) {
            return this._root
        } else if (this.depends.length === 0) {
            return this
        } else {
            for (let d of this.depends) {
                if (d.root) {
                    return this._root = d.root
                }
            }
        }
        return null
    }

    public register(ruleset: RuleSet): RegisteredProperty[] {
        let res: RegisteredProperty[] = []

        if (ruleset.groupBy.kind === "font") {
            this.fontFaces[ruleset.groupBy.id] = ruleset.entries as any
        } else {
            for (let entry of ruleset.entries) {
                for (let ruleName in entry.rules) {
                    let ruleValue = entry.rules[ruleName]
                    let rule = `${ruleName}:${ruleValue}${ruleValue.important ? "!" : ""}`
                    let registered = this.findProperty(rule)

                    if (registered) {
                        registered.append(ruleset.groupBy, entry.selector, entry.index, ruleValue.important || false)
                        res.push(registered)
                    } else {
                        this.entries[rule] = registered = new RegisteredProperty(
                            "",
                            ruleName,
                            ruleValue.toString(),
                            ruleValue.important || false,
                            [entry.selector],
                            [ruleset.groupBy],
                            entry.index
                        )
                        res.push(registered)
                    }
                }
            }
        }

        return res
    }

    public getClassNames(props: RegisteredProperty[], request: string): string[] {
        let res: string[] = []

        for (let prop of props) {
            let unmangled: string | null = null

            for (let sel of prop.selectors) {
                if (this._canMangleName && !this._canMangleName(sel)) {
                    let primary = sel.nodes[0]
                    if (primary.type === "class" && primary.name === request) {
                        unmangled = primary.name
                        break
                    }
                }
            }

            if (unmangled) {
                if (res.indexOf(unmangled) === -1) {
                    res.push(unmangled)
                }
            } else {
                if (!prop.mangledName) {
                    prop.mangledName = this.nextId()
                }

                if (res.indexOf(prop.mangledName) === -1) {
                    res.push(prop.mangledName)
                }
            }
        }

        return res
    }

    protected findProperty(property: string): RegisteredProperty | null {
        let result = this.entries[property]
        if (result != null) {
            return result
        } else {
            for (let d of this.depends) {
                let result = d.findProperty(property)
                if (result !== null) {
                    return result
                }
            }
        }
        return null
    }

    public registerUnhandled(loader: Loader) {
        for (let rs of loader.getUnhandables()) {
            this.register(rs)
        }
    }

    public nextId() {
        if (this.root && this.root !== this) {
            return this.root.nextId()
        } else {
            const nextId = this.uidCounter + this.uidOffset
            if (nextId >= this.uidMaxAlpha) {
                this.uidOffset += (this.uidMaxAlpha + 1) * 9
                this.uidMaxAlpha = Math.pow(36, ++this.uidPower) - 1
            }
            ++this.uidCounter
            return nextId.toString(36)
        }
    }

    public renderCss(options: RenderOptions = {}): RenderedCss[] {
        for (const loader of this.loaders) {
            this.registerUnhandled(loader)
        }

        if (options.splitByMedia === true) {
            return this._renderByGroup(options)
        } else {
            return this._renderFlat(options)
        }
    }

    protected _renderByGroup(options: RenderOptions): RenderedCss[] {
        let byGroup: { [key: string]: RenderedCss } = {}

        for (let prop of Object.values(this.entries)) {
            for (let group of prop.groups) {
                if (byGroup[group.id] == null) {
                    byGroup[group.id] = {
                        group: group,
                        name: this.name,
                        content: ""
                    }
                }

                byGroup[group.id].content += this._renderProperty(options, prop)
            }
        }

        const fonts = Object.values(this.fontFaces)
        if (fonts.length) {
            if (!byGroup["@global"]) {
                byGroup["@global"] = {
                    group: {
                        kind: "none",
                        id: "@global"
                    },
                    name: this.name,
                    content: ""
                }
            }

            for (const font of fonts) {
                byGroup["@global"].content = this._renderFontFace(font) + byGroup["@global"].content
            }
        }

        return Object.values(byGroup)
    }

    protected _renderFlat(options: RenderOptions): RenderedCss[] {
        let content = ""
        let parts = this._renderByGroup(options).sort((a, b) => {
            if (!a.group || a.group.kind === "none") {
                return -1
            } else if (!b.group || b.group.kind === "none") {
                return 1
            } else {
                return a.group.id.localeCompare(b.group.id)
            }
        })

        for (let part of parts) {
            if (!part.group || part.group.kind === "none") {
                content += part.content
            } else if (part.group.kind === "media") {
                content += "@media " + (part.group.rule as any).media + "{"
                content += part.content
                content += "}"
            }
        }

        return [{ name: this.name, content: content }]
    }

    protected _renderProperty(options: RenderOptions, prop: RegisteredProperty): string {
        let result = ""

        for (let v of this._expandProperty(options, prop)) {
            result += `${v.selectors.join(",")}{${prop.ruleName}:${prop.renderValue()}}`
        }

        return result

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

    protected _renderFontFace(faces: StyleSheetRule[]) {
        let res = ""

        for (const face of faces) {
            if (face.type === "font-face") {
                res += "@font-face{"
                for (const d of face.declarations) {
                    res += d.property + ":" + d.value + ";"
                }
                res += "}"
            }
        }

        return res
    }

    protected *_expandProperty(options: RenderOptions, prop: RegisteredProperty): IterableIterator<{ selectors: string[], property: RegisteredProperty }> {
        let multi: string[] = []

        for (let sel of prop.selectors) {
            let selector = ""

            if (!this._canMangleName || this._canMangleName(sel)) {
                selector = selectorTokenizer.stringify({
                    type: "selectors",
                    nodes: [{
                        type: "selector",
                        nodes: [{ type: "class", name: prop.mangledName }].concat(sel.nodes.slice(1) as any)
                    }]
                })
            } else {
                selector = selectorTokenizer.stringify({
                    type: "selectors",
                    nodes: [sel]
                })
            }

            if (/::?-+(moz|ms|webkit)-\b/ig.test(selector)) {
                yield { selectors: [selector], property: prop }
            } else if (selector.length > 0) {
                multi.push(selector)
            }
        }

        if (multi.length) {
            yield {
                selectors: multi.filter((value, index, self) => self.indexOf(value) === index),
                property: prop
            }
        }
    }
}

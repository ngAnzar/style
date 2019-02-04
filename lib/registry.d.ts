import { RuleSet, Dict, RuleSetGroupId, Selector, Loader, StyleSheetRule } from "./loader";
export interface RenderedCss {
    group?: RuleSetGroupId;
    name: string;
    content: string;
}
export interface RenderOptions {
    splitByMedia?: boolean;
}
export declare class RegisteredProperty {
    mangledName: string;
    ruleName: string;
    ruleValue: string;
    isImportant: boolean;
    selectors: Selector[];
    groups: RuleSetGroupId[];
    index: number;
    constructor(mangledName: string, ruleName: string, ruleValue: string, isImportant: boolean, selectors: Selector[], groups: RuleSetGroupId[], index: number);
    append(group: RuleSetGroupId, selector: Selector, index: number, isImportant: boolean): void;
    renderValue(): string;
}
/**
 * "width:20px": {
 *      name: "new-class-name",
 *      groups: []
 * }
 */
export declare type EntriesByProperty = Dict<RegisteredProperty>;
export declare type CanMangleCallback = (selector: Selector) => boolean;
export declare class Registry {
    readonly name: string;
    readonly depends: Registry[];
    protected entries: EntriesByProperty;
    private fontFaces;
    private uidCounter;
    private uidOffset;
    private uidMaxAlpha;
    private uidPower;
    private _canMangleName;
    constructor(name: string);
    addDependency(dep: Registry): void;
    getAllDeps(): Registry[];
    canMangleName: CanMangleCallback;
    private _root;
    readonly root: Registry | null;
    register(ruleset: RuleSet): RegisteredProperty[];
    getClassNames(props: RegisteredProperty[], request: string): string[];
    protected findProperty(property: string): RegisteredProperty | null;
    registerUnhandled(loader: Loader): void;
    nextId(): any;
    renderCss(options?: RenderOptions): RenderedCss[];
    protected _renderByGroup(options: RenderOptions): RenderedCss[];
    protected _renderFlat(options: RenderOptions): RenderedCss[];
    protected _renderProperty(options: RenderOptions, prop: RegisteredProperty): string;
    protected _renderFontFace(faces: StyleSheetRule[]): string;
    protected _expandProperty(options: RenderOptions, prop: RegisteredProperty): IterableIterator<{
        selectors: string[];
        property: RegisteredProperty;
    }>;
}

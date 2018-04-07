import { Registry } from "./registry";
export interface Selectors {
    type: "selectors";
    nodes: Selector[];
}
export interface Selector {
    type: "selector";
    nodes: SelectorPart[];
}
export interface SelectorPart {
    type: "element" | "id" | "class" | "operator" | "pseudo-element" | "spacing" | "attribute" | "nested-pseudo-class";
    name?: string;
    operator?: string;
    before?: string;
    after?: string;
    value?: string;
    content?: string;
    nodes?: Selector;
}
export interface CssRules {
    [key: string]: string;
}
export declare type RuleProperty = string & {
    important?: boolean;
};
export interface ObjectRules {
    [key: string]: RuleProperty | ObjectRules;
}
export interface Registerable {
    name: string;
    register(registry: Registry): string;
    dispose(registry: Registry): void;
}
export declare type MediaQuery = string | null;
export interface StyleSheet {
    type: "stylesheet";
    stylesheet: {
        rules: StyleSheetRule[];
        parsingErrors: any[];
    };
}
export interface StyleSheetPosition {
    start: {
        line: number;
        column: number;
    };
    end: {
        line: number;
        column: number;
    };
}
export interface StyleSheetDecl {
    type: "declaration";
    property: string;
    value: string;
    position: StyleSheetPosition;
}
export interface StyleSheetRule {
    type: "rule" | "media";
    selectors?: string[];
    declarations?: StyleSheetDecl[];
    position: StyleSheetPosition;
    media?: string;
    rules?: StyleSheetRule[];
}
export declare class Loader {
    protected namespace: string | undefined;
    private parentRules;
    private rules;
    constructor(namespace?: string | undefined, parentRules?: {
        [key: string]: ObjectRules;
    } | undefined);
    /**
     * Load sytle definition from CSS syntax
     *
     * @example
     *	loadCss(".example { width: 10px; }")
     */
    loadCss(cssText: string): Registerable[];
    /**
     * Load Object notation syntax
     *
     * @example
     *	loadObject(".example", {width: "10px"})
     */
    loadObject(selector: string, obj: ObjectRules): Registerable[];
    newScope(namespace?: string): Loader;
    dispose(): void;
}

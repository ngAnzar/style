export interface Selectors {
    type: "selectors";
    nodes: Selector[];
}
export interface Selector {
    type: "selector";
    raw: string;
    nodes: SelectorPart[];
}
export declare type SelectorPart = {
    type: "element";
    name: string;
} | {
    type: "id";
    name: string;
} | {
    type: "class";
    name: string;
} | {
    type: "operator";
    operator: string;
    before: string;
    after: string;
} | {
    type: "pseudo-element";
    name: string;
} | {
    type: "spacing";
    value: string;
} | {
    type: "attribute";
    content: string;
} | {
    type: "invalid";
    value: any;
} | {
    type: "universal";
    namespace?: string;
} | {
    type: "comment";
    content: string;
} | {
    type: "pseudo-class";
    name: string;
    content: string;
} | {
    type: "nested-pseudo-class";
    name: string;
    nodes: Selector[];
};
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
export declare type StyleSheetRule_KF = {
    type: "keyframe";
    values: string[];
    declarations: StyleSheetDecl[];
    position: StyleSheetPosition;
};
export declare type StyleSheetRule_ = {
    type: "rule";
    selectors: string[];
    declarations: StyleSheetDecl[];
} | {
    type: "comment";
    comment: string;
} | {
    type: "charset";
    charset: string;
} | {
    type: "custom-media";
    name: string;
    media: string;
} | {
    type: "document";
    document: string;
    vendor?: string;
    rules: StyleSheetRule[];
} | {
    type: "font-face";
    declarations: StyleSheetDecl[];
} | {
    type: "host";
    rules: StyleSheetRule[];
} | {
    type: "import";
    import: string;
} | {
    type: "keyframes";
    name: string;
    vendor?: string;
    keyframes: StyleSheetRule_KF[];
} | StyleSheetRule_KF | {
    type: "media";
    media: string;
    rules: StyleSheetRule[];
} | {
    type: "namespace";
    namespace: string;
} | {
    type: "page";
    selectors: string[];
    declarations: StyleSheetDecl[];
} | {
    type: "supports";
    supports: string;
    rules: StyleSheetRule[];
};
export declare type StyleSheetRule = StyleSheetRule_ & {
    position?: StyleSheetPosition;
    _index?: number;
};
export interface RuleSet {
    groupBy: RuleSetGroupId;
    entries: RuleSetEntry[];
}
export interface UnhandledRuleSet {
    groupBy: RuleSetGroupId;
    rules: Array<RuleSetEntry | StyleSheetRule>;
}
export interface RuleSetGroupId {
    kind: "none" | "media" | "document" | "font";
    id: string;
    rule?: StyleSheetRule;
}
export declare class RuleSetEntry {
    selector: Selector;
    rules: CssRules;
    index: number;
    refcnt: number;
    constructor(selector: Selector, rules: CssRules, index: number);
}
export declare type Dict<T> = {
    [key: string]: T;
};
export declare class CssRuleValue extends String {
    important?: boolean | undefined;
    constructor(val: string, important?: boolean | undefined);
}
export declare type CssRules = Dict<CssRuleValue>;
export declare type EntriesByClass = Dict<Dict<RuleSet>>;
export interface ObjectRules {
    [key: string]: CssRuleValue | ObjectRules;
}
export declare abstract class Loader {
    protected static ruleCounter: number;
    protected entries: EntriesByClass;
    protected unhandable: EntriesByClass;
    protected parent: Loader;
    private _emptyGroupId;
    append(group: RuleSetGroupId, selector: Selector, rules: CssRules): void;
    find(className: string): RuleSet[];
    makeGroupId(rule?: StyleSheetRule): RuleSetGroupId;
    getUnhandables(): IterableIterator<RuleSet>;
    newChildLoader(): Loader;
    protected removeWS(str: string): string;
}
export declare class CssLoader extends Loader {
    static minifier: any;
    load(content: string): void;
    protected appendRules(group: RuleSetGroupId, rules: StyleSheetRule[]): void;
}
export declare class ObjectLoader extends Loader {
}

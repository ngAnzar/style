export interface Entry {
    selectors: {
        [key: string]: number;
    };
    baseSelector: {
        [key: string]: string;
    };
}
export interface Entries {
    [key: string]: Entry;
}
export declare class Registry {
    normalEntries: Entries;
    mediaEntries: {
        [key: string]: Entries;
    };
    private uidCounter;
    private uidOffset;
    private uidMaxAlpha;
    private uidPower;
    append(key: string, value: string, selector: string | null, media: string | null, namespace?: string): string;
    remove(key: string, value: string, selector: string | null, media: string | null, namespace?: string): boolean;
    nextId(): string;
    toStyleSheet(format?: boolean): string;
    private _appendRule(entries, selector, rule, namespace?);
    private _removeRule(entries, selector, rule, namespace?);
    private _entrySelectors(entry, selector, namespace?, create?);
}

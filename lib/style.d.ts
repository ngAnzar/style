import { ObjectRules } from "./loader";
import { Loader } from "./loader";
import { Registry } from "./registry";
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
export declare type IStyle<T> = ((...classNames: string[]) => string) & {
    [P in keyof T]: T[P];
} & {
    [key: string]: any;
};
export declare type Style = IStyle<StyleMethods>;
export interface StyleMethods {
    define(css: string): void;
    define(selector: string, css: ObjectRules): void;
    dispose(): void;
}
export declare function newStyle(registry: Registry, loader: Loader): Style;

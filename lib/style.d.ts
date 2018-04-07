import { Loader, ObjectRules } from "./loader";
import { Registry } from "./registry";
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
export declare type IStyle<T> = ((...classNames: string[]) => string) & {
    [P in keyof T]: T[P];
} & {
    [key: string]: string;
};
export declare type Style = IStyle<StyleMethods>;
export interface StyleMethods {
    define(css: string): void;
    define(selector: string, css: ObjectRules): void;
    newScope(id: string, namespace?: string): Style;
    dispose(): void;
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
export declare function newStyle(loader: Loader, registry: Registry): Style;

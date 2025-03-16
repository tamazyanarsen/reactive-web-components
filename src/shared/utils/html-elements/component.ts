import { ComponentConfig, ComponentContent, CustomComponentConfig, HtmlTagName } from "@shared/types"
import { createCustomEl, createCustomHtmlElement } from "./custom-element"
import { BaseElementConstructor, createEl, HtmlElementConstructor } from "./element"

export const createTemplate = <K extends HtmlTagName>(srcComp: `${K} ${string}`):
    ReturnType<K extends `rx-${string}` ? typeof createCustomHtmlElement<K, HTMLElementTagNameMap[K]> : typeof createEl<K>> =>
    srcComp.startsWith('rx-')
        ? createCustomHtmlElement(srcComp) as any
        : createEl(srcComp) as any

export const createComponent = <T extends BaseElementConstructor | HtmlElementConstructor>(
    strings: TemplateStringsArray,
    ...values: [T, ...any]
): (...args: ComponentContent[]) => T extends BaseElementConstructor ? CustomComponentConfig<InstanceType<T>> : ComponentConfig<InstanceType<T>> => {
    console.log(strings, values)
    const result = [strings[0]].concat(values.map((v, i) => `${v}${strings[i + 1]}`)).join('')
    if ('render' in values[0] && typeof values[0]['render'] === 'function')
        return createCustomEl<T extends BaseElementConstructor ? InstanceType<T> : never>(result) as any
    else
        return createEl(result as `${HtmlTagName} ${string}`) as any
}
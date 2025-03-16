import { ComponentInitConfig, HtmlTagName } from "@shared/types"
import { createCustomHtmlElement } from "./custom-element"
import { createEl } from "./element"

export const createTemplate = <K extends HtmlTagName>(srcComp: `${K} ${string}`,
    config?: ComponentInitConfig<HTMLElementTagNameMap[K]>):
    ReturnType<K extends `rx-${string}` ? typeof createCustomHtmlElement<K, HTMLElementTagNameMap[K]> : typeof createEl<K>> =>
    srcComp.startsWith('rx-')
        ? createCustomHtmlElement(srcComp, config) as any
        : createEl(srcComp, config) as any

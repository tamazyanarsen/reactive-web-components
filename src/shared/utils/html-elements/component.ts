import { ComponentInitConfig, HtmlTagName } from "@shared/types"
import { createCustomHtmlElement } from "./custom-element"
import { BaseElement, createEl } from "./element"

export const createHtmlComponent = <K extends HtmlTagName>(srcComp: `${K} ${string}`,
    config?: ComponentInitConfig<HTMLElementTagNameMap[K]>):
    ReturnType<HTMLElementTagNameMap[K] extends BaseElement ? typeof createCustomHtmlElement<K, HTMLElementTagNameMap[K]> : typeof createEl<K>> =>
    srcComp.startsWith('rx-')
        ? createCustomHtmlElement(srcComp, config) as any
        : createEl(srcComp, config) as any

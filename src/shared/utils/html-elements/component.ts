import { HtmlTagName } from "@shared/types"
import { createCustomHtmlElement } from "./custom-element"
import { createEl } from "./element"

export const createTemplate = <K extends HtmlTagName>(srcComp: `${K} ${string}`):
    ReturnType<K extends `rx-${string}` ? typeof createCustomHtmlElement<K, HTMLElementTagNameMap[K]> : typeof createEl<K>> =>
    srcComp.startsWith('rx-')
        ? createCustomHtmlElement(srcComp) as any
        : createEl(srcComp) as any

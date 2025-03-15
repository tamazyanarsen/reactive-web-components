import { HtmlTagName } from "@shared/types"
import { createCustomEl } from "./custom-element"
import { createEl } from "./element"

export const createComponent = <K extends HtmlTagName>(srcComp: `${K} ${string}`):
    ReturnType<K extends `rx-${string}` ? typeof createCustomEl<K, HTMLElementTagNameMap[K]> : typeof createEl<K>> =>
    srcComp.startsWith('rx-')
        ? createCustomEl(srcComp) as any
        : createEl(srcComp) as any

import { HtmlTagName } from "@shared/types"
import { createCustomEl } from "./custom-element"
import { createEl } from "./element"

export const createComponent = <K extends HtmlTagName>(srcComp: `${K} ${string}`):
    K extends `rx-${string}` ? ReturnType<typeof createCustomEl<K, HTMLElementTagNameMap[K]>> : ReturnType<typeof createEl<K>> =>
    srcComp.startsWith('rx-')
        ? createCustomEl(srcComp) as any
        : createEl(srcComp) as any

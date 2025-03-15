import { HtmlTagName } from "@shared/types"
import { createCustomEl } from "./custom-element"
import { createEl } from "./element"

export const createComponent = <K extends HtmlTagName>(srcComp: `${K} ${string}`) => srcComp.startsWith('rx-')
    ? createCustomEl(srcComp)
    : createEl(srcComp)

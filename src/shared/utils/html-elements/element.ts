import { ComponentConfig, ExtraHTMLElement, HtmlTagName, SlotContext } from "../../types/element";
import { elementHelpers } from "./element-helper";

export const createElement = <K extends HtmlTagName>(tagName: K): ComponentConfig<HTMLElementTagNameMap[K]> => {
    const wrapper = document.createElement<K>(tagName)
    return {
        ...elementHelpers(wrapper),
        handleSlotContext(cb) {
            Reflect.defineProperty(wrapper, 'handleSlotContext', {
                get() {
                    return cb
                },
            })
            return this
        }
    }
}

export abstract class BaseElement extends HTMLElement {

    slotContext?: SlotContext

    rootStyle?: Promise<typeof import("*?raw")>

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    abstract render(): ComponentConfig
}

export interface BaseElementConstructor {
    new(...params: any[]): BaseElement;
}

export const isSlotTemplate = (item: Element): item is ExtraHTMLElement => 'handleSlotContext' in item

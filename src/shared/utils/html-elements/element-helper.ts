import { ComponentConfig, ExtraHTMLElement, HtmlTagName } from "../../types/element"
import { camelToKebab } from "../helpers"

export const eventEmitter = <EventValue = unknown>() => (_value: EventValue) => {}
export const addHtmlContent = <T extends HTMLElement = HTMLElement>(htmlElement: T, content: string, wrapperElement: HtmlTagName = 'div') => {
    const divWrapper = document.createElement(wrapperElement)
    divWrapper.innerHTML = content
    htmlElement.appendChild(divWrapper)
    return htmlElement
}

export const setHtmlContent = <T extends HTMLElement = HTMLElement>(htmlElement: T, content: string) => {
    htmlElement.innerHTML = content
    return htmlElement
}

export const elementHelpers = <T extends ExtraHTMLElement>(wrapper: T): ComponentConfig<T> => {
    return {
        append(...args) {
            args.forEach(element => {
                wrapper.appendChild(element.hostElement)
            });
            return this
        },
        addContent(content, wrapperElement = 'div') {
            addHtmlContent(wrapper, content, wrapperElement)
            return this
        },
        setContent(content) {
            setHtmlContent(wrapper, content)
            return this
        },
        addEventlistener(eventName, cb) {
            wrapper.addEventListener(eventName, cb)
            return this
        },
        setAttribute(attrName, value) {
            let newValue
            if (typeof value !== 'string') newValue = JSON.stringify(value)
            else newValue = value
            wrapper.setAttribute(camelToKebab(attrName), newValue)
            return this
        },
        addStyle(style) {
            // @ts-ignore
            Object.keys(style).forEach((cssKey: CssKey) => {
                // @ts-ignore
                wrapper.style[cssKey] = style[cssKey]
            })
            return this
        },
        handleSlotContext(_cb) {
            return this
        },
        addClass(className) {
            wrapper.classList.add(className)
            return this
        },
        hostElement: wrapper
    }
}
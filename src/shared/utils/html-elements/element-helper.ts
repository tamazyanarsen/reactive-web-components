import { ComponentConfig, ExtraHTMLElement, HtmlTagName } from "../../types/element"
import { camelToKebab } from "../helpers"
import { effect } from "./signal"

export const eventEmitter = <EventValue = unknown>() => (_value: EventValue) => { }
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
    addEventlistener<K extends keyof HTMLElementEventMap>(eventName: K | string, cb: EventListener) {
      wrapper.addEventListener(eventName, cb)
      return this
    },
    setAttribute<AttrName extends keyof T & string, AttrValue = unknown>(attrName: AttrName | string, value: AttrValue) {
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
    handleSlotContext(cb) {
      Reflect.defineProperty(wrapper, 'handleSlotContext', {
        get() {
          return cb
        },
      })
      return this
    },
    addClass(...className) {
      wrapper.classList.add(...className)
      return this
    },
    removeClass(...className) {
      wrapper.classList.remove(...className)
      return this
    },
    replaceClass(oldClass, newClass) {
      wrapper.classList.replace(oldClass, newClass)
      return this
    },
    addEffect(cb) {
      effect(() => cb(this, this.hostElement))
      return this
    },
    hostElement: wrapper
  }
}

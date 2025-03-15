import { ReactiveSignal } from "@shared/types"
import { ComponentConfig, ComponentContent, ComponentInitConfig, CustomComponentConfig, ExtraHTMLElement, HtmlTagName } from "../../types/element"
import { camelToKebab } from "../helpers"
import { effect, isReactiveSignal } from "./signal"

export const eventEmitter = () => () => {}
export const addHtmlContent = <T extends HTMLElement = HTMLElement>(htmlElement: T, content: string | unknown, wrapperElement: HtmlTagName = 'div') => {
  const divWrapper = document.createElement(wrapperElement)
  setHtmlContent(divWrapper, content)
  htmlElement.appendChild(divWrapper)
  return htmlElement
}

export const setHtmlContent = <T extends HTMLElement = HTMLElement>(htmlElement: T, content: string | unknown) => {
  htmlElement.innerHTML = typeof content === 'string' ? content : JSON.stringify(content)
  return htmlElement
}

export const htmlEffectWrapper = (content: ReactiveSignal<unknown>): HTMLDivElement => {
  const htmlDiv = document.createElement('div')
  effect(() => {
    const data = content()
    setHtmlContent(htmlDiv, data)
    // htmlDiv.innerHTML = typeof data === 'string' ? data : JSON.stringify(data)
  })
  return htmlDiv
}

export const elementHelpers = <T extends ExtraHTMLElement>(wrapper: T): ComponentConfig<T> => {
  return {
    append(...args) {
      args.forEach(element => {
        wrapper.appendChild(element.hostElement)
      });
      return this
    },
    set(...args) {
      this.clear();
      args.forEach(element => {
        wrapper.appendChild(element.hostElement)
      });
      return this
    },
    removeChild(...args) {
      args.forEach(node => {
        if (Array.from(wrapper.childNodes.values()).some(child => child === node.hostElement))
          wrapper.removeChild(node.hostElement)
      })
      return this
    },
    addHtmlContent(content, wrapperElement = 'div') {
      addHtmlContent(wrapper, content, wrapperElement)
      return this
    },
    setHtmlContent(content) {
      setHtmlContent(wrapper, content)
      return this
    },
    addEventlistener(
      eventName: string,
      cb: any
    ) {
      wrapper.addEventListener(eventName, e => cb(e, this, wrapper))
      return this
    },
    setAttribute(attrName, value) {
      let newValue
      if (typeof value !== 'string') newValue = JSON.stringify(value)
      else newValue = value
      wrapper.setAttribute(camelToKebab(attrName as string), newValue)
      return this
    },
    setCustomAttribute(attrName, value) {
      let newValue
      if (typeof value !== 'string') newValue = JSON.stringify(value)
      else newValue = value
      wrapper.setAttribute(camelToKebab(attrName as string), newValue)
      return this
    },
    setReactiveAttribute(attrName, valueSignal) {
      effect(() => this.setAttribute(attrName, valueSignal()))
      return this
    },
    setReactiveCustomAttribute(attrName, valueSignal) {
      effect(() => this.setCustomAttribute(attrName, valueSignal()))
      return this
    },
    removeAttribute(attrName) {
      wrapper.removeAttribute(camelToKebab(attrName))
      return this
    },
    addStyle(style) {
      // @ts-expect-error index string
      Object.keys(style).forEach((cssKey: CssKey) => {
        // @ts-expect-error index string
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
    addReactiveClass(classConfig) {
      Object.keys(classConfig).forEach(className => {
        effect(() => {
          const classSignal = classConfig[className]();
          if (classSignal) {
            this.addClass(className)
          } else {
            this.removeClass(className)
          }
        })
      });
      return this;
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
    addReactiveContent(content) {
      wrapper.appendChild(htmlEffectWrapper(content))
      return this;
    },
    setReactiveContent(content) {
      this.clear();
      wrapper.appendChild(htmlEffectWrapper(content))
      return this
    },
    clear() {
      wrapper.innerHTML = '';
      return this;
    },
    hostElement: wrapper
  }
}

export const initComponent = <T extends ExtraHTMLElement, K extends ComponentConfig<T> | CustomComponentConfig<T>>(
  component: K, config?: ComponentInitConfig<T>) => {
  addClassList(component, config?.classList || [])
  addAttributeList(component, config?.attributes)
  return component
}

export const addClassList = <T extends ExtraHTMLElement>(comp: ComponentConfig<T>, classList: ComponentInitConfig<T>['classList']) => comp.addClass(...(classList || []))
export const addReactiveClassList = <T extends ExtraHTMLElement>(comp: ComponentConfig<T>, classList: ComponentInitConfig<T>['reactiveClassList']) => comp.addReactiveClass(classList || {})

export const addAttributeList = <T extends ExtraHTMLElement>
  (comp: ComponentConfig<T>, attributeList: ComponentInitConfig<T>['attributes']) => {
  const attrObject = attributeList
  if (attrObject) {
    Object.keys(attrObject).forEach(attrName => {
      // @ts-expect-error string index
      if (isReactiveSignal(attrObject[attrName])) {
        // @ts-expect-error string index
        comp.setReactiveAttribute(attrName, attrObject[attrName])
      } else {
        // @ts-expect-error string index
        comp.setAttribute(attrName, attrObject[attrName])
      }
    })
  }
}

export const appendContentItem = <T extends ExtraHTMLElement>(comp: ComponentConfig<T>, ...items: ComponentContent[]) => {
  items.forEach(item => {
    if (typeof item === 'string') comp.addHtmlContent(item)
    else if (isReactiveSignal(item)) { comp.addReactiveContent(item) }
    else comp.append(item)
  })
  return comp
}
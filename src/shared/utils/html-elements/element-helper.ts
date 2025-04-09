import { ReactiveSignal } from "@shared/types"
import { AttributeValue, AttrSignal, ComponentConfig, ComponentContent, ComponentInitConfig, CustomComponentConfig, ExtraHTMLElement } from "../../types/element"
import { camelToKebab } from "../helpers"
import { effect, isReactiveSignal } from "./signal"

export const eventEmitter = () => () => { }
export const addHtmlContent = <T extends HTMLElement = HTMLElement>(htmlElement: T, content: string | unknown) => {
  const contentWrapper: Text = new Text(typeof content === 'string' ? content : JSON.stringify(content))
  htmlElement.appendChild(contentWrapper)
  return htmlElement
}

export const setHtmlContent = <T extends HTMLElement = HTMLElement>(htmlElement: T, content: string | unknown) => {
  htmlElement.innerHTML = typeof content === 'string' ? content : JSON.stringify(content)
  return htmlElement
}

export const htmlEffectWrapper = (content: ReactiveSignal<unknown>): HTMLDivElement => {
  const htmlDiv = document.createElement('div')
  htmlDiv.style.display = 'flex'
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
    addHtmlContent(content) {
      addHtmlContent(wrapper, content)
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
      className.forEach(cls => {
        if (typeof cls === 'string') {
          wrapper.classList.add(...cls.split(' '))
        }
        else {
          (() => {
            let oldClassName = '_';
            (() => {
              this.addEffect(() => {
                this.removeClass(oldClassName)
                const currentClassName = cls()
                if (currentClassName.length > 0) {
                  oldClassName = currentClassName;
                  this.addClass(oldClassName)
                }
              })
            })()
          })()
        }
      })
      return this
    },
    setClass(...className) {
      wrapper.classList.remove(...wrapper.classList);
      wrapper.classList.add(...className);
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
  addReactiveClassList(component, config?.reactiveClassList)
  addCustomAttributes(component, config?.customAttributes)
  setChildren(component, config?.children)
  return component
}

export const setChildren = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  children: ComponentInitConfig<T>['children']
) => appendContentItem(comp, ...(children || []))

export const addCustomAttributes = <T extends ExtraHTMLElement>
  (comp: ComponentConfig<T>, attributeList: ComponentInitConfig<T>['customAttributes']) => {
  const attrObject = attributeList
  if (attrObject) {
    Object.keys(attrObject).forEach(attrName => {
      if (isReactiveSignal(attrObject[attrName])) {
        comp.setReactiveCustomAttribute(attrName, attrObject[attrName])
      } else {
        comp.setCustomAttribute(attrName, attrObject[attrName])
      }
    })
  }
}

export const addClassList = <T extends ExtraHTMLElement>(comp: ComponentConfig<T>, classList: ComponentInitConfig<T>['classList']) => comp.addClass(...(classList || []))
export const addReactiveClassList = <T extends ExtraHTMLElement>(comp: ComponentConfig<T>, classList: ComponentInitConfig<T>['reactiveClassList']) => comp.addReactiveClass(classList || {})

export const addAttributeList = <T extends ExtraHTMLElement>
  (comp: ComponentConfig<T>, attributeList: ComponentInitConfig<T>['attributes']) => {
  const attrObject = attributeList
  const addAttribute = (
    attrName: keyof ComponentInitConfig<T>['attributes'],
    attrValue?: AttributeValue<T, AttrSignal<T>>
  ) => {
    if (!attrValue) return;
    if (isReactiveSignal(attrValue)) {
      comp.setReactiveAttribute(attrName as AttrSignal<T>, attrValue)
    } else if (typeof attrValue === 'function') {
      comp.addEffect(() => {
        comp.setAttribute(attrName, (attrValue as any)())
      })
    } else {
      comp.setAttribute(attrName, attrValue as any)
    }
  }
  if (attrObject) {
    // @ts-expect-error error
    Object.keys(attrObject).forEach(<K extends keyof ComponentInitConfig<T>['attributes']>(attrName: K) => {
      addAttribute(attrName, attrObject[attrName])
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

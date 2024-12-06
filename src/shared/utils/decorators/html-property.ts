import { ComponentConfig, EventEmitter } from '../../types/element';
import { camelToKebab, checkCall, log, kebabToCamel } from '../helpers';
import { BaseElementConstructor, isSlotTemplate } from '../html-elements/element';

const eventFieldName = 'eventProps'
const observedAttrFieldName = 'observedAttributes'

export const property = (): <T extends HTMLElement, K extends keyof T>(target: T, propName: K) => void => (target, propName) => {
  if (!Reflect.get(target, observedAttrFieldName)) {
    Reflect.defineProperty(target, observedAttrFieldName, {
      value: []
    })
  }
  (Reflect.get(target, observedAttrFieldName) as string[]).push(camelToKebab(propName as string))
}

export const event = (): <T extends HTMLElement, K extends keyof T>(target: T, propName: K) => void => (target, propName) => {
  if (!Reflect.get(target, eventFieldName)) {
    Reflect.defineProperty(target, eventFieldName, {
      value: []
    })
  }
  (Reflect.get(target, eventFieldName) as string[]).push(propName as string)
}

export const component = (selector: string): <T extends BaseElementConstructor>(target: T) => T => {
  return target => {
    console.log(target.name, 'start register static attr', target.prototype[observedAttrFieldName])
    class NewClass extends target {
      static observedAttributes = target.prototype[observedAttrFieldName] ?? []

      constructor(...params: any[]) {
        super(...params)
        // @ts-ignore
        console.log('observedAttrFieldName', this[observedAttrFieldName], target.prototype[observedAttrFieldName])
      }

      render(): ComponentConfig {
        return target.prototype.render.call(this)
      }

      attributeChangedCallback(attrName: string, oldValue: string, newValue: string) {
        log(`%c${target.name}%c`, `Attribute %c${attrName}%c has changed.`, `oldValue: ${oldValue}, newValue: ${newValue}`);
        try {
          newValue = JSON.parse(newValue)
        } catch {
        }
        // @ts-ignore
        this[kebabToCamel(attrName)].set(newValue);
        checkCall(this, target.prototype.attributeChangedCallback)
      }

      connectedCallback() {
        (target.prototype[eventFieldName] as string[] | undefined)?.forEach(fieldName => {
          // @ts-ignore
          const oldEventObj = this[fieldName] as EventEmitter
          // @ts-ignore
          this[fieldName] = (value: unknown) => {
            console.log('start emit value', value)
            this.dispatchEvent(new CustomEvent(fieldName, { detail: value }))
          }
        });
        console.log('start render', target.name, selector)

        if (this.rootStyle) {
          this.rootStyle.then(v => {
            const sheet = new CSSStyleSheet()
            sheet.replaceSync(v.default)
            this.shadowRoot?.adoptedStyleSheets.push(sheet)
          })
        }

        // @ts-ignore
        this.shadowRoot?.appendChild((this.render() as ComponentConfig).hostElement)
        checkCall(this, target.prototype.connectedCallback)

        if (this.slotContext) {
          this.shadowRoot?.querySelectorAll('slot').forEach(slotEl => {
            console.log(this.slotContext, this.slotContext && this.slotContext[slotEl.name])
            this.querySelectorAll(`[slot="${slotEl.name}"]`).forEach(slotItem => {
              if (isSlotTemplate(slotItem) && slotItem.handleSlotContext && this.slotContext) {
                slotItem.handleSlotContext(this.slotContext[slotEl.name])
              }
            })
          })
        }
      }

      disconnectedCallback() {
        checkCall(this, target.prototype.disconnectedCallback)
      }
    }

    if (!customElements.get(selector)) {
      customElements.define(selector, NewClass)
    } else {
      console.error(`название тега ${selector} повторяется, компонент ${target.name} не зарегистрирован`)
    }
    return NewClass
  }
}

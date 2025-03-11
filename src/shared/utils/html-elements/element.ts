import { ReactiveSignal } from "@shared/types";
import { ComponentConfig, ComponentContent, ComponentInitConfig, ExtraHTMLElement, HtmlTagName, SignalValue, SlotContext } from "../../types/element";
import { elementHelpers, initComponent } from "./element-helper";

export const createElement = <K extends HtmlTagName>(tagName: K, config?: ComponentInitConfig<HTMLElementTagNameMap[K]>): ComponentConfig<HTMLElementTagNameMap[K]> => {
  const wrapper = document.createElement<K>(tagName)
  const component = {
    ...elementHelpers(wrapper)
  }
  return initComponent(component, config)
}

export const appendContentItem = <T extends ExtraHTMLElement>(comp: ComponentConfig<T>, ...items: ComponentContent[]) => {
  items.forEach(item => {
    if (typeof item === 'string') comp.addHtmlContent(item)
    else comp.append(item)
  })
  return comp
}

export const createEl = <K extends HtmlTagName>(tagName: `${K} ${string}` | K, config?: ComponentInitConfig<HTMLElementTagNameMap[K]>) => {
  const classList = tagName.split(' ').slice(1).map(e => e.trim())
  const comp = createElement(tagName.split(' ')[0] as K, config)
  comp.addClass(...classList)
  return (
    ...content: ComponentContent[]
  ): ComponentConfig<HTMLElementTagNameMap[K]> => {
    content.forEach(item => appendContentItem(comp, item));
    return comp
  }
}

// export const getSignalContent = <T>(src: ReactiveSignal<T>,
//   cb: (item: T) => ComponentContent | ComponentContent[]): ComponentContent => createElement('div')
//     .addEffect(self => {
//       const signalContent = cb(src())
//       const newContent: ComponentContent[] = []
//       if (Array.isArray(signalContent)) { newContent.push(...signalContent) }
//       else { newContent.push(signalContent) }
//       appendContentItem(self, ...newContent)
//     })

export const getSignalContent = <R extends ReactiveSignal<any>>(src: R,
  cb: (item: SignalValue<R>) => ComponentContent | ComponentContent[]): ComponentContent => createElement('div')
    .addEffect(self => {
      const signalContent = cb(src())
      const newContent: ComponentContent[] = []
      if (Array.isArray(signalContent)) { newContent.push(...signalContent) }
      else { newContent.push(signalContent) }
      self.clear()
      appendContentItem(self, ...newContent)
    })

export abstract class BaseElement extends HTMLElement {

  slotContext?: SlotContext

  protected rootStyle?: Promise<typeof import("*?inline")> | Array<Promise<typeof import("*?inline")>>

  protected modelValue?: ReactiveSignal<unknown>

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  abstract render(): ComponentConfig

  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>) {
    this.modelValue = value
  }
}

export interface BaseElementConstructor {
  new(...params: any[]): BaseElement;
}

export const isSlotTemplate = (item: Element): item is ExtraHTMLElement => 'handleSlotContext' in item

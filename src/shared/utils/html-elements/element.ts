import { ReactiveSignal } from "@shared/types";
import { ComponentConfig, ComponentContent, ComponentInitConfig, ExtraHTMLElement, HtmlTagName, SignalValue, SlotContext } from "../../types/element";
import { appendContentItem, elementHelpers, initComponent } from "./element-helper";
import { isReactiveSignal } from "@shared/index";

export const createElement = <K extends HtmlTagName>(
  tagName: K,
  config?: ComponentInitConfig<HTMLElementTagNameMap[K]>
): ComponentConfig<HTMLElementTagNameMap[K]> => {
  const wrapper = document.createElement<K>(tagName)
  const component = {
    ...elementHelpers(wrapper),
  }
  return initComponent(component, config)
}

export const createEl:
  <K extends HtmlTagName>(
    tagName: `${K} ${string}` | K,
    config?: ComponentInitConfig<HTMLElementTagNameMap[K]>
  ) => (...content: ComponentContent[]) => ComponentConfig<HTMLElementTagNameMap[K]> = <K extends HtmlTagName>(
    tagName: `${K} ${string}` | K,
    config?: ComponentInitConfig<HTMLElementTagNameMap[K]>
  ): (...content: ComponentContent[]) => ComponentConfig<HTMLElementTagNameMap[K]> => {
    const classList = tagName.split(' ').slice(1).map(e => e.trim())
    const comp = createElement<K>(tagName.split(' ')[0] as K, config)
    if (Array.isArray(classList) && classList.length > 0) { comp.addClass(...classList) }
    return (
      ...content: ComponentContent[]
    ): ComponentConfig<HTMLElementTagNameMap[K]> => {
      return appendContentItem(comp, ...content.filter(Boolean))
    }
  }

export const getSignalContent = <R extends ReactiveSignal<any>>(src: R,
  cb: (item: SignalValue<R>) => ComponentContent | ComponentContent[]) => createElement('div')
    .addEffect(self => {
      const signalContent = cb(src())
      const newContent: ComponentContent[] = []
      if (Array.isArray(signalContent)) { newContent.push(...signalContent) }
      else { newContent.push(signalContent) }
      self.clear()
      appendContentItem(self, ...newContent)
    })

export abstract class BaseElement extends HTMLElement {
  static observedAttributes: string[] = [];
  static renderTagName: string = ''

  slotContext?: SlotContext

  protected rootStyle?: Promise<typeof import("*?inline")> | Array<Promise<typeof import("*?inline")>>

  protected modelValue?: ReactiveSignal<unknown>

  shadow: ShadowRoot;

  constructor(isClosed = true) {
    super()
    this.shadow = this.attachShadow({ mode: isClosed ? 'closed' : 'open' })
  }

  abstract render(): ComponentConfig<any>

  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>) {
    this.modelValue = value
  }
}

export interface BaseElementConstructor {
  new(...params: any[]): BaseElement;
}

export type HtmlElementConstructor = new (...params: any[]) => HTMLElement

export const isSlotTemplate = (item: Element): item is ExtraHTMLElement => 'handleSlotContext' in item;

export const isBaseElement = (item: any): item is BaseElement => 'render' in item && 'setReactiveValue' in item

/**
 * Фабрика тегов с поддержкой всех HTML-элементов
 * Использует Proxy для автоматического создания обработчиков
 */
const tags = new Proxy({}, {
  get(_, tag: HtmlTagName) {
    return (config: ComponentInitConfig<HTMLElementTagNameMap[typeof tag]>, ...content: ComponentContent[]) => {
      return createEl(tag, config)(...content);
    };
  }
}) as {
    [key in keyof HTMLElementTagNameMap]: (config: ComponentInitConfig<HTMLElementTagNameMap[key]>, ...content: ComponentContent[]) => ComponentConfig<HTMLElementTagNameMap[key]>
  };

/**
 * Экспорт всех стандартных HTML-тегов
 * Полный список согласно спецификации HTML5
 */
export const {
  a, abbr, address, area, article, aside, audio, b, base, bdi, bdo, blockquote,
  body, br, button, canvas, caption, cite, code, col, colgroup, data, datalist,
  dd, del, details, dfn, dialog, div, dl, dt, em, embed, fieldset, figcaption,
  figure, footer, form, h1, h2, h3, h4, h5, h6, head, header, hgroup, hr, html,
  i, iframe, img, input, ins, kbd, label, legend, li, link, main, map, mark,
  menu, meta, meter, nav, noscript, object, ol, optgroup, option,
  output, p, picture, pre, progress, q, rp, rt, ruby, s, samp, script,
  section, select, slot, small, source, span, strong, style, sub, summary, sup,
  table, tbody, td, template, textarea, tfoot, th, thead, time, title, tr, track,
  u, ul, video, wbr
} = tags;

type ClassListResult = {
  classList: (string | (() => string))[];
};

export const classList = (template: TemplateStringsArray, ...values: any[]): ClassListResult => {
  const combinedString = String.raw(template, ...values.filter(e => typeof e !== 'function'));
  const classArray = combinedString.split(' ').filter(className => className.trim() !== '');

  return {
    classList: [...classArray, ...values.filter(e => typeof e === 'function')]
  };
};
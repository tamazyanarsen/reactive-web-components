import { ComponentContent, ComponentInitConfig, CustomComponentConfig, HtmlTagName } from "../../types/element";
import { BaseElement, BaseElementConstructor } from "./element";
import { appendContentItem, elementHelpers, initComponent } from "./element-helper";

export const createCustomElement = <T extends HTMLElement>(
  tagName: string, config?: ComponentInitConfig<T>
): CustomComponentConfig<T> => {
  const wrapper = document.createElement(tagName) as T;
  const component: CustomComponentConfig<T> = {
    ...elementHelpers(wrapper),
    setReactiveValue(value) {
      if (wrapper instanceof BaseElement) wrapper.setReactiveValue(value);
      return this;
    }
  };
  return initComponent(component, config)
};

// для создания кастомных компонентов, которые объявлены в интерфейсе HTMLElementTagNameMap
export const createCustomHtmlElement = <K extends HtmlTagName, T extends HTMLElementTagNameMap[K]>(
  tagName: `${K} ${string}`,
  config?: ComponentInitConfig<T>
) => {
  const classList = tagName.split(' ').slice(1).map(e => e.trim())
  const comp = createCustomElement<T>(tagName.split(' ')[0] as K, config)
  if (Array.isArray(classList) && classList.length > 0) { comp.addClass(...classList) }
  return (
    ...content: ComponentContent[]
  ) => {
    content.filter(Boolean).forEach(item => appendContentItem(comp, item));
    return comp
  }
}

export const createCustomEl = <T extends BaseElement>(
  tagName: string,
  config?: ComponentInitConfig<T>
) => {
  const classList = tagName.split(' ').slice(1).map(e => e.trim())
  const comp = createCustomElement<T>(tagName.split(' ')[0], config)
  if (Array.isArray(classList) && classList.length > 0) { comp.addClass(...classList) }
  return (
    ...content: ComponentContent[]
  ) => {
    content.filter(Boolean).forEach(item => appendContentItem(comp, item));
    return comp
  }
}

export const createComponent = <T extends BaseElementConstructor>(
  srcComp: T,
  classList: string,
  config?: ComponentInitConfig<T extends BaseElementConstructor
    ? InstanceType<T>
    : T extends HtmlTagName ? HTMLElementTagNameMap[T] : never>
) => {
  // @ts-expect-error error
  return createCustomEl(`${srcComp.renderTagName}${classList ? ' ' + classList : ''}`, config)
}

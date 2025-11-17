import {
  ChildrenContent,
  ComponentConfig,
  ComponentInitConfig,
  CustomComponentConfig,
  EventEmitter,
  isComponentConfig,
  isComponentInitConfig,
  SlotTemplate
} from "../../types/element";
import { colorLog, projectLog } from "../helpers";
import { isReactiveSignal } from "../signal";
import { BaseElement, BaseElementConstructor } from "./base-element";
import { getSignalContent } from "./element";
import {
  appendContentItem,
  elementHelpers,
  initComponent,
} from "./element-helper";

export const createCustomElement = <T extends BaseElement>(
  tagName: string,
  config?: ComponentInitConfig<T>,
): CustomComponentConfig<T> => {
  projectLog("createCustomElement", tagName);
  const wrapper = document.createElement(tagName) as T;
  const component: CustomComponentConfig<T> = {
    ...elementHelpers(wrapper),
    setReactiveValue(value) {
      if (wrapper instanceof BaseElement) wrapper.setReactiveValue(value);
      return this;
    },
    setSlotTemplate(templateConfig) {
      const wrapperSlotTemplate = wrapper.slotTemplate;
      if (wrapperSlotTemplate) {
        Object.entries(templateConfig).forEach(([slotKey, slotTmpl]) => {
          wrapperSlotTemplate[slotKey] =
            slotTmpl as SlotTemplate[typeof slotKey];
        });
      }
      return this;
    },
  };
  return initComponent(component, config);
};

// для создания кастомных компонентов, которые объявлены в интерфейсе HTMLElementTagNameMap
// export const createCustomHtmlElement = <K extends HtmlTagName, T extends HTMLElementTagNameMap[K] & ExtraHTMLElement>(
//   tagName: `${K} ${string}`,
//   config?: ComponentInitConfig<T>
// ) => {
//   const classList = tagName.split(' ').slice(1).map(e => e.trim())
//   const comp = createCustomElement<T>(tagName.split(' ')[0] as K, config)
//   if (Array.isArray(classList) && classList.length > 0) { comp.addClass(...classList) }
//   return (
//     ...content: ComponentContent[]
//   ) => {
//     return appendContentItem(comp, ...content.filter(Boolean))
//   }
// }

export const createCustomEl = <T extends BaseElement>(
  tagName: string,
  config?: ComponentInitConfig<T>,
) => {
  const classList = tagName
    .split(" ")
    .slice(1)
    .map((e) => e.trim());
  const comp = createCustomElement<T>(tagName.split(" ")[0], config);
  if (Array.isArray(classList) && classList.length > 0) {
    comp.addClass(...classList);
  }
  return (...content: ChildrenContent<T>[]) => {
    colorLog("@rcreateCustomEl content", tagName, content);
    const newContent = content
      .filter(Boolean)
      .flatMap((e) =>
        typeof e === "function" && !isReactiveSignal(e)
          ? getSignalContent(() => e(comp))
          : e,
      );

    comp.hostElement.allSlotContent = newContent;

    comp.hostElement.slotContent = newContent.filter(isComponentConfig).reduce(
      (acc, item) => {
        const currSlotName = item.hostElement.getAttribute("slot") || "default";
        if (!acc[currSlotName]) {
          acc[currSlotName] = [];
        }
        acc[currSlotName].push(item);
        return acc;
      },
      {} as Record<string, ComponentConfig<any>[]>,
    );

    comp.hostElement.appendAllSlotContent = () => {
      return appendContentItem(comp, ...newContent);
    };

    return comp;
    // return appendContentItem(comp, ...content.filter(Boolean))
  };
};

export const createCustom = <
  T extends BaseElementConstructor,
  K extends string | ComponentInitConfig<InstanceType<T>>,
>(
  srcComp: T,
  classList?: K,
  config?: K extends string ? ComponentInitConfig<InstanceType<T>> : never,
) => {
  return createCustomEl(
    `${srcComp.renderTagName}${classList && typeof classList === "string" ? " " + classList : ""}`,
    isComponentInitConfig(classList)
      ? classList
      : classList && typeof classList === "string"
        ? config
        : undefined,
  );
};

export const customEl = <
  T extends BaseElementConstructor,
  K extends string | ComponentInitConfig<InstanceType<T>>,
>(
  srcComp: T,
  classList?: K,
  config?: K extends string ? ComponentInitConfig<InstanceType<T>> : never,
) => {
  const result = createCustom(srcComp, classList, config);
  return Object.assign(result, result());
};

export const newEventEmitter: <T = void>() => EventEmitter<T> = () => {
  const resultFunc = () => { };
  resultFunc.oldValue = null;
  return resultFunc;
};

export const defineSlotTemplate = <S extends SlotTemplate>(): Partial<S> =>
  ({}) as Partial<S>;


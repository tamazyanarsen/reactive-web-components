import {
  AttributeValue,
  AttrSignal,
  ComponentConfig,
  ComponentContent,
  ComponentInitConfig,
  ConfigAttribute,
  ConfigChildren,
  ConfigClassList,
  ConfigCustomAttribute,
  ConfigEffect,
  ConfigListeners,
  ConfigReactiveClassList,
  ConfigStyle,
  CustomComponentConfig,
  ExtraHTMLElement,
} from "../../types/element";
import { isReactiveSignal } from "../signal";
import { CustomHtmlComponentConfig, HtmlComponentConfig } from "./create-component-config";

export const eventEmitter = () => () => { };

export const customElementHelpers = <T extends ExtraHTMLElement>(
  wrapper: T,
): CustomComponentConfig<T> => {
  return new CustomHtmlComponentConfig(wrapper);
};

export const elementHelpers = <T extends ExtraHTMLElement>(
  wrapper: T,
): ComponentConfig<T> => new HtmlComponentConfig(wrapper);

export const classList = (
  strings: TemplateStringsArray,
  ...args: (string | (() => string))[]
) => {
  return {
    classList: [...strings.map((e) => e.trim()).filter(Boolean), ...args],
  };
};

export const cls = (
  strings: TemplateStringsArray,
  ...values: (string | (() => string))[]
): ReturnType<typeof classList> => classList(strings, ...values);

export const initComponent = <
  T extends ExtraHTMLElement,
  K extends ComponentConfig<T> | CustomComponentConfig<T>,
>(
  currComponent: WeakRef<K>,
  config?: ComponentInitConfig<T>,
) => {
  if (!config || !currComponent.deref()) return;

  const additionalFields = Object.keys(config || {}).filter(
    (key) => key.startsWith(".") || key.startsWith("@") || key.startsWith("$"),
  );

  additionalFields
    .filter((key) => key.startsWith("."))
    .forEach((key) => {
      if (!config?.attributes) config.attributes = {};
      config.attributes[key.slice(1) as AttrSignal<T>] = config[
        key as keyof ComponentInitConfig<T>
      ] as AttributeValue<T, AttrSignal<T>>;
    });

  additionalFields
    .filter((key) => key.startsWith("@"))
    .forEach((key: string) => {
      if (!config?.listeners) config.listeners = {};
      // Безопасно преобразуем к строковому типу, так как мы знаем, что ключи фильтруются по префиксу '@'
      const eventKey = key.slice(1) as keyof ConfigListeners<T>;
      config.listeners[eventKey] = config[
        key as keyof ComponentInitConfig<T>
      ] as any;
    });

  additionalFields
    .filter((key) => key.startsWith("$"))
    .forEach((key: string) => {
      if (!config?.effects) config.effects = [];
      config.effects.push(config[key as keyof ComponentInitConfig<T>] as any);
    });

  const component = currComponent.deref()
  if (!component) return;

  addClassList(component, config.classList);
  addStyleList(component, config.style);
  addAttributeList(component, config.attributes);
  addReactiveClassList(component, config.reactiveClassList);
  addCustomAttributes(component, config.customAttributes);
  setChildren(component, config.children);
  setEffects(component, config.effects);
  setListeners(component, config.listeners);
  setListeners(component, config.customListeners);

  return component;
};

export const setListeners = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  listeners?: ConfigListeners<T>,
) => {
  if (!listeners) return;
  Object.entries(listeners).forEach(([eventName, handler]) => {
    if (typeof handler === "function") {
      comp.addEventlistener(eventName as any, handler as any);
    }
  });
};

export const setEffects = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  effects?: ConfigEffect<T>,
) => effects?.forEach((effectFn) => comp.addEffect(effectFn));

export const setChildren = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  children?: ConfigChildren,
) => {
  return appendContentItem(new WeakRef(comp), ...(children || [])) ?? comp
};

export const addCustomAttributes = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  attributeList?: ConfigCustomAttribute,
) => {
  const attrObject = attributeList;
  if (attrObject) {
    Object.keys(attrObject).forEach((attrName) => {
      if (isReactiveSignal(attrObject[attrName])) {
        comp.setReactiveCustomAttribute(attrName, attrObject[attrName]);
      } else if (typeof attrObject[attrName] === "function") {
        comp.addEffect(() => {
          comp.setCustomAttribute(attrName, (attrObject[attrName] as any)());
        });
      } else {
        comp.setCustomAttribute(attrName, attrObject[attrName]);
      }
    });
  }
};

export const addClassList = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  classList?: ConfigClassList,
) => comp.addClass(...(classList || []));
export const addReactiveClassList = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  classList?: ConfigReactiveClassList,
) => comp.addReactiveClass(classList || {});

export const addStyleList = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  styleList?: ConfigStyle,
) => comp.addStyle(styleList || {});

export const addAttributeList = <T extends ExtraHTMLElement>(
  comp: ComponentConfig<T>,
  attributeList?: ConfigAttribute<T>,
) => {
  const attrObject = attributeList;
  const addAttribute = (
    attrName: AttrSignal<T>,
    attrValue?: AttributeValue<T, AttrSignal<T>>,
  ) => {
    if (!attrValue) return;
    if (isReactiveSignal(attrValue)) {
      comp.setReactiveAttribute(attrName as AttrSignal<T>, attrValue);
    } else if (typeof attrValue === "function") {
      comp.addEffect(() => {
        comp.setAttribute(attrName, (attrValue as any)());
      });
    } else {
      comp.setAttribute(attrName, attrValue as any);
    }
  };
  if (attrObject) {
    // @ts-expect-error error
    Object.keys(attrObject).forEach(<K extends AttrSignal<T>>(attrName: K) => {
      addAttribute(attrName, attrObject[attrName]);
    });
  }
};

export const appendContentItem = <
  T extends ExtraHTMLElement,
  Component extends ComponentConfig<T> | CustomComponentConfig<T>,
>(
  component: WeakRef<Component>,
  ...items: ComponentContent[]
) => {
  const comp = component.deref()
  if (!comp) return;
  items.forEach((item) => {
    // если условия объединить, то ломается типизация для последнего условия
    if (typeof item === "string") {
      if (item.trim().length > 0) comp.addHtmlContent(item);
    } else if (isReactiveSignal(item)) {
      comp.addReactiveContent(item);
    } else comp.append(item);
  });
  return comp;
};

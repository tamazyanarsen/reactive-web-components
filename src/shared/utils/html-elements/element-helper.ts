import { ON_CONNECTED_NAME } from "@shared/constants/constants";
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
import { camelToKebab } from "../helpers";
import { effect, isReactiveSignal, ReactiveSignal } from "../signal";
import { BaseElement } from "./base-element";

export const eventEmitter = () => () => { };

export const getTextContent = (content: string | unknown) => typeof content === "string" ? content : JSON.stringify(content);

export const textContentWrapper = (content: string | unknown) => {
  const container = document.createElement('span');
  container.textContent = getTextContent(content);
  return container;
};

export const addHtmlContent = <T extends HTMLElement = HTMLElement>(
  htmlElement: T,
  content: string | unknown,
) => {
  htmlElement.appendChild(textContentWrapper(content));
  return htmlElement;
};

export const setHtmlContent = <T extends HTMLElement = HTMLElement>(
  htmlElement: T,
  content: string | unknown,
) => {
  htmlElement.innerHTML = "";
  return addHtmlContent(htmlElement, content);
};

export const htmlEffectWrapper = (
  content: ReactiveSignal<unknown>,
): HTMLSpanElement => {
  const htmlSpan = document.createElement("span");
  effect(() => {
    const data = content();
    htmlSpan.textContent = getTextContent(data);
  });
  return htmlSpan;
};

export const elementHelpers = <T extends ExtraHTMLElement>(
  wrapper: T,
): ComponentConfig<T> => {
  return {
    append(...args) {
      args.forEach((element) => {
        wrapper.appendChild(element.hostElement);
        if (ON_CONNECTED_NAME in element.hostElement) {
          setTimeout(() => {
            (element.hostElement as unknown as ExtraHTMLElement).onConnected?.(
              element,
              element.hostElement,
            );
          });
        }
      });
      return this;
    },
    set(...args) {
      this.clear();
      const fragment = document.createDocumentFragment();
      args.forEach((element) => {
        fragment.appendChild(element.hostElement);
      });
      wrapper.appendChild(fragment);
      return this;
    },
    removeChild(...args) {
      args.forEach((node) => {
        if (
          Array.from(wrapper.childNodes.values()).some(
            (child) => child === node.hostElement,
          )
        )
          wrapper.removeChild(node.hostElement);
      });
      return this;
    },
    addHtmlContent(content) {
      addHtmlContent(wrapper, content);
      return this;
    },
    setHtmlContent(content) {
      setHtmlContent(wrapper, content);
      return this;
    },
    addEventlistener(
      eventName: string,
      cb: any,
      options: boolean | AddEventListenerOptions = false,
    ) {
      wrapper.addEventListener(eventName, (e) => cb(e, this, wrapper), options);
      return this;
    },
    setAttribute(attrName, value) {
      let newValue;
      if (typeof value === "boolean" && !(wrapper instanceof BaseElement)) {
        if (value) {
          newValue = "";
        } else {
          this.removeAttribute(attrName as keyof T & string);
          const attrNameLowerCase = attrName.toLowerCase();
          if (attrNameLowerCase in wrapper) {
            wrapper[attrNameLowerCase as keyof typeof wrapper] = null as any;
          }
          return this;
        }
      } else if (typeof value !== "string") newValue = JSON.stringify(value);
      else newValue = value;

      wrapper.setAttribute(camelToKebab(attrName as string), newValue);
      if (!(wrapper instanceof BaseElement)) {
        const attrNameLowerCase = attrName.toLowerCase();
        if (attrNameLowerCase in wrapper) {
          wrapper[attrNameLowerCase as keyof typeof wrapper] = value as any;
        }
      }
      return this;
    },
    setCustomAttribute(attrName, value) {
      let newValue;
      if (typeof value !== "string") newValue = JSON.stringify(value);
      else newValue = value;
      wrapper.setAttribute(camelToKebab(attrName as string), newValue);
      return this;
    },
    setReactiveAttribute(attrName, valueSignal) {
      effect(() => this.setAttribute(attrName, valueSignal()));
      return this;
    },
    setReactiveCustomAttribute(attrName, valueSignal) {
      effect(() => this.setCustomAttribute(attrName, valueSignal()));
      return this;
    },
    removeAttribute(attrName) {
      wrapper.removeAttribute(camelToKebab(attrName));
      return this;
    },
    addStyle(style) {
      Object.entries(style).forEach(([cssKey, value]) => {
        const isCustomProperty = cssKey.startsWith("--");

        if (typeof value === "function") {
          this.addEffect(() => {
            if (isCustomProperty) {
              // @ts-expect-error: value некорректно типизирован
              const cssValue = String(value() || "");
              wrapper.style.setProperty(cssKey, cssValue);
            } else {
              // @ts-expect-error index string
              wrapper.style[cssKey] = value();
            }
          });
        } else if (typeof value === "string") {
          if (isCustomProperty) {
            wrapper.style.setProperty(cssKey, value);
          } else {
            // @ts-expect-error index string
            wrapper.style[cssKey] = value;
          }
        }
      });
      return this;
    },
    onConnected(cb) {
      Reflect.defineProperty(wrapper, ON_CONNECTED_NAME, {
        get() {
          return cb;
        },
      });
      return this;
    },
    addClass(...className) {
      className.forEach((cls) => {
        if (typeof cls === "string") {
          wrapper.classList.add(
            ...cls
              .split(" ")
              .flatMap((e) => e.split("\n"))
              .map((e) => e.trim())
              .filter(Boolean),
          );
        } else {
          (() => {
            let oldClassName: string | null = null;
            (() => {
              this.addEffect(() => {
                const currentClassName = cls();
                if (currentClassName.length > 0) {
                  if (oldClassName) {
                    this.replaceClass(oldClassName, currentClassName);
                  } else {
                    this.addClass(currentClassName);
                  }
                  oldClassName = currentClassName;
                }
              });
            })();
          })();
        }
      });
      return this;
    },
    setClass(...className) {
      wrapper.classList.remove(...wrapper.classList);
      wrapper.classList.add(...className);
      return this;
    },
    addReactiveClass(classConfig) {
      Object.keys(classConfig).forEach((className) => {
        effect(() => {
          const classSignal = classConfig[className]();
          if (classSignal) {
            this.addClass(className);
          } else {
            this.removeClass(className);
          }
        });
      });
      return this;
    },
    removeClass(...className) {
      wrapper.classList.remove(...className);
      return this;
    },
    replaceClass(oldClass, newClass) {
      wrapper.classList.replace(oldClass, newClass);
      return this;
    },
    addEffect(cb) {
      effect(() => cb(this, this.hostElement));
      return this;
    },
    addReactiveContent(content) {
      wrapper.appendChild(htmlEffectWrapper(content));
      return this;
    },
    setReactiveContent(content) {
      this.clear();
      wrapper.appendChild(htmlEffectWrapper(content));
      return this;
    },
    clear() {
      wrapper.innerHTML = "";
      return this;
    },
    hostElement: wrapper,
  };
};

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
  component: K,
  config?: ComponentInitConfig<T>,
) => {
  if (!config) return component;

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
) => appendContentItem(comp, ...(children || []));

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
  comp: Component,
  ...items: ComponentContent[]
) => {
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

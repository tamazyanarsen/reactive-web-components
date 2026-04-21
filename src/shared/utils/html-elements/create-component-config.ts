import { ON_CONNECTED_NAME } from "@shared/constants/constants";
import {
  ComponentConfig,
  CustomComponentConfig,
  ExtraHTMLElement,
  SlotTemplate,
} from "@shared/types/element";
import { camelToKebab, projectLog } from "../helpers";
import { effect, type EffectCb, ReactiveSignal, removeEffect } from "../signal";
import { BaseElement } from "./base-element";

export const getTextContent = (content: string | unknown) =>
  typeof content === "string" ? content : JSON.stringify(content);

export const textContentWrapper = (content: string | unknown) => {
  const container = document.createElement("span");
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
  htmlElement.replaceChildren();
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

export class HtmlComponentConfig<
  T extends ExtraHTMLElement,
> implements ComponentConfig<T> {
  protected wrapper: WeakRef<T>;
  get hostElement() {
    return this.wrapper.deref();
  }

  private keyedEffects: Map<string | symbol, WeakRef<EffectCb>> = new Map();

  constructor(wrapper: WeakRef<T>) {
    this.wrapper = wrapper;
  }

  private findComponentEffect(): ((cb: () => void) => void) | undefined {
    let curr: HTMLElement | null | undefined = this.hostElement;
    while (curr && curr !== document.body) {
      if (
        "componentEffect" in curr &&
        typeof (curr as any).componentEffect === "function"
      ) {
        return (curr as any).componentEffect.bind(curr);
      }
      if (!curr.parentElement && curr.getRootNode() instanceof ShadowRoot) {
        curr = (curr.getRootNode() as ShadowRoot).host as HTMLElement;
      } else {
        curr = curr.parentElement;
      }
    }
  }

  private createEffect(cb: () => void, key?: string | symbol): void {
    const componentEffect = this.findComponentEffect();
    if (componentEffect) {
      componentEffect(cb);
    } else {
      (cb as any).component = this.wrapper;
      effect(cb, { name: key?.toString() || this.hostElement?.tagName });
    }
  }

  append: ComponentConfig<T>["append"] = (...args) => {
    args.forEach((element) => {
      const elValue = element.hostElement;
      if (!elValue) return;
      this.hostElement?.appendChild(elValue);
      if (ON_CONNECTED_NAME in elValue) {
        setTimeout(() => {
          (elValue as unknown as ExtraHTMLElement).onConnected?.(
            element,
            elValue,
          );
        });
      }
    });
    return this;
  };

  set: ComponentConfig<T>["set"] = (...args) => {
    this.clear();
    const fragment = document.createDocumentFragment();
    args.forEach((element) => {
      const elValue = element.hostElement;
      if (!elValue) return;
      fragment.appendChild(elValue);
    });
    this.hostElement?.appendChild(fragment);
    return this;
  };

  removeChild: ComponentConfig<T>["removeChild"] = (...args) => {
    args.forEach((node) => {
      if (
        Array.from(this.hostElement?.childNodes.values() || []).some(
          (child) => child === node.hostElement,
        )
      ) {
        const nodeHostValue = node.hostElement;
        if (nodeHostValue) {
          this.hostElement?.removeChild(nodeHostValue);
        }
      }
    });
    return this;
  };

  addHtmlContent: ComponentConfig<T>["addHtmlContent"] = (content) => {
    const wrapperValue = this.hostElement;
    if (!wrapperValue) return this;
    addHtmlContent(wrapperValue, content);
    return this;
  };

  setHtmlContent: ComponentConfig<T>["setHtmlContent"] = (content) => {
    const wrapperValue = this.hostElement;
    if (!wrapperValue) return this;
    setHtmlContent(wrapperValue, content);
    return this;
  };

  addEventlistener(
    eventName: string,
    cb: any,
    options: boolean | AddEventListenerOptions = false,
  ) {
    this.hostElement?.addEventListener(
      eventName,
      (e) => cb(e, this, this.hostElement),
      options,
    );
    return this;
  }

  setAttribute: ComponentConfig<T>["setAttribute"] = (attrName, value) => {
    projectLog("setAttribute", attrName, value);
    const wrapperValue = this.hostElement;
    if (!wrapperValue) return this;
    let newValue;
    if (
      (typeof value === "boolean" || value === null) &&
      !(wrapperValue instanceof BaseElement)
    ) {
      if (value) {
        newValue = "";
      } else {
        this.removeAttribute(attrName as keyof T & string);
        const attrNameLowerCase = attrName.toLowerCase();
        if (attrNameLowerCase in wrapperValue) {
          wrapperValue[attrNameLowerCase as keyof typeof wrapperValue] =
            null as any;
        }
        return this;
      }
    } else if (typeof value !== "string") newValue = JSON.stringify(value);
    else newValue = value;

    this.hostElement?.setAttribute(camelToKebab(attrName as string), newValue);
    if (!(wrapperValue instanceof BaseElement)) {
      const attrNameLowerCase = attrName.toLowerCase();
      if (attrNameLowerCase in wrapperValue) {
        wrapperValue[attrNameLowerCase as keyof typeof wrapperValue] =
          value as any;
      }
    }
    return this;
  };
  setCustomAttribute: ComponentConfig<T>["setCustomAttribute"] = (
    attrName,
    value,
  ) => {
    let newValue;
    if (typeof value !== "string") newValue = JSON.stringify(value);
    else newValue = value;
    this.hostElement?.setAttribute(camelToKebab(attrName as string), newValue);
    return this;
  };
  setReactiveAttribute: ComponentConfig<T>["setReactiveAttribute"] = (
    attrName,
    valueSignal,
  ) => {
    this.addEffect((self) => {
      projectLog("setReactiveAttribute effect", attrName, valueSignal);
      self.setAttribute(attrName, valueSignal());
    }, attrName);
    return this;
  };
  setReactiveCustomAttribute: ComponentConfig<T>["setReactiveCustomAttribute"] =
    (attrName, valueSignal) => {
      this.addEffect((self) => {
        self.setCustomAttribute(attrName, valueSignal());
      });
      return this;
    };
  removeAttribute: ComponentConfig<T>["removeAttribute"] = (attrName) => {
    this.hostElement?.removeAttribute(camelToKebab(attrName));
    return this;
  };
  addStyle: ComponentConfig<T>["addStyle"] = (style) => {
    const wrapperValue = this.hostElement;
    if (!wrapperValue) return this;

    Object.entries(style).forEach(([cssKey, value]) => {
      const isCustomProperty = cssKey.startsWith("--");

      if (typeof value === "function") {
        this.addEffect(() => {
          if (isCustomProperty) {
            // @ts-expect-error: value некорректно типизирован
            const cssValue = String(value() || "");
            wrapperValue.style.setProperty(cssKey, cssValue);
          } else {
            // @ts-expect-error index string
            wrapperValue.style[cssKey] = value();
          }
        });
      } else if (typeof value === "string") {
        if (isCustomProperty) {
          wrapperValue.style.setProperty(cssKey, value);
        } else {
          // @ts-expect-error index string
          wrapperValue.style[cssKey] = value;
        }
      }
    });
    return this;
  };
  onConnected: ComponentConfig<T>["onConnected"] = (cb) => {
    if (!this.hostElement) return this;
    Reflect.defineProperty(this.hostElement, ON_CONNECTED_NAME, {
      get() {
        return cb;
      },
    });
    return this;
  };
  addClass: ComponentConfig<T>["addClass"] = (...className) => {
    className.forEach((cls) => {
      if (typeof cls === "string") {
        this.hostElement?.classList.add(
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
  };
  setClass: ComponentConfig<T>["setClass"] = (...className) => {
    this.hostElement?.classList.remove(...(this.hostElement?.classList || []));
    this.hostElement?.classList.add(...className);
    return this;
  };
  addReactiveClass: ComponentConfig<T>["addReactiveClass"] = (classConfig) => {
    Object.keys(classConfig).forEach((className) => {
      this.addEffect((self) => {
        const classSignal = classConfig[className]();
        if (classSignal) {
          self.addClass(className);
        } else {
          self.removeClass(className);
        }
      });
    });
    return this;
  };
  removeClass: ComponentConfig<T>["removeClass"] = (...className) => {
    this.hostElement?.classList.remove(...className);
    return this;
  };
  replaceClass: ComponentConfig<T>["replaceClass"] = (oldClass, newClass) => {
    this.hostElement?.classList.replace(oldClass, newClass);
    return this;
  };

  addEffect: ComponentConfig<T>["addEffect"] = (cb, key?: string | symbol) => {
    const wrapperValue = this.hostElement;
    if (!wrapperValue) return this;
    const effectCb = () => cb(this, wrapperValue);
    if (key) {
      const eff = this.keyedEffects.get(key)?.deref();
      if (eff) {
        removeEffect(eff);
      }
    }
    this.createEffect(effectCb, key);
    return this;
  };
  addReactiveContent: ComponentConfig<T>["addReactiveContent"] = (content) => {
    this.hostElement?.appendChild(htmlEffectWrapper(content));
    return this;
  };
  setReactiveContent: ComponentConfig<T>["setReactiveContent"] = (content) => {
    this.clear();
    this.hostElement?.appendChild(htmlEffectWrapper(content));
    return this;
  };
  clear: ComponentConfig<T>["clear"] = () => {
    this.hostElement?.replaceChildren();
    return this;
  };
}

export class CustomHtmlComponentConfig<T extends ExtraHTMLElement>
  extends HtmlComponentConfig<T>
  implements CustomComponentConfig<T>
{
  setReactiveValue: CustomComponentConfig<T>["setReactiveValue"] = (value) => {
    if (this.hostElement instanceof BaseElement)
      this.hostElement.setReactiveValue(value);
    return this;
  };
  setSlotTemplate: CustomComponentConfig<T>["setSlotTemplate"] = (
    templateConfig,
  ) => {
    const wrapperSlotTemplate = this.hostElement?.slotTemplate;
    if (wrapperSlotTemplate) {
      Object.entries(templateConfig).forEach(([slotKey, slotTmpl]) => {
        wrapperSlotTemplate[slotKey] = slotTmpl as SlotTemplate[typeof slotKey];
      });
    }
    return this;
  };
}

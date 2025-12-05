import { ON_CONNECTED_NAME } from "@shared/constants/constants";
import { ComponentConfig, CustomComponentConfig, ExtraHTMLElement, SlotTemplate } from "@shared/types/element";
import { componentStack } from "../clean";
import { camelToKebab } from "../helpers";
import { effect, ReactiveSignal } from "../signal";
import { BaseElement } from "./base-element";

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

export class HtmlComponentConfig<T extends ExtraHTMLElement> implements ComponentConfig<T> {
    protected wrapper: T;
    hostElement: T;

    constructor(wrapper: T) {
        this.wrapper = wrapper;
        this.hostElement = wrapper;
    }

    append: ComponentConfig<T>["append"] = (...args) => {
        args.forEach((element) => {
            this.wrapper.appendChild(element.hostElement);
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
    };

    set: ComponentConfig<T>["set"] = (...args) => {
        this.clear();
        const fragment = document.createDocumentFragment();
        args.forEach((element) => {
            fragment.appendChild(element.hostElement);
        });
        this.wrapper.appendChild(fragment);
        return this;
    }

    removeChild: ComponentConfig<T>["removeChild"] = (...args) => {
        args.forEach((node) => {
            if (
                Array.from(this.wrapper.childNodes.values()).some(
                    (child) => child === node.hostElement,
                )
            )
                this.wrapper.removeChild(node.hostElement);
        });
        return this;
    }

    addHtmlContent: ComponentConfig<T>["addHtmlContent"] = (content) => {
        addHtmlContent(this.wrapper, content);
        return this;
    }

    setHtmlContent: ComponentConfig<T>["setHtmlContent"] = (content) => {
        setHtmlContent(this.wrapper, content);
        return this;
    }

    addEventlistener(
        eventName: string,
        cb: any,
        options: boolean | AddEventListenerOptions = false,
    ) {
        this.wrapper.addEventListener(eventName, (e) => cb(e, this, this.wrapper), options);
        return this;
    }

    setAttribute: ComponentConfig<T>["setAttribute"] = (attrName, value) => {
        let newValue;
        if (typeof value === "boolean" && !(this.wrapper instanceof BaseElement)) {
            if (value) {
                newValue = "";
            } else {
                this.removeAttribute(attrName as keyof T & string);
                const attrNameLowerCase = attrName.toLowerCase();
                if (attrNameLowerCase in this.wrapper) {
                    this.wrapper[attrNameLowerCase as keyof typeof this.wrapper] = null as any;
                }
                return this;
            }
        } else if (typeof value !== "string") newValue = JSON.stringify(value);
        else newValue = value;

        this.wrapper.setAttribute(camelToKebab(attrName as string), newValue);
        if (!(this.wrapper instanceof BaseElement)) {
            const attrNameLowerCase = attrName.toLowerCase();
            if (attrNameLowerCase in this.wrapper) {
                this.wrapper[attrNameLowerCase as keyof typeof this.wrapper] = value as any;
            }
        }
        return this;
    }
    setCustomAttribute: ComponentConfig<T>["setCustomAttribute"] = (attrName, value) => {
        let newValue;
        if (typeof value !== "string") newValue = JSON.stringify(value);
        else newValue = value;
        this.wrapper.setAttribute(camelToKebab(attrName as string), newValue);
        return this;
    }
    setReactiveAttribute: ComponentConfig<T>["setReactiveAttribute"] = (attrName, valueSignal) => {
        const isCustom = this.wrapper instanceof BaseElement;
        if (isCustom) componentStack.push(this.wrapper as unknown as BaseElement);
        effect(() => this.setAttribute(attrName, valueSignal()));
        if (isCustom) componentStack.pop();
        return this;
    }
    setReactiveCustomAttribute: ComponentConfig<T>["setReactiveCustomAttribute"] = (attrName, valueSignal) => {
        effect(() => this.setCustomAttribute(attrName, valueSignal()));
        return this;
    }
    removeAttribute: ComponentConfig<T>["removeAttribute"] = (attrName) => {
        this.wrapper.removeAttribute(camelToKebab(attrName));
        return this;
    }
    addStyle: ComponentConfig<T>["addStyle"] = (style) => {
        Object.entries(style).forEach(([cssKey, value]) => {
            const isCustomProperty = cssKey.startsWith("--");

            if (typeof value === "function") {
                this.addEffect(() => {
                    if (isCustomProperty) {
                        // @ts-expect-error: value некорректно типизирован
                        const cssValue = String(value() || "");
                        this.wrapper.style.setProperty(cssKey, cssValue);
                    } else {
                        // @ts-expect-error index string
                        this.wrapper.style[cssKey] = value();
                    }
                });
            } else if (typeof value === "string") {
                if (isCustomProperty) {
                    this.wrapper.style.setProperty(cssKey, value);
                } else {
                    // @ts-expect-error index string
                    this.wrapper.style[cssKey] = value;
                }
            }
        });
        return this;
    }
    onConnected: ComponentConfig<T>["onConnected"] = (cb) => {
        Reflect.defineProperty(this.wrapper, ON_CONNECTED_NAME, {
            get() {
                return cb;
            },
        });
        return this;
    }
    addClass: ComponentConfig<T>["addClass"] = (...className) => {
        className.forEach((cls) => {
            if (typeof cls === "string") {
                this.wrapper.classList.add(
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
    }
    setClass: ComponentConfig<T>["setClass"] = (...className) => {
        this.wrapper.classList.remove(...this.wrapper.classList);
        this.wrapper.classList.add(...className);
        return this;
    }
    addReactiveClass: ComponentConfig<T>["addReactiveClass"] = (classConfig) => {
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
    }
    removeClass: ComponentConfig<T>["removeClass"] = (...className) => {
        this.wrapper.classList.remove(...className);
        return this;
    }
    replaceClass: ComponentConfig<T>["replaceClass"] = (oldClass, newClass) => {
        this.wrapper.classList.replace(oldClass, newClass);
        return this;
    }
    addEffect: ComponentConfig<T>["addEffect"] = (cb) => {
        const isCustom = this.wrapper instanceof BaseElement;
        if (isCustom) componentStack.push(this.wrapper as unknown as BaseElement);
        effect(() => cb(this, this.hostElement));
        if (isCustom) componentStack.pop();
        return this;
    }
    addReactiveContent: ComponentConfig<T>["addReactiveContent"] = (content) => {
        this.wrapper.appendChild(htmlEffectWrapper(content));
        return this;
    }
    setReactiveContent: ComponentConfig<T>["setReactiveContent"] = (content) => {
        this.clear();
        this.wrapper.appendChild(htmlEffectWrapper(content));
        return this;
    }
    clear: ComponentConfig<T>["clear"] = () => {
        this.wrapper.replaceChildren();
        return this;
    }
}

export class CustomHtmlComponentConfig<T extends ExtraHTMLElement> extends HtmlComponentConfig<T> implements CustomComponentConfig<T> {
    setReactiveValue: CustomComponentConfig<T>["setReactiveValue"] = (value) => {
        if (this.wrapper instanceof BaseElement) this.wrapper.setReactiveValue(value);
        return this;
    }
    setSlotTemplate: CustomComponentConfig<T>["setSlotTemplate"] = (templateConfig) => {
        const wrapperSlotTemplate = this.wrapper.slotTemplate;
        if (wrapperSlotTemplate) {
            Object.entries(templateConfig).forEach(([slotKey, slotTmpl]) => {
                wrapperSlotTemplate[slotKey] =
                    slotTmpl as SlotTemplate[typeof slotKey];
            });
        }
        return this;
    }
}
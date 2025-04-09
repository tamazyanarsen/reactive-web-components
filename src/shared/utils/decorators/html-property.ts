import { ComponentConfig, EventEmitter } from "../../types/element";
import { camelToKebab, checkCall, kebabToCamel, log } from "../helpers";
import {
  BaseElementConstructor,
  isSlotTemplate,
} from "../html-elements/element";

const eventFieldName = "eventProps";
const observedAttrFieldName = "observedAttributes";

export const property =
  (): (<T extends HTMLElement, K extends keyof T>(
    target: T,
    propName: K,
  ) => void) =>
    (target, propName) => {
      if (!Reflect.get(target, observedAttrFieldName)) {
        Reflect.defineProperty(target, observedAttrFieldName, {
          value: [],
        });
      }
      (Reflect.get(target, observedAttrFieldName) as string[]).push(
        camelToKebab(propName as string),
      );
    };

export const event =
  (): (<T extends HTMLElement, K extends keyof T>(
    target: T,
    propName: K,
  ) => void) =>
    (target, propName) => {
      if (!Reflect.get(target, eventFieldName)) {
        Reflect.defineProperty(target, eventFieldName, {
          value: [],
        });
      }
      (Reflect.get(target, eventFieldName) as string[]).push(propName as string);
    };

export const newEventEmitter: <T = void>() => EventEmitter<T> = () => {
  const resultFunc = () => { }
  resultFunc.oldValue = null
  return resultFunc
};

export const component = (
  selector: string,
  isClosed = true
): (<T extends BaseElementConstructor>(target: T) => T) => {
  return (target) => {
    console.log(
      target.name,
      "start register static attr",
      target.prototype[observedAttrFieldName],
    );
    class NewClass extends target {
      static observedAttributes = target.prototype[observedAttrFieldName] ?? [];

      static renderTagName = selector;

      constructor(...params: any[]) {
        super(isClosed, ...params);
        // add!!! for string index @ts-expect-error index string
        // console.log(
        //   "observedAttrFieldName",
        //   this[observedAttrFieldName],
        //   target.prototype[observedAttrFieldName],
        // );
      }

      render(): ComponentConfig<any> {
        return target.prototype.render.call(this);
      }

      attributeChangedCallback(
        attrName: string,
        oldValue: string,
        newValue: string,
      ) {
        log(
          `%c${target.name}%c`,
          `Attribute %c${attrName}%c has changed.`,
          `oldValue: ${oldValue}, newValue: ${newValue}`,
        );
        try {
          newValue = JSON.parse(newValue);
        } catch {
          console.warn("json parse error");
        }
        // TODO добавить проверку на то, является ли свойство сигналом; все property должны быть сигналами
        // @ts-expect-error index string
        this[kebabToCamel(attrName)].set(newValue);
        checkCall(this, target.prototype.attributeChangedCallback);
      }

      connectedCallback() {
        this.innerHTML = this.innerHTML.trim();

        (target.prototype[eventFieldName] as string[] | undefined)?.forEach(
          (fieldName) => {
            // @ts-expect-error index string
            this[fieldName] = (value: unknown) => {
              console.log("start emit value", value);
              this.dispatchEvent(new CustomEvent(fieldName, { detail: value }));
            };
          },
        );
        console.log("start render", target.name, selector);

        const insertRenderTemplate = () => {
          while (this.shadow.firstChild) {
            this.shadow.removeChild(this.shadow.firstChild);
          }
          this.shadow.appendChild(
            (this.render() as ComponentConfig<any>).hostElement,
          )
          checkCall(this, target.prototype.connectedCallback);
        }

        if (this.rootStyle) {
          const stylePromise: Promise<typeof import("*?inline")>[] = []
          const appendStyle = (css: string) => {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(css);
            this.shadow.adoptedStyleSheets = [sheet];
          }
          if (!Array.isArray(this.rootStyle)) {
            stylePromise.push(this.rootStyle)
          }
          else {
            stylePromise.push(...this.rootStyle)
          }
          Promise.all(stylePromise)
            .then(v => v.forEach(e => appendStyle(e.default)))
            .then(() => insertRenderTemplate());
        } else {
          insertRenderTemplate()
        }

        if (this.slotContext) {
          this.shadow.querySelectorAll("slot").forEach((slotEl) => {
            console.log(
              this.slotContext,
              this.slotContext && this.slotContext[slotEl.name],
            );
            this.querySelectorAll(`[slot="${slotEl.name}"]`).forEach(
              (slotItem) => {
                if (
                  isSlotTemplate(slotItem) &&
                  slotItem.handleSlotContext &&
                  this.slotContext
                ) {
                  slotItem.handleSlotContext(this.slotContext[slotEl.name]);
                }
              },
            );
          });
        }
      }

      disconnectedCallback() {
        checkCall(this, target.prototype.disconnectedCallback);
      }
    }
    NewClass.toString = () => selector

    if (!customElements.get(selector)) {
      customElements.define(selector, NewClass);
    } else {
      console.error(
        `название тега ${selector} повторяется, компонент ${target.name} не зарегистрирован`,
      );
    }
    return NewClass;
  };
};

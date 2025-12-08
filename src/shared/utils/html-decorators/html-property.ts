import { RootStyle } from "@shared/types";
import { ComponentConfig, ContextEvent } from "../../types/element";
import {
  camelToKebab,
  checkCall,
  colorLog,
  kebabToCamel,
  projectLog,
} from "../helpers";
import { BaseElementConstructor } from "../html-elements";
import { effect, isReactiveSignal, ReactiveSignal } from "../signal";

const eventFieldName = "eventProps";
const EVENT_CONFIG = "EVENT_CONFIG";
const observedAttrFieldName = "observedAttributes";

type EventConfig = Pick<CustomEventInit, "bubbles" | "composed">;
type EventConfigObj = Record<string, Partial<EventConfig>>;

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
  (
    config?: EventConfig,
  ): (<T extends HTMLElement, K extends keyof T>(
    target: T,
    propName: K,
  ) => void) =>
    (target, propName) => {
      if (!Reflect.get(target, eventFieldName)) {
        Reflect.defineProperty(target, eventFieldName, {
          value: [],
        });
      }
      if (!Reflect.get(target, EVENT_CONFIG)) {
        Reflect.defineProperty(target, EVENT_CONFIG, {
          value: {} as EventConfigObj,
        });
      }
      (Reflect.get(target, EVENT_CONFIG) as EventConfigObj)[propName as string] =
      {
        bubbles: config?.bubbles ?? false,
        composed: config?.composed ?? false,
      };
      (Reflect.get(target, eventFieldName) as string[]).push(propName as string);
    };

export const component = (
  selector: `${string}-${string}`,
  isClosed = false,
): (<T extends BaseElementConstructor>(target: T) => T) => {
  return (target) => {
    projectLog(
      selector,
      "start register static attr",
      target.prototype[observedAttrFieldName],
    );

    const sheet: CSSStyleSheet[] = [];
    if (target.styles) {
      const currStyle = target.styles;
      const styles: string[] = [];
      if (Array.isArray(currStyle)) {
        styles.push(...currStyle);
      } else {
        styles.push(currStyle);
      }
      styles.forEach((css) => {
        const currSheet = new CSSStyleSheet();
        currSheet.replaceSync(css);
        sheet.push(currSheet);

        const propertyCss = new CSSStyleSheet();
        propertyCss.replaceSync(css.slice(css.indexOf("@property")));
        document.adoptedStyleSheets.push(propertyCss);
      });
    }

    class NewClass extends target {
      static observedAttributes = target.prototype[observedAttrFieldName] ?? [];

      static renderTagName = selector;

      // effectCleanupHandleEvent = (e: Set<() => void>) => {
      //   this.effects.add(e);
      // }

      // effects = new Set<Set<() => void>>();

      constructor(...params: any[]) {
        projectLog("constructor", `%c${selector}%c`);
        super(isClosed, ...params);
        colorLog("@osheet", sheet);
        if (sheet.length > 0) {
          this.shadow.adoptedStyleSheets.push(...sheet);
        }
      }

      render(): ComponentConfig<any> {
        projectLog('rwc: render from new class');
        return target.prototype.render.call(this);
      }

      attributeChangedCallback(
        attrName: string,
        oldValue: string,
        newValue: string,
      ) {
        projectLog(
          `%cAttribute has changed.%c`,
          `%c${attrName}%c`,
          `oldValue: ${oldValue}, newValue: ${newValue}`,
          `%c${selector}%c`,
        );
        try {
          newValue = JSON.parse(newValue);
        } catch {
          // console.warn("json parse error");
        }
        const propName = kebabToCamel(attrName);
        if (
          propName in this &&
          isReactiveSignal(this[propName as keyof this])
        ) {
          const propSignal = this[
            propName as keyof this
          ] as ReactiveSignal<any>;
          propSignal.setName(attrName);
          if (newValue === null) {
            propSignal.set(propSignal.initValue);
            this.removeAttribute(attrName);
          } else {
            propSignal.set(newValue);
          }
        }
        checkCall(
          this,
          target.prototype.attributeChangedCallback,
          attrName,
          oldValue,
          newValue,
        );
      }

      connectedCallback() {
        const wrapperEffect = () => {
          projectLog('rwc: connectedCallback');
          projectLog("connectedCallback", `%c${selector}%c`, this);

          this.init?.();

          if (this.providers && Object.keys(this.providers).length > 0) {
            projectLog("WRAPPER for providers", selector);
            Object.entries(this.providers).forEach(
              ([provider, providerValue]) => {
                projectLog("register provider", provider, providerValue());
                this.addEventListener(provider, (e: Event) => {
                  projectLog("send provider", provider, providerValue());
                  const customEvent = e as ContextEvent<any>;
                  if (customEvent.detail?.context === provider) {
                    customEvent.stopPropagation();
                    customEvent.detail.callback(providerValue);
                  }
                });
              },
            );
          }

          // подключаем все инжекты
          this.checkInjects();

          (target.prototype[eventFieldName] as string[] | undefined)?.forEach(
            (fieldName) => {
              // @ts-expect-error index string
              this[fieldName] = (value: unknown) => {
                const config = (target.prototype[EVENT_CONFIG] as EventConfigObj)[
                  fieldName
                ];
                const { bubbles, composed } = config;
                if (isReactiveSignal(value)) {
                  effect(() => {
                    colorLog("@oemit reactive value", value());
                    this.dispatchEvent(
                      new CustomEvent(fieldName, {
                        detail: value(),
                        bubbles,
                        composed,
                      }),
                    );
                  });
                } else {
                  colorLog("@oemit value", value);
                  this.dispatchEvent(
                    new CustomEvent(fieldName, {
                      detail: value,
                      bubbles,
                      composed,
                    }),
                  );
                }
              };
            },
          );

          projectLog("start render", `%c${selector}%c`, selector);

          const insertRenderTemplate = () => {
            projectLog('rwc: insertRenderTemplate');
            const renderComponent = this.render() as ComponentConfig<any>;
            this.shadow.appendChild(renderComponent.hostElement);
            checkCall(this, target.prototype.connectedCallback);
            this.appendSlotContent();
          };

          if (this.rootStyle && !target.styles) {
            const isStylePromise = (
              value: RootStyle,
            ): value is
              | Promise<typeof import("*?inline")>
              | Promise<typeof import("*?inline")>[] =>
              value instanceof Promise ||
              (Array.isArray(value) && value.every((v) => v instanceof Promise));

            const styleValue = this.rootStyle;

            const appendStyle = (css: string) => {
              const sheet = new CSSStyleSheet();
              sheet.replaceSync(css);
              this.shadow.adoptedStyleSheets.push(sheet);

              const propertyCss = new CSSStyleSheet();
              propertyCss.replaceSync(css.slice(css.indexOf("@property")));
              document.adoptedStyleSheets.push(propertyCss);
            };

            if (isStylePromise(styleValue)) {
              const stylePromise: Promise<typeof import("*?inline")>[] = [];
              if (!Array.isArray(styleValue)) {
                stylePromise.push(styleValue);
              } else {
                stylePromise.push(...styleValue);
              }
              Promise.all(stylePromise)
                .then((v) => v.forEach((e) => appendStyle(e.default)))
                .then(() => insertRenderTemplate());
            } else {
              const newStyleList = [];
              if (Array.isArray(styleValue)) {
                newStyleList.push(...styleValue);
              } else {
                newStyleList.push(styleValue);
              }
              newStyleList.forEach((e) => appendStyle(e));
              insertRenderTemplate();
            }
          } else {
            insertRenderTemplate();
          }

          if (this.slotContext && Object.keys(this.slotContext).length > 0) {
            this.shadow.querySelectorAll("slot").forEach((slotEl) => {
              projectLog(
                this.slotContext,
                this.slotContext && this.slotContext[slotEl.name],
              );
              colorLog(
                "@bslot element",
                slotEl,
                `name:${slotEl.name};`,
                slotEl.assignedElements(),
              );
              // this.querySelectorAll(`[slot="${slotEl.name}"]`)
              slotEl.assignedElements().forEach((slotItem) => {
                const slotContextValue = this.slotContext![slotEl.name];
                if (this.slotContext && isReactiveSignal(slotContextValue)) {
                  colorLog(
                    "@oslot element",
                    slotEl,
                    `name:${slotEl.name};`,
                    slotEl.assignedElements(),
                  );
                  effect(() => {
                    slotItem.dispatchEvent(
                      new CustomEvent("handleSlotContext", {
                        detail: slotContextValue(),
                      }),
                    );
                  });
                }
              });
            });
          }

        }
        wrapperEffect.fake = true;
        this.effectSet.add(new WeakRef(wrapperEffect));
        effect(wrapperEffect, {name:'FAKE_wrapperEffect'});
      }

      disconnectedCallback() {
        this.effectSet.forEach(eff => eff.deref()?.destroy?.());
        this.effectSet.clear();

        this.shadow.replaceChildren();
        this.replaceChildren();


        checkCall(this, target.prototype.disconnectedCallback);
      }
    }
    NewClass.toString = () => selector;

    if (!customElements.get(selector)) {
      customElements.define(selector, NewClass);
    } else {
      console.error(
        `название тега ${selector} повторяется, компонент ${target.name} не зарегистрирован`,
      );
    }
    target.renderTagName = selector
    return target;
  };
};

import {
  ComponentConfig,
  ComponentContent,
  ContextEvent,
  RootStyle,
  SlotContext,
  SlotTemplate,
} from "@shared/types";
import { projectLog } from "../helpers";
import { effect, EffectCb, ReactiveSignal, signal } from "../signal";

export abstract class BaseElement extends HTMLElement {
  static observedAttributes: string[] = [];
  static renderTagName: string = "";

  static styles?: string | string[];

  public init?: () => void;

  public isSlotLazyLoading = false;

  public slotTemplate?: SlotTemplate;

  public slotContext?: SlotContext;

  /**
   * @deprecated Use `static styles` instead.
   */
  public rootStyle?: RootStyle;

  public modelValue?: ReactiveSignal<unknown>;

  public providers?: Record<string, ReactiveSignal<any>>;

  wrapperEffect: EffectCb | null = null;

  componentEffect(cb: () => void) {
    console.log(cb);
    debugger;
    if (!this.wrapperEffect) return;
    (cb as EffectCb).parent = new WeakRef(this.wrapperEffect);
    effect(cb);
  }

  appendAllSlotContent?: () => void;

  allSlotContent?: ComponentContent[] = [];

  slotContent: Record<string, ComponentConfig<any>[]> = {};
  htmlSlotContent: Record<string, HTMLElement[]> = {};

  shadow: ShadowRoot;

  // @ts-expect-error - appendChild is not defined in the HTMLElement interface
  appendChild<T extends Node>(node: T, isLazy = true): T {
    if (this.isSlotLazyLoading && isLazy) {
      if (node instanceof HTMLElement) {
        const slotKey = node.slot || "default";
        if (!this.htmlSlotContent[slotKey]) {
          this.htmlSlotContent[slotKey] = [];
        }
        this.htmlSlotContent[slotKey]?.push(node);
      }
      // return super.appendChild(node)
    } else return super.appendChild(node);
  }

  constructor(isClosed = false) {
    super();
    this.shadow = this.attachShadow({ mode: isClosed ? "closed" : "open" });
  }

  appendSlotContent() {
    this.appendAllSlotContent?.();
  }

  public injects: Record<string, ReactiveSignal<any>> = {};

  public inject<T>(contextKey: string): ReactiveSignal<T | null> {
    projectLog("%cinject%c", contextKey);
    if (!this.injects[contextKey]) {
      this.injects[contextKey] = signal<T | null>(null);
    }
    return this.injects[contextKey] as ReactiveSignal<T | null>;
  }

  public checkInjects() {
    Object.entries(this.injects).forEach(([contextKey, injectSignal]) => {
      projectLog(
        "%cinject%c",
        `%c${contextKey}%c`,
        "from BaseElement (dispatch event)",
      );
      this.shadow.dispatchEvent(
        new CustomEvent(contextKey, {
          detail: {
            context: contextKey,
            callback: <
              T extends typeof injectSignal extends ReactiveSignal<infer V>
                ? Exclude<V, null>
                : never,
            >(
              providerSignal: ReactiveSignal<T>,
            ) =>
              effect(
                () => {
                  injectSignal.set(providerSignal());
                },
                { name: contextKey },
              ),
          },
          bubbles: true,
          composed: true,
        }) as ContextEvent<
          typeof injectSignal extends ReactiveSignal<infer V>
            ? Exclude<V, null>
            : never
        >,
      );
    });
  }

  abstract render(): ComponentConfig<any>;

  setReactiveValue<ModelType = unknown>(value: ReactiveSignal<ModelType>) {
    this.modelValue = value;
  }
}

export interface BaseElementConstructor {
  new (...params: any[]): BaseElement;
  renderTagName: string;
  styles?: string | string[];
  observedAttributes: string[];
}

export const isBaseElement = (item: any): item is BaseElement =>
  "render" in item && "setReactiveValue" in item;

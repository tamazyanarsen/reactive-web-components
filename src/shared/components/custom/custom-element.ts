import {
  effect,
  isSignal,
  signal,
  type EffectCb,
  type MaybeReactive,
  type MaybeSignal,
  type ReactiveSignal,
  type ReadonlySignal,
} from "../../signals";
import {
  appendChildren,
  buildFragment,
  splitConfigAndChildren,
  type ElementChild,
  type FlowContent,
} from "../html";
import {
  applyAttrs,
  applyShow,
  applyStyle,
  type AttrMap,
  type AttrOption,
  type StyleMap,
} from "../utils/attr-binding";
import { applyClass, type ClassOption, type ClassValue } from "../utils/class-binding";
import { camelToKebab, kebabToCamel } from "../utils/case";
import { parseValue } from "../utils/parse-value";
import { hostEffect, withEffectHost } from "../utils/render-context";
import { adoptStyles, type ComponentStyles } from "../utils/styles";
import { injectFrom, provideOn, type ContextKey } from "../utils/context";

export type EventEmitter<P> = (payload: P) => boolean;

/** Шаблон слота: родитель получает контекст от компонента и возвращает разметку. */
export type SlotTemplate<Ctx> = (context: Ctx) => FlowContent;

/** Настройки CustomEvent для конкретного события компонента. */
export type EventOptions = Pick<CustomEventInit, "bubbles" | "composed" | "cancelable">;

const DEFAULT_EVENT_OPTIONS: Required<EventOptions> = {
  bubbles: true,
  composed: true,
  cancelable: false,
};

export abstract class BaseElement extends HTMLElement {
  /** Имя тега проставляет useCustomComponent при регистрации; из него customEl берёт тег. */
  static renderTagName?: CustomTagName;

  /**
   * Режим и опции теневого корня. По умолчанию open: закрытый корень не даёт добраться
   * до внутренностей ни тестам, ни отладчику, а от постороннего кода он всё равно не
   * защищает. Задать можно через defineComponent({ shadow }) или прямо на классе.
   */
  static shadowOptions: ShadowRootInit = { mode: "open" };

  /**
   * CSS компонента. Строки разбираются один раз на всю библиотеку и раздаются
   * экземплярам общим CSSStyleSheet: `static styles = css\`:host { display: block }\``.
   */
  static styles?: ComponentStyles;

  protected shadow: ShadowRoot;
  protected componentEffectList = new Set<EffectCb>();

  /** Начальные значения пропсов — к ним откатываемся при removeAttribute. */
  protected initialProps: Record<string, unknown> = {};

  /** Узлы стилей запасного пути: их нужно вставлять заново при каждом подключении. */
  private readonly styleNodes: Node[];

  constructor() {
    super();
    const ctor = this.constructor as typeof BaseElement;
    this.shadow = this.attachShadow(ctor.shadowOptions);
    this.styleNodes = adoptStyles(this.shadow, ctor.styles);
    // render() здесь вызывать нельзя: props и events — поля наследника,
    // их инициализаторы отработают только после выхода из super().
  }

  abstract props: Record<string, ReactiveSignal<unknown>>;
  abstract events: Record<string, EventEmitter<any>>;

  /**
   * Типы контекстов слотов. Значения тут не живут — поле нужно, чтобы фабрика знала,
   * какой контекст ждёт каждый слот. Заполняется типом через defineComponent({ slots }).
   */
  slots: Record<string, unknown> = {};

  /** Шаблоны, которые передал родитель ключами "#имяСлота". Заполняет фабрика. */
  readonly slotTemplates: Record<string, SlotTemplate<never>> = {};

  /**
   * Рендерит слот с контекстом:
   *
   *   each(this.props.rows, (row, index) => this.renderSlot("row", { row, index }))
   *
   * Контекст обычно состоит из сигналов — тогда шаблон родителя обновляется вместе
   * с данными, а узлы не пересоздаются. Если родитель шаблон не передал, рендерится
   * fallback, а без него — пусто.
   *
   * Имя не slot: у HTMLElement уже есть строковое свойство slot (атрибут слота).
   */
  public renderSlot<K extends keyof this["slots"] & string>(
    name: K,
    context: this["slots"][K],
    fallback?: () => FlowContent,
  ): DocumentFragment {
    const template = this.slotTemplates[name] as SlotTemplate<this["slots"][K]> | undefined;
    return buildFragment(template ? template(context) : (fallback?.() ?? null));
  }

  public addEffect(effectCb: VoidFunction) {
    const created = effect(effectCb);
    this.componentEffectList.add(created);
    return created;
  }

  /**
   * Кладёт значение в контекст для всего поддерева — и в теневом DOM, и в светлом.
   * Вызывать в render() или до него: потомки читают контекст, когда подключаются к DOM,
   * то есть уже после того, как render() вернул разметку.
   */
  public provide<T>(key: ContextKey<T>, value: MaybeSignal<T>) {
    provideOn(this, key, value);
  }

  /**
   * Берёт значение из ближайшего провайдера вверх по дереву. Возвращает сигнал —
   * при изменении у провайдера обновится и здесь.
   */
  public inject<T>(key: ContextKey<T>): ReadonlySignal<T> {
    return injectFrom(this, key);
  }

  protected newEventEmitter<P>(eventName: string, options?: EventOptions): EventEmitter<P> {
    return (payload: P) =>
      this.dispatchEvent(
        new CustomEvent(eventName, { ...DEFAULT_EVENT_OPTIONS, ...options, detail: payload }),
      );
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    const propName = kebabToCamel(name);
    const propSignal = this.props[propName];
    if (!propSignal) return;
    propSignal.set(newValue === null ? this.initialProps[propName] : parseValue(newValue));
  }

  connectedCallback() {
    // withEffectHost: пока идёт render(), все эффекты (в том числе созданные внутри el()
    // для детей-сигналов) регистрируются на этом компоненте и умрут вместе с ним.
    // replaceChildren, а не append: при повторном подключении элемента в DOM
    // connectedCallback вызовется снова, и append дал бы второй экземпляр разметки.
    // buildFragment внутри withEffectHost: реактивные дети, которые он создаёт,
    // должны принадлежать компоненту, как и всё остальное из render().
    this.shadow.replaceChildren(
      ...this.styleNodes,
      withEffectHost(this, () => buildFragment(this.render())),
    );
  }

  disconnectedCallback() {
    this.componentEffectList.forEach((effectCb) => effectCb.destroy());
    this.componentEffectList.clear();
    // Teardown симметричен connectedCallback: эффекты уничтожены, значит разметка,
    // которую они обновляли, больше не живая — при повторном connect рендерим заново.
    this.shadow.replaceChildren();
  }

  /**
   * Разметка компонента. Корневой элемент не обязателен: подойдёт и фрагмент от when,
   * и массив узлов — навязывать обёртку было бы странно, раз её избегают сами блоки.
   */
  abstract render(): FlowContent;
}

export type PropsInit = Record<string, unknown>;
export type EventsInit = Record<string, unknown>;
export type SlotsInit = Record<string, unknown>;

/** Фантомное значение: задаёт тип payload события, ничего не создавая в рантайме. */
export const payload = <P>() => undefined as unknown as P;

export type ComponentConfig<P extends PropsInit, E extends EventsInit, S extends SlotsInit> = {
  /** Пропсы задаются начальными значениями — из ключей строятся сигналы и observedAttributes. */
  props: P;
  /** Имена событий; значение задаёт тип payload, см. payload<T>(). */
  events?: E;
  eventOptions?: { [K in keyof E]?: EventOptions };
  /** Слоты с контекстом; значение задаёт тип контекста, см. payload<T>(). */
  slots?: S;
  /** Режим теневого корня. По умолчанию "open". */
  shadow?: ShadowRootMode | ShadowRootInit;
  /** CSS компонента; то же самое можно объявить как `static styles` на классе. */
  styles?: ComponentStyles;
};

/**
 * Экземпляр компонента, собранного defineComponent: BaseElement, у которого props,
 * events и slots сужены до объявленных.
 *
 * Интерфейс, а не пересечение типов: объявленный класс возвращается из функции и потому
 * анонимен, а анонимный класс с protected-полями (shadow, initialProps) невозможно
 * записать в .d.ts. Именованный интерфейс, наследующий BaseElement, эту проблему снимает
 * и сохраняет связь с исходным объявлением — значит protected остаётся доступен наследникам.
 */
export interface ComponentBase<P extends PropsInit, E extends EventsInit, S extends SlotsInit>
  extends BaseElement {
  props: { [K in keyof P]: ReactiveSignal<P[K]> };
  events: { [K in keyof E]: EventEmitter<E[K]> };
  slots: { [K in keyof S]: S[K] };
}

/** Конструктор, который отдаёт defineComponent: абстрактный — render пишет наследник. */
export type ComponentClass<
  P extends PropsInit,
  E extends EventsInit,
  S extends SlotsInit,
> = (abstract new () => ComponentBase<P, E, S>) & {
  readonly observedAttributes: string[];
  shadowOptions: ShadowRootInit;
  styles?: ComponentStyles;
  renderTagName?: CustomTagName;
};

/**
 * Собирает базовый класс компонента: из ключей props — observedAttributes
 * (без них attributeChangedCallback не вызывается вовсе) и сигналы,
 * из ключей events — эмиттеры. Имена атрибутов и событий — kebab-case от ключа.
 */
export const defineComponent = <
  P extends PropsInit,
  E extends EventsInit = {},
  S extends SlotsInit = {},
>(
  config: ComponentConfig<P, E, S>,
): ComponentClass<P, E, S> => {
  const eventOptions = config.eventOptions as Record<string, EventOptions | undefined> | undefined;

  abstract class Component extends BaseElement {
    static readonly observedAttributes = Object.keys(config.props).map(camelToKebab);

    static override shadowOptions: ShadowRootInit =
      typeof config.shadow === "string" ? { mode: config.shadow } : (config.shadow ?? { mode: "open" });

    static override styles = config.styles;

    protected override initialProps = config.props;

    props = Object.fromEntries(
      Object.entries(config.props).map(([key, initValue]) => [key, signal(initValue)]),
    ) as { [K in keyof P]: ReactiveSignal<P[K]> };

    events = Object.fromEntries(
      Object.keys(config.events ?? {}).map((key) => [
        key,
        this.newEventEmitter(camelToKebab(key), eventOptions?.[key]),
      ]),
    ) as unknown as { [K in keyof E]: EventEmitter<E[K]> };

    // Только тип: значения слотов не нужны, шаблоны лежат в slotTemplates.
    declare slots: { [K in keyof S]: S[K] };
  }

  return Component;
};

export type CustomTagName = `${string}-${string}`;

/** Конструктор компонента. renderTagName появляется на классе после регистрации. */
export type BaselementConstructor<B extends BaseElement = BaseElement> = {
  new(): B;
  renderTagName?: CustomTagName;
};

/** Атрибуты: ".имяПропса", значение — тип его сигнала, статикой или сигналом. */
export type CustomElementAttrs<B extends BaseElement> = {
  [K in keyof B["props"] as `.${K & string}`]?: B["props"][K] extends ReactiveSignal<infer T>
    ? MaybeSignal<T>
    : never;
};

/** Слушатели: "@имяСобытия", payload вытаскивается из эмиттера. */
export type CustomElementListeners<B extends BaseElement> = {
  [K in keyof B["events"]as `@${K & string}`]?: (
    event: CustomEvent<B["events"][K] extends EventEmitter<infer Payload> ? Payload : never>,
  ) => void;
};

/** Шаблоны слотов: "#имяСлота", контекст берётся из объявления компонента. */
export type CustomElementSlots<B extends BaseElement> = {
  [K in keyof B["slots"] as `#${K & string}`]?: SlotTemplate<B["slots"][K]>;
};

export type CustomElementOptions<B extends BaseElement> = CustomElementAttrs<B> &
  CustomElementListeners<B> &
  CustomElementSlots<B> &
  ClassOption &
  AttrOption;

/**
 * Точка — это свойство: пишем прямо в сигнал компонента, минуя сериализацию в атрибут.
 * Так между компонентами ходят любые значения (объекты, массивы, функции) без потерь,
 * и сравнение по ссылке в signal.set работает как задумано.
 */
const bindProp = (element: BaseElement, tagName: CustomTagName, key: string, value: unknown) => {
  const propName = kebabToCamel(key);
  const propSignal = element.props[propName];

  if (!propSignal) {
    console.warn(`у <${tagName}> нет пропса "${propName}" — значение проигнорировано`);
    return;
  }

  // Эффект принадлежит тому, кто вызвал customEl, — родителю, а не создаваемому компоненту.
  if (isSignal(value)) {
    hostEffect(() => propSignal.set(value()));
    return;
  }
  propSignal.set(value);
};

const initElement = <B extends BaseElement>(
  element: B,
  tagName: CustomTagName,
  options: CustomElementOptions<B>,
) => {
  let classValue: ClassValue | undefined;
  let showValue: MaybeReactive<boolean> | undefined;

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;

    if (key === "class") {
      classValue = value as ClassValue;
      continue;
    }

    if (key === "show") {
      showValue = value as MaybeReactive<boolean>;
      continue;
    }

    if (key === "attrs") {
      applyAttrs(element, value as AttrMap);
      continue;
    }

    if (key === "style") {
      applyStyle(element, value as StyleMap);
      continue;
    }

    if (key.startsWith("@")) {
      element.addEventListener(camelToKebab(key.slice(1)), value as EventListener);
      continue;
    }

    if (key.startsWith(".")) {
      bindProp(element, tagName, key.slice(1), value);
      continue;
    }

    if (key.startsWith("#")) {
      // Шаблон кладём до подключения к DOM: компонент прочитает его в render().
      element.slotTemplates[key.slice(1)] = value as SlotTemplate<never>;
      continue;
    }
  }

  if (showValue !== undefined) applyShow(element, showValue);

  // Классы садятся на host: он в светлом DOM, значит стилизуется снаружи и через :host(.x).
  if (classValue !== undefined) applyClass(element, classValue);
};

/**
 * Регистрирует компонент и возвращает его фабрику:
 *
 *   const testComponent = useCustomComponent(TestComponent, "test-component");
 *   testComponent({ ".test": 5, "@valueChange": (e) => ... }, "дети");
 *
 * Фабрика, а не отдельный customEl(Class): B фиксируется здесь, на регистрации,
 * поэтому инлайновые обработчики "@событие" получают точный тип payload. Если
 * передавать класс и конфиг одним вызовом, TypeScript типизирует обработчик раньше,
 * чем выведет B, подставляет ограничение BaseElement — и payload схлопывается в never.
 */
/** Фабрика компонента: тот же вызов независимо от того, под каким тегом он зарегистрирован. */
export type ComponentFactory<B extends BaseElement> = (
  configOrChild?: CustomElementOptions<B> | ElementChild,
  ...rest: ElementChild[]
) => B;

export type RegisterOptions = {
  /**
   * Суффикс тега: uwc-button + postfix "moduleA" -> uwc-button-modulea.
   * Позволяет двум версиям UI-кита ужиться на одной странице — JS-код при этом
   * не меняется, потому что вызовы идут через фабрику, а не через имя тега.
   */
  postfix?: string;
};

/** Регистрирует компонент под тегом и возвращает получившееся имя тега. */
export type RegisterComponent = (options?: RegisterOptions) => CustomTagName;

/**
 * Разделяет объявление компонента и его регистрацию:
 *
 *   export const [UwcButton, registerUwcButton] = configCustomComponent(Button, "uwc-button");
 *   // в приложении:
 *   registerUwcButton({ postfix: "moduleA" });   // тег uwc-button-modulea
 *   UwcButton({ ".type": "primary" }, "Нажми");  // вызов не меняется
 *
 * Один класс можно зарегистрировать только под одним тегом — таково правило
 * customElements. Несколько версий на странице получаются из разных сборок кита,
 * где классы разные.
 */
export const configCustomComponent = <B extends BaseElement>(
  component: BaselementConstructor<B>,
  baseTagName: CustomTagName,
) => {
  let tagName: CustomTagName | null = null;

  const register: RegisterComponent = (options) => {
    const postfix = options?.postfix;
    // Имя тега регистронезависимо, а postfix обычно приходит в camelCase из имени модуля.
    const nextTag = (postfix ? `${baseTagName}-${postfix.toLowerCase()}` : baseTagName) as CustomTagName;

    if (tagName) {
      if (tagName !== nextTag) {
        console.error(
          `${component.name} уже зарегистрирован как <${tagName}>, повторная регистрация как <${nextTag}> невозможна`,
        );
      }
      return tagName;
    }

    const occupied = customElements.get(nextTag);
    if (occupied && occupied !== component) {
      console.error(`тег ${nextTag} занят другим компонентом, ${component.name} не зарегистрирован`);
      return nextTag;
    }

    if (!occupied) customElements.define(nextTag, component as CustomElementConstructor);

    tagName = nextTag;
    component.renderTagName = nextTag;
    return nextTag;
  };

  const factory: ComponentFactory<B> = (configOrChild, ...rest) => {
    if (!tagName) {
      throw new Error(
        `${component.name} не зарегистрирован — вызовите register() до создания компонента`,
      );
    }

    const element = document.createElement(tagName) as B;
    const [options, children] = splitConfigAndChildren<CustomElementOptions<B>>(configOrChild, rest);

    if (options) initElement(element, tagName, options);
    appendChildren(element, children);

    return element;
  };

  return [factory, register] as const;
};

/**
 * Регистрирует компонент и сразу возвращает его фабрику:
 *
 *   const testComponent = useCustomComponent(TestComponent, "test-component");
 *   testComponent({ ".test": 5, "@valueChange": (e) => ... }, "дети");
 *
 * Фабрика, а не отдельный customEl(Class): B фиксируется здесь, на регистрации,
 * поэтому инлайновые обработчики "@событие" получают точный тип payload. Если
 * передавать класс и конфиг одним вызовом, TypeScript типизирует обработчик раньше,
 * чем выведет B, подставляет ограничение BaseElement — и payload схлопывается в never.
 *
 * Когда момент регистрации нужно отложить (постфиксы, несколько версий кита) —
 * см. configCustomComponent.
 */
export const useCustomComponent = <B extends BaseElement>(
  component: BaselementConstructor<B>,
  tagName: CustomTagName,
): ComponentFactory<B> => {
  const [factory, register] = configCustomComponent(component, tagName);
  register();
  return factory;
};

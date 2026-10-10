import {
  button,
  configCustomComponent,
  css,
  defineComponent,
  div,
  payload,
  signal,
  slot,
  span,
  type CustomTagName,
  type RegisterOptions,
} from "@rwcjs/core";
import { tokens } from "../tokens";

/** Что сообщает событие toggle: какой пункт и в какое состояние перешёл. */
export type AccordionToggleDetail = { value: string; open: boolean };

let idCounter = 0;

const sameItems = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * Пункт аккордеона: заголовок-кнопка и раскрываемая область.
 *
 *   rwcAccordionItem({ ".value": "shipping", ".heading": "Доставка" }, "Текст...")
 *
 * Заголовок — проп heading или содержимое слота "heading" (тогда проп не нужен).
 * Кнопка и область лежат в одном теневом корне, поэтому aria-controls/aria-labelledby
 * ссылаются на id внутри него. Пункт работает и без rwc-accordion — как одиночный
 * раскрывающийся блок. Не <details>: у него свой маркер, своя анимация и toggle,
 * который не всплывает и не несёт value, — согласовать это с остальным китом дороже.
 */
export class AccordionItem extends defineComponent({
  props: {
    /** Идентификатор пункта — приходит в событии toggle. */
    value: "",
    /** Текст заголовка, если слот "heading" пуст. */
    heading: "",
    /** Пункт раскрыт. */
    open: false,
    /** Отключает пункт: заголовок не раскрывает и не сворачивает его. */
    disabled: false,
    /** Уровень заголовка для aria-level — по структуре страницы. */
    level: 3,
  },
  events: {
    /** Пользователь раскрыл или свернул пункт. */
    toggle: payload<AccordionToggleDetail>(),
  },
  // Не всплывает: наружу о переключении сообщает rwc-accordion своим toggle — иначе
  // слушатель на аккордеоне получал бы каждое событие дважды.
  eventOptions: { toggle: { bubbles: false, composed: false } },
  reflect: ["open", "disabled"],
  shadow: { mode: "open", delegatesFocus: true },
  styles: [
    tokens,
    css`
      :host {
        display: block;
        border-bottom: 1px solid var(--_border);
      }

      .heading {
        margin: 0;
      }

      button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--_space) * 2);
        width: 100%;
        padding: calc(var(--_space) * 2) 0;
        font: inherit;
        font-weight: 500;
        text-align: start;
        color: var(--_text);
        background: none;
        border: none;
        border-radius: var(--_radius-sm);
        cursor: pointer;
      }
      button:hover .title {
        text-decoration: underline;
      }
      :host([disabled]) button {
        opacity: 0.5;
        cursor: not-allowed;
      }
      :host([disabled]) button:hover .title {
        text-decoration: none;
      }

      .chevron {
        flex: none;
        width: 8px;
        height: 8px;
        margin-inline-end: 4px;
        border-right: 1.5px solid var(--_text-muted);
        border-bottom: 1.5px solid var(--_text-muted);
        transform: translateY(-2px) rotate(45deg);
        transition: transform var(--_duration);
      }
      :host([open]) .chevron {
        transform: translateY(2px) rotate(-135deg);
      }

      /* Высота анимируется через 0fr → 1fr, без замеров; visibility убирает
         свёрнутое содержимое из порядка фокуса и дерева доступности. */
      .region {
        display: grid;
        grid-template-rows: 0fr;
        visibility: hidden;
        transition:
          grid-template-rows var(--_duration),
          visibility var(--_duration);
      }
      :host([open]) .region {
        grid-template-rows: 1fr;
        visibility: visible;
      }
      .clip {
        min-height: 0;
        overflow: hidden;
      }
      .content {
        padding-bottom: calc(var(--_space) * 2);
      }
    `,
  ],
}) {
  render() {
    const { heading, open, disabled, level } = this.props;
    const id = ++idCounter;
    const buttonId = `rwc-accordion-button-${id}`;
    const regionId = `rwc-accordion-region-${id}`;

    return [
      div(
        { class: "heading", attrs: { role: "heading", "aria-level": () => String(level()) } },
        button(
          {
            attrs: {
              type: "button",
              id: buttonId,
              part: "trigger",
              "aria-expanded": open,
              "aria-controls": regionId,
              "aria-disabled": () => (disabled() ? "true" : null),
            },
            "@click": () => {
              if (!disabled()) setOpen(this, !open());
            },
          },
          span({ class: "title" }, slot({ ".name": "heading" }, heading)),
          span({ class: "chevron", attrs: { "aria-hidden": "true" } }),
        ),
      ),
      div(
        {
          class: "region",
          attrs: { id: regionId, role: "region", part: "region", "aria-labelledby": buttonId },
        },
        div({ class: "clip" }, div({ class: "content", attrs: { part: "content" } }, slot())),
      ),
    ];
  }
}

/** Переключение «от пользователя»: меняет open и сообщает об этом событием. */
const setOpen = (item: AccordionItem, open: boolean) => {
  if (item.props.open.peek() === open) return;
  item.props.open.set(open);
  item.events.toggle({ value: item.props.value.peek(), open });
};

/** Кнопка заголовка: на неё переводят фокус стрелки аккордеона. */
const triggerOf = (item: AccordionItem) => item.shadowRoot?.querySelector("button") ?? null;

/**
 * Аккордеон: группа rwc-accordion-item.
 *
 *   rwcAccordion({ "@toggle": (e) => e.detail },
 *     rwcAccordionItem({ ".value": "a", ".heading": "Вопрос" }, "Ответ"),
 *     ...
 *   )
 *
 * Без multiple раскрытие одного пункта сворачивает остальные. Стрелки вверх/вниз и
 * Home/End переводят фокус между заголовками, Enter/Space раскрывают — это делает
 * нативная кнопка заголовка.
 */
export class Accordion extends defineComponent({
  props: {
    /** Разрешает держать раскрытыми несколько пунктов сразу. */
    multiple: false,
  },
  events: {
    /** Пункт раскрыт или свёрнут — пользователем или из-за раскрытия соседа. */
    toggle: payload<AccordionToggleDetail>(),
  },
  reflect: ["multiple"],
  styles: [
    tokens,
    css`
      :host {
        display: block;
      }
    `,
  ],
}) {
  /** Пункты из слота в порядке документа. */
  private readonly items = signal<AccordionItem[]>([], { equals: sameItems });
  private syncSlot = () => {};

  constructor() {
    super();
    // toggle пункта не всплывает, поэтому ловим его на фазе перехвата. Чужие события
    // (вложенный аккордеон, нативный toggle у <details> и поповеров) отсекает проверка
    // по списку своих пунктов.
    this.addEventListener("toggle", (event) => this.onItemToggle(event), true);
    this.addEventListener("keydown", (event) => this.onKeydown(event));
  }

  override connectedCallback() {
    super.connectedCallback();
    // slotchange не обязан прийти для детей, которые уже лежали в хосте до рендера.
    this.syncSlot();
  }

  private onItemToggle(event: Event) {
    const item = event.target as AccordionItem;
    const items = this.items.peek();
    if (!items.includes(item)) return;

    const detail = (event as CustomEvent<AccordionToggleDetail>).detail;
    this.events.toggle(detail);
    if (!detail.open || this.props.multiple.peek()) return;
    // Сворачиваем соседей их же событием — слушатели узнают и об этих закрытиях.
    for (const other of items) if (other !== item) setOpen(other, false);
  }

  private onKeydown(event: KeyboardEvent) {
    // Пункт ищем по пути события: клавиша нажата на кнопке в его теневом корне.
    const items = this.items.peek();
    const item = event.composedPath().find((target) => items.includes(target as AccordionItem));
    const index = items.indexOf(item as AccordionItem);
    if (index < 0) return;

    let target: AccordionItem | undefined;
    if (event.key === "ArrowDown") target = items[(index + 1) % items.length];
    else if (event.key === "ArrowUp") target = items[(index - 1 + items.length) % items.length];
    else if (event.key === "Home") target = items[0];
    else if (event.key === "End") target = items[items.length - 1];
    if (!target) return;

    event.preventDefault();
    triggerOf(target)?.focus();
  }

  render() {
    const itemSlot = slot({ "@slotchange": () => this.syncSlot() });
    this.syncSlot = () =>
      this.items.set(
        itemSlot.assignedElements().filter((el): el is AccordionItem => el instanceof AccordionItem),
      );
    return itemSlot;
  }
}

const [accordionItemFactory, registerAccordionItem] = configCustomComponent(
  AccordionItem,
  "rwc-accordion-item",
);
const [accordionFactory, registerAccordionOnly] = configCustomComponent(Accordion, "rwc-accordion");

export const rwcAccordionItem = accordionItemFactory;
export const rwcAccordion = accordionFactory;

/**
 * Регистрирует rwc-accordion и rwc-accordion-item под одним постфиксом. Пункт
 * регистрируется первым, чтобы к рендеру аккордеона его дети уже были апгрейднуты.
 * Возвращает тег rwc-accordion.
 */
export const registerAccordion = (options?: RegisterOptions): CustomTagName => {
  registerAccordionItem(options);
  return registerAccordionOnly(options);
};

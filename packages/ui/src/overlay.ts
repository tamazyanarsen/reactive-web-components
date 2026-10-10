import { css, onCleanup } from "@rwcjs/core";

// Общее для оверлеев кита: popover, dropdown-menu, dialog, tooltip.

/** Элемент с фокусом с учётом теневых корней: document.activeElement останавливается на хосте. */
export const deepActiveElement = (): HTMLElement | null => {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active instanceof HTMLElement ? active : null;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** Хост с delegatesFocus (кнопки кита и т.п.) фокусируем как обычный контрол. */
const isFocusable = (element: Element) =>
  element.matches(FOCUSABLE) || !!element.shadowRoot?.delegatesFocus;

/**
 * Фокусирует первый фокусируемый элемент среди содержимого слотов, иначе fallback.
 * Содержимое слотов живёт в светлом DOM, поэтому обходим назначенные элементы, а не теневой корень.
 */
export const focusFirstIn = (slots: HTMLSlotElement[], fallback: HTMLElement) => {
  for (const slotElement of slots) {
    for (const assigned of slotElement.assignedElements({ flatten: true })) {
      const target = isFocusable(assigned) ? assigned : [...assigned.querySelectorAll("*")].find(isFocusable);
      if (target instanceof HTMLElement) {
        target.focus();
        return;
      }
    }
  }
  fallback.focus();
};

/**
 * Верхний слой без JS-раскладки: Popover API поднимает панель над всем, а привязать её к
 * триггеру умеет только CSS anchor positioning. Где его нет, панель остаётся обычным
 * absolute-блоком внутри хоста — верхнего слоя нет, зато она стоит рядом с триггером.
 */
export const supportsTopLayer = () =>
  typeof HTMLElement.prototype.showPopover === "function" &&
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("anchor-name: --a") &&
  CSS.supports("position-area: bottom");

/**
 * Раскладка панели относительно триггера (.trigger) по атрибутам хоста placement и align.
 * Панель — .panel; в режиме верхнего слоя у неё есть атрибут popover.
 */
export const anchoredPanelStyles = css`
  :host {
    position: relative;
    display: inline-block;
  }

  .trigger {
    display: inline-block;
    anchor-name: --trigger;
  }

  .panel {
    z-index: 50;
    min-width: max-content;
    border: 1px solid var(--_border);
    border-radius: var(--_radius);
    background: var(--_surface);
    color: var(--_text);
    box-shadow: var(--_shadow);
    animation: panel-in var(--_duration) ease-out;
  }

  @keyframes panel-in {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }

  /* Запасной режим: absolute внутри хоста. */
  .panel:not([popover]) {
    position: absolute;
    display: none;
  }
  :host([open]) .panel:not([popover]) {
    display: block;
  }

  :host(:not([placement])) .panel:not([popover]),
  :host([placement="bottom"]) .panel:not([popover]) {
    top: 100%;
    margin-top: calc(var(--_space) / 2);
  }
  :host([placement="top"]) .panel:not([popover]) {
    bottom: 100%;
    margin-bottom: calc(var(--_space) / 2);
  }
  :host([placement="right"]) .panel:not([popover]) {
    left: 100%;
    margin-left: calc(var(--_space) / 2);
  }
  :host([placement="left"]) .panel:not([popover]) {
    right: 100%;
    margin-right: calc(var(--_space) / 2);
  }

  :host(:is(:not([placement]), [placement="bottom"], [placement="top"])) .panel:not([popover]) {
    left: 0;
  }
  :host(:is(:not([placement]), [placement="bottom"], [placement="top"])[align="end"]) .panel:not([popover]) {
    left: auto;
    right: 0;
  }
  :host(:is(:not([placement]), [placement="bottom"], [placement="top"])[align="center"]) .panel:not([popover]) {
    left: 50%;
    translate: -50% 0;
  }
  :host(:is([placement="left"], [placement="right"])) .panel:not([popover]) {
    top: 0;
  }
  :host(:is([placement="left"], [placement="right"])[align="end"]) .panel:not([popover]) {
    top: auto;
    bottom: 0;
  }
  :host(:is([placement="left"], [placement="right"])[align="center"]) .panel:not([popover]) {
    top: 50%;
    translate: 0 -50%;
  }

  /* Верхний слой: панель привязана к триггеру через anchor positioning. */
  .panel[popover] {
    position-anchor: --trigger;
    inset: auto;
    margin: 0;
    position-area: block-end span-inline-end;
    margin-block-start: calc(var(--_space) / 2);
    position-try-fallbacks: flip-block, flip-inline;
  }
  :host([align="end"]) .panel[popover] {
    position-area: block-end span-inline-start;
  }
  :host([align="center"]) .panel[popover] {
    position-area: block-end;
  }
  :host([placement="top"]) .panel[popover] {
    position-area: block-start span-inline-end;
    margin: 0 0 calc(var(--_space) / 2);
  }
  :host([placement="top"][align="end"]) .panel[popover] {
    position-area: block-start span-inline-start;
  }
  :host([placement="top"][align="center"]) .panel[popover] {
    position-area: block-start;
  }
  :host([placement="right"]) .panel[popover] {
    position-area: inline-end span-block-end;
    margin: 0 0 0 calc(var(--_space) / 2);
  }
  :host([placement="right"][align="end"]) .panel[popover] {
    position-area: inline-end span-block-start;
  }
  :host([placement="right"][align="center"]) .panel[popover] {
    position-area: inline-end;
  }
  :host([placement="left"]) .panel[popover] {
    position-area: inline-start span-block-end;
    margin: 0 calc(var(--_space) / 2) 0 0;
  }
  :host([placement="left"][align="end"]) .panel[popover] {
    position-area: inline-start span-block-start;
  }
  :host([placement="left"][align="center"]) .panel[popover] {
    position-area: inline-start;
  }
`;

/** Слушатель, который живёт, пока жив эффект (то есть компонент или ветка, где он создан). */
export const listen = <K extends keyof GlobalEventHandlersEventMap>(
  target: EventTarget,
  type: K,
  handler: (event: GlobalEventHandlersEventMap[K]) => void,
  options?: AddEventListenerOptions,
) => {
  target.addEventListener(type, handler as EventListener, options);
  onCleanup(() => target.removeEventListener(type, handler as EventListener, options));
};

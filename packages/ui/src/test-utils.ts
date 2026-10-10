import { afterEach } from "bun:test";
import type { CustomTagName } from "@rwcjs/core";

/**
 * Общие помощники тестов кита. happy-dom не умеет ElementInternals, а почти все
 * компоненты форм на нём держатся, — поэтому здесь заглушка ровно того, что использует кит.
 */

export type FakeInternals = {
  readonly form: HTMLFormElement | null;
  value: unknown;
  validity: { valid: boolean; flags: ValidityStateFlags; message: string };
  states: Set<string>;
  setFormValue(value: unknown): void;
  setValidity(flags?: ValidityStateFlags, message?: string, anchor?: Element): void;
  checkValidity(): boolean;
  reportValidity(): boolean;
};

/** Последние internals каждого элемента — чтобы тест мог посмотреть значение формы. */
export const internalsOf = new WeakMap<Element, FakeInternals>();

const proto = HTMLElement.prototype as unknown as { attachInternals?: () => unknown };
if (typeof proto.attachInternals !== "function") {
  proto.attachInternals = function (this: HTMLElement) {
    const host = this;
    const internals: FakeInternals = {
      get form() {
        return host.closest("form");
      },
      value: null,
      validity: { valid: true, flags: {}, message: "" },
      states: new Set(),
      setFormValue(value) {
        internals.value = value;
      },
      setValidity(flags = {}, message = "", anchor?: Element) {
        // Как в браузере: якорь подсказки обязан лежать в теневом корне элемента —
        // иначе NotFoundError. Без этой проверки тесты пропускали вызов до вставки разметки.
        if (anchor && !host.shadowRoot?.contains(anchor)) {
          throw new DOMException("anchor is not in the shadow tree", "NotFoundError");
        }
        const invalid = Object.values(flags).some(Boolean);
        internals.validity = { valid: !invalid, flags, message: invalid ? message : "" };
      },
      checkValidity: () => internals.validity.valid,
      reportValidity: () => internals.validity.valid,
    };
    internalsOf.set(host, internals);
    return internals;
  };
}

/** Теги регистрируются глобально и навсегда, поэтому у каждого теста свой постфикс. */
let tagCounter = 0;
export const uniquePostfix = () => `t${tagCounter++}`;

export type Registrar = (options?: { postfix?: string }) => CustomTagName;

/** Регистрирует компонент кита под свежим тегом и возвращает этот тег. */
export const registerFresh = (register: Registrar) => register({ postfix: uniquePostfix() });

const mounted: Element[] = [];

/** Вставляет элемент в документ — без этого connectedCallback не сработает. */
export const mount = <T extends Element>(element: T): T => {
  document.body.append(element);
  mounted.push(element);
  return element;
};

afterEach(() => {
  for (const element of mounted) element.remove();
  mounted.length = 0;
});

/** Теневой корень компонента. */
export const shadow = (element: Element) => element.shadowRoot!;

/** Ждёт микрозадачи и таймеры нулевой задержки (уборку компонентов, отложенные эффекты). */
export const tick = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const press = (element: Element, key: string, init: KeyboardEventInit = {}) =>
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true, ...init }));

export const click = (element: Element) =>
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, button: 0 }));

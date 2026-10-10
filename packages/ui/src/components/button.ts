import { button, configCustomComponent, css, defineComponent, payload, slot, span, when } from "@rwcjs/core";
import { tokens } from "../tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Кнопка: <rwc-button variant="primary">Сохранить</rwc-button>.
 *
 * Участвует в формах как нативная: type="submit" отправляет форму, в которой лежит,
 * type="reset" сбрасывает её. Внутренняя <button> в теневом корне сама до внешней формы
 * не дотягивается, поэтому компонент form-associated и действует через internals.form.
 */
export class Button extends defineComponent({
  props: {
    /** Внешний вид. */
    variant: "secondary" as ButtonVariant,
    /** Размер. */
    size: "md" as ButtonSize,
    /** Поведение в форме: обычная кнопка, отправка или сброс. */
    type: "button" as "button" | "submit" | "reset",
    /** Отключает кнопку; клики не проходят, событие press не отправляется. */
    disabled: false,
    /** Показывает индикатор загрузки и блокирует нажатия, не меняя ширину кнопки. */
    loading: false,
  },
  events: {
    /** Нажатие на активную кнопку. */
    press: payload<MouseEvent>(),
  },
  reflect: ["variant", "size", "disabled", "loading"],
  form: true,
  shadow: { mode: "open", delegatesFocus: true },
  styles: [
    tokens,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--_space);
        width: 100%;
        min-height: var(--_control-height);
        padding: 0 calc(var(--_space) * 2);
        font: inherit;
        font-weight: 500;
        line-height: 1;
        border: 1px solid var(--_border);
        border-radius: var(--_radius);
        background: var(--_surface);
        color: var(--_text);
        cursor: pointer;
        transition:
          background var(--_duration),
          border-color var(--_duration),
          box-shadow var(--_duration);
      }

      button:hover {
        background: var(--_surface-muted);
      }

      :host([variant="primary"]) button {
        background: var(--_accent);
        border-color: var(--_accent);
        color: var(--_accent-contrast);
      }
      :host([variant="primary"]) button:hover {
        background: var(--_accent-hover);
        border-color: var(--_accent-hover);
      }

      :host([variant="ghost"]) button {
        background: transparent;
        border-color: transparent;
      }
      :host([variant="ghost"]) button:hover {
        background: var(--_surface-muted);
      }

      :host([variant="danger"]) button {
        background: var(--_danger);
        border-color: var(--_danger);
        /* Цвет поверхности: белый в светлой схеме, тёмный в тёмной, где danger светлый. */
        color: var(--_surface);
      }

      :host([size="sm"]) button {
        min-height: calc(var(--_control-height) - 8px);
        padding: 0 calc(var(--_space) * 1.5);
      }
      :host([size="lg"]) button {
        min-height: calc(var(--_control-height) + 8px);
        padding: 0 calc(var(--_space) * 3);
        font-size: 1rem;
      }

      :host([disabled]) button,
      :host([loading]) button {
        cursor: not-allowed;
      }
      :host([disabled]) button {
        opacity: 0.5;
      }

      .label {
        display: inline-flex;
        align-items: center;
        gap: var(--_space);
      }
      :host([loading]) .label {
        visibility: hidden;
      }

      .spinner {
        position: absolute;
        width: 1em;
        height: 1em;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
}) {
  render() {
    const { disabled, loading, type } = this.props;
    const blocked = () => disabled() || loading() || this.formDisabled();

    return button(
      {
        attrs: {
          type: "button",
          "aria-disabled": () => (blocked() ? "true" : null),
          "aria-busy": () => (loading() ? "true" : null),
        },
        "@click": (event) => {
          if (blocked()) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          const form = this.internals.form;
          if (type() === "submit") form?.requestSubmit();
          else if (type() === "reset") form?.reset();
          this.events.press(event);
        },
      },
      when(loading, () => span({ class: "spinner", attrs: { "aria-hidden": "true" } })),
      span({ class: "label" }, slot()),
    );
  }
}

export const [rwcButton, registerButton] = configCustomComponent(Button, "rwc-button");

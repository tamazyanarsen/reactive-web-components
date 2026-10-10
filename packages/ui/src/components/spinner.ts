import { configCustomComponent, css, defineComponent, span } from "@rwcjs/core";
import { tokens } from "../tokens";

export type SpinnerSize = "sm" | "md" | "lg";

/**
 * Индикатор загрузки без прогресса: <rwc-spinner label="Сохраняем"></rwc-spinner>.
 *
 * Цвет — currentColor, поэтому спиннер внутри кнопки или текста перекрашивается сам.
 * Скорость вращения привязана к --_duration: при reduced motion она обнуляется
 * и кольцо замирает, а смысл по-прежнему передают role="status" и подпись.
 */
export class Spinner extends defineComponent({
  props: {
    /** Размер. */
    size: "md" as SpinnerSize,
    /** Подпись для вспомогательных технологий. */
    label: "Loading",
  },
  reflect: ["size"],
  styles: [
    tokens,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        color: var(--_text-muted);
        --_size: 1.25rem;
      }
      :host([size="sm"]) {
        --_size: 1rem;
      }
      :host([size="lg"]) {
        --_size: 2rem;
      }

      .spinner {
        display: inline-flex;
      }

      .ring {
        width: var(--_size);
        height: var(--_size);
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin calc(var(--_duration) * 5) linear infinite;
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
    return span(
      { class: "spinner", attrs: { role: "status", "aria-label": this.props.label } },
      span({ class: "ring", attrs: { "aria-hidden": "true" } }),
    );
  }
}

export const [rwcSpinner, registerSpinner] = configCustomComponent(Spinner, "rwc-spinner");

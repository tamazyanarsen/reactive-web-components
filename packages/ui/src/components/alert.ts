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
  when,
} from "@rwcjs/core";
import { tokens } from "../tokens";

export type AlertVariant = "info" | "success" | "warning" | "danger";

/**
 * Сообщение в потоке страницы:
 *
 *   <rwc-alert variant="warning" heading="Почти закончилось место">Удалите старые файлы.</rwc-alert>
 *
 * Заголовок — пропс heading или слот "heading", иконка — слот "icon". Предупреждение
 * и ошибка получают role="alert" (озвучиваются сразу), остальное — role="status".
 * С dismissible появляется кнопка закрытия: она отправляет отменяемое событие dismiss
 * и, если его не отменили, прячет компонент атрибутом hidden.
 */
export class Alert extends defineComponent({
  props: {
    /** Смысл сообщения: определяет цвет и ARIA-роль. */
    variant: "info" as AlertVariant,
    /** Заголовок; вместо него можно передать слот "heading". */
    heading: "",
    /** Показывает кнопку закрытия. */
    dismissible: false,
    /** Подпись кнопки закрытия для вспомогательных технологий. */
    closeLabel: "Dismiss",
  },
  events: {
    /** Нажата кнопка закрытия; preventDefault() оставляет сообщение на месте. */
    dismiss: payload<void>(),
  },
  eventOptions: { dismiss: { cancelable: true } },
  reflect: ["variant", "dismissible"],
  styles: [
    tokens,
    css`
      :host {
        display: block;
        --_tone: var(--_accent);
      }
      :host([variant="success"]) {
        --_tone: var(--_success);
      }
      :host([variant="warning"]) {
        --_tone: var(--_warning);
      }
      :host([variant="danger"]) {
        --_tone: var(--_danger);
      }

      .alert {
        display: flex;
        align-items: flex-start;
        gap: calc(var(--_space) * 1.5);
        padding: calc(var(--_space) * 1.5) calc(var(--_space) * 2);
        border: 1px solid var(--_border);
        border-left: 3px solid var(--_tone);
        border-radius: var(--_radius);
        background: var(--_surface);
        color: var(--_text);
        line-height: 1.5;
      }

      .icon {
        display: inline-flex;
        color: var(--_tone);
      }
      .icon:not(.filled) {
        display: none;
      }

      .content {
        flex: 1;
        min-width: 0;
      }

      .heading {
        font-weight: 600;
      }
      .heading:not(.filled) {
        display: none;
      }

      .body {
        color: var(--_text-muted);
      }

      .close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        width: 1.5rem;
        height: 1.5rem;
        margin: calc(var(--_space) * -0.25) calc(var(--_space) * -0.5) 0 0;
        padding: 0;
        font: inherit;
        font-size: 1.125rem;
        line-height: 1;
        border: none;
        border-radius: var(--_radius-sm);
        background: transparent;
        color: var(--_text-muted);
        cursor: pointer;
        transition:
          background var(--_duration),
          color var(--_duration);
      }
      .close:hover {
        background: var(--_surface-muted);
        color: var(--_text);
      }
    `,
  ],
}) {
  render() {
    const { variant, heading, dismissible, closeLabel } = this.props;

    // Есть ли что-то в именованных слотах: пустые обёртки не должны давать отступов.
    const hasHeadingSlot = signal(this.querySelector(':scope > [slot="heading"]') !== null);
    const hasIconSlot = signal(this.querySelector(':scope > [slot="icon"]') !== null);
    const filled = (target: HTMLSlotElement) => target.assignedNodes().length > 0;

    return div(
      {
        class: "alert",
        attrs: { role: () => (variant() === "warning" || variant() === "danger" ? "alert" : "status") },
      },
      span(
        { class: ["icon", { filled: hasIconSlot }], attrs: { "aria-hidden": "true" } },
        slot({ ".name": "icon", "@slotchange": (event) => hasIconSlot.set(filled(event.currentTarget)) }),
      ),
      div(
        { class: "content" },
        div(
          { class: ["heading", { filled: () => hasHeadingSlot() || heading() !== "" }] },
          slot(
            { ".name": "heading", "@slotchange": (event) => hasHeadingSlot.set(filled(event.currentTarget)) },
            heading,
          ),
        ),
        div({ class: "body" }, slot()),
      ),
      when(dismissible, () =>
        button(
          {
            class: "close",
            attrs: { type: "button", "aria-label": closeLabel },
            "@click": () => {
              if (this.events.dismiss()) this.hidden = true;
            },
          },
          span({ attrs: { "aria-hidden": "true" } }, "×"),
        ),
      ),
    );
  }
}

export const [rwcAlert, registerAlert] = configCustomComponent(Alert, "rwc-alert");

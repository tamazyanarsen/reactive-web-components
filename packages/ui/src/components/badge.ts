import { configCustomComponent, css, defineComponent, slot, span } from "@rwcjs/core";
import { tokens } from "../tokens";

export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";
export type BadgeSize = "sm" | "md";

/**
 * Метка: <rwc-badge variant="success">Оплачен</rwc-badge>.
 *
 * Статусные варианты — мягкая заливка цветом статуса и текст тем же цветом: так метка
 * читается и на светлой, и на тёмной теме без отдельного контрастного цвета.
 */
export class Badge extends defineComponent({
  props: {
    /** Цвет метки. */
    variant: "neutral" as BadgeVariant,
    /** Размер. */
    size: "md" as BadgeSize,
  },
  reflect: ["variant", "size"],
  styles: [
    tokens,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        --_badge-color: var(--_text);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--_space) / 2);
        padding: 2px var(--_space);
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1rem;
        white-space: nowrap;
        border: 1px solid transparent;
        border-radius: 999px;
        color: var(--_badge-color);
        background: var(--_surface-muted);
      }

      :host([size="sm"]) .badge {
        padding: 0 calc(var(--_space) * 0.75);
        font-size: 0.6875rem;
      }

      :host([variant="accent"]) .badge {
        color: var(--_accent-contrast);
        background: var(--_accent);
      }

      :host([variant="success"]) {
        --_badge-color: var(--_success);
      }
      :host([variant="warning"]) {
        --_badge-color: var(--_warning);
      }
      :host([variant="danger"]) {
        --_badge-color: var(--_danger);
      }
      :host([variant="success"]) .badge,
      :host([variant="warning"]) .badge,
      :host([variant="danger"]) .badge {
        background: color-mix(in srgb, var(--_badge-color) 14%, transparent);
        border-color: color-mix(in srgb, var(--_badge-color) 30%, transparent);
      }
    `,
  ],
}) {
  render() {
    return span({ class: "badge", attrs: { part: "badge" } }, slot());
  }
}

export const [rwcBadge, registerBadge] = configCustomComponent(Badge, "rwc-badge");

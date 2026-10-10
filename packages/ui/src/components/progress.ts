import { computed, configCustomComponent, css, defineComponent, div } from "@rwcjs/core";
import { tokens } from "../tokens";

export type ProgressVariant = "accent" | "success" | "warning" | "danger";

/**
 * Полоса прогресса: <rwc-progress value="40" label="Загрузка файла"></rwc-progress>.
 *
 * Неопределённое состояние — value равен null (по умолчанию, как у нативного <progress>
 * без value) или любому отрицательному числу: -1 удобно писать в атрибуте. Тогда
 * aria-valuenow не выставляется — так ARIA и описывает неизвестный прогресс.
 * Значение зажимается в [0, max].
 */
export class Progress extends defineComponent({
  props: {
    /** Текущее значение; null или отрицательное число — неопределённый прогресс. */
    value: null as number | null,
    /** Максимум шкалы. */
    max: 100,
    /** Подпись для вспомогательных технологий. */
    label: "",
    /** Цвет заполнения. */
    variant: "accent" as ProgressVariant,
  },
  reflect: ["variant"],
  styles: [
    tokens,
    css`
      :host {
        display: block;
        --_fill: var(--_accent);
      }
      :host([variant="success"]) {
        --_fill: var(--_success);
      }
      :host([variant="warning"]) {
        --_fill: var(--_warning);
      }
      :host([variant="danger"]) {
        --_fill: var(--_danger);
      }

      .track {
        position: relative;
        height: calc(var(--_space) * 0.75);
        overflow: hidden;
        border-radius: 999px;
        background: var(--_surface-muted);
      }

      .bar {
        height: 100%;
        border-radius: inherit;
        background: var(--_fill);
        transition: width calc(var(--_duration) * 2) ease-out;
      }

      .indeterminate .bar {
        position: absolute;
        width: 40%;
        animation: slide calc(var(--_duration) * 10) ease-in-out infinite;
      }

      @keyframes slide {
        from {
          left: -40%;
        }
        to {
          left: 100%;
        }
      }
    `,
  ],
}) {
  render() {
    const { value, max, label } = this.props;

    const safeMax = computed(() => (max() > 0 ? max() : 100));
    // null, отрицательное или не число — прогресс неизвестен.
    const current = computed(() => {
      const raw = value();
      if (raw === null || typeof raw !== "number" || Number.isNaN(raw) || raw < 0) return null;
      return Math.min(raw, safeMax());
    });

    return div(
      {
        class: ["track", { indeterminate: () => current() === null }],
        attrs: {
          role: "progressbar",
          "aria-label": () => label() || null,
          "aria-valuemin": "0",
          "aria-valuemax": () => String(safeMax()),
          "aria-valuenow": () => {
            const now = current();
            return now === null ? null : String(now);
          },
        },
      },
      div({
        class: "bar",
        style: {
          width: () => {
            const now = current();
            return now === null ? null : `${(now / safeMax()) * 100}%`;
          },
        },
      }),
    );
  }
}

export const [rwcProgress, registerProgress] = configCustomComponent(Progress, "rwc-progress");

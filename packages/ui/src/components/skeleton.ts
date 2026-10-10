import { computed, configCustomComponent, css, defineComponent, div, each } from "@rwcjs/core";
import { tokens } from "../tokens";

export type SkeletonShape = "text" | "rect" | "circle";

/**
 * Заглушка на месте загружаемого содержимого: <rwc-skeleton shape="text" lines="3"></rwc-skeleton>.
 *
 * Сам скелетон декоративен и скрыт от вспомогательных технологий (aria-hidden). О загрузке
 * сообщает контейнер: пока внутри скелетоны, приложение ставит ему aria-busy="true",
 * а когда приходят данные — снимает; читалка озвучит готовое содержимое один раз.
 */
export class Skeleton extends defineComponent({
  props: {
    /** Форма: строки текста, прямоугольник или круг. */
    shape: "text" as SkeletonShape,
    /** Ширина — любая CSS-длина; по умолчанию вся доступная (у круга — как высота). */
    width: "",
    /** Высота — любая CSS-длина; по умолчанию высота строки или 2.5rem у круга. */
    height: "",
    /** Число строк для shape="text"; последняя строка короче, чтобы походить на абзац. */
    lines: 1,
  },
  reflect: ["shape"],
  styles: [
    tokens,
    css`
      :host {
        display: block;
      }
      :host([shape="circle"]) {
        display: inline-block;
      }

      .skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--_space);
      }

      .block {
        height: 1em;
        border-radius: var(--_radius-sm);
        background: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in srgb, var(--_surface) 60%, transparent) 50%,
            transparent 100%
          )
          var(--_surface-muted);
        background-size: 200% 100%;
        background-repeat: no-repeat;
        animation: shimmer calc(var(--_duration) * 10) linear infinite;
      }

      .line:last-child:not(:first-child) {
        width: 60%;
      }

      :host([shape="rect"]) .block {
        height: 6rem;
        border-radius: var(--_radius);
      }
      :host([shape="circle"]) .block {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
      }

      @keyframes shimmer {
        from {
          background-position: 150% 0;
        }
        to {
          background-position: -50% 0;
        }
      }
    `,
  ],
}) {
  render() {
    const { shape, width, height, lines } = this.props;

    // Индексы строк: у прямоугольника и круга блок всегда один.
    const rows = computed(() => {
      const count = shape() === "text" ? Math.max(1, Math.floor(lines()) || 1) : 1;
      return Array.from({ length: count }, (_, index) => index);
    });

    // У круга заданная одна сторона растягивает обе — иначе получится эллипс.
    const blockWidth = () => width() || (shape() === "circle" ? height() : "") || null;
    const blockHeight = () => height() || (shape() === "circle" ? width() : "") || null;

    return div(
      { class: "skeleton", attrs: { "aria-hidden": "true" }, style: { width: blockWidth } },
      each(rows, () =>
        div({
          class: ["block", { line: () => shape() === "text" }],
          style: { height: blockHeight, width: () => (shape() === "circle" ? blockWidth() : null) },
        }),
      ),
    );
  }
}

export const [rwcSkeleton, registerSkeleton] = configCustomComponent(Skeleton, "rwc-skeleton");

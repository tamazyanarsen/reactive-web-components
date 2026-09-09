/**
 * Оценка звёздами: each поверх производного списка, наведение как отдельный сигнал.
 *
 * Список звёзд вычисляется из пропса max, поэтому «сделать из пяти десять» — это
 * одна запись в проп: each достроит недостающие узлы, а существующие переиспользует.
 */
import {
  defineComponent,
  payload,
  useCustomComponent,
} from "../src/shared/components/custom/custom-element";
import { button, cls, computed, css, div, each, span } from "../src/shared/components/html";
import { signal } from "../src/shared/signals";
import { BASE_CSS, type Example } from "./shared";

const CSS = css`
  :host { display: inline-block; }
  .rating { display: inline-flex; align-items: center; gap: 4px; }
  .star {
    padding: 0 2px; border: 0; background: none; font-size: 26px; line-height: 1;
    color: var(--border); transition: color .12s, transform .12s;
  }
  .star.on { color: var(--warn); }
  .star.preview { transform: scale(1.12); }
  .star:disabled { opacity: 1; cursor: default; }
  .caption { margin-left: 10px; color: var(--muted); font-size: 13px; }
`;

export class StarRating extends defineComponent({
  props: { value: 0, max: 5, readonly: false },
  events: { change: payload<number>() },
  styles: [BASE_CSS, CSS],
}) {
  /** Наведение — состояние компонента, наружу его знать незачем. */
  private hovered = signal(0);

  render() {
    const { value, max, readonly } = this.props;

    /** Источником списка для each годится любая функция — сигнал тут не нужен. */
    const stars = () => Array.from({ length: max() }, (_, index) => index + 1);
    /** Что показываем: наведение важнее выбранного значения. Читают трижды — значит computed. */
    const shown = computed(() => this.hovered() || value());

    const pick = (star: number) => {
      if (readonly()) return;
      // Повторный клик по той же звезде снимает оценку — привычное поведение.
      const next = star === value() ? 0 : star;
      value.set(next);
      this.events.change(next);
    };

    return div(
      {
        class: "rating",
        attrs: {
          role: "slider",
          "aria-valuemin": 0,
          "aria-valuemax": max,
          "aria-valuenow": value,
        },
        // Уводя курсор, гасим предпросмотр — иначе он застрянет на последней звезде.
        "@pointerleave": () => this.hovered.set(0),
      },
      each(
        stars,
        (star) =>
          button(
            {
              class: [
                "star",
                { on: () => star() <= shown(), preview: () => this.hovered() >= star() },
              ],
              ".disabled": readonly,
              attrs: { "aria-label": () => `${star()} из ${max()}` },
              "@click": () => pick(star()),
              "@pointerenter": () => !readonly() && this.hovered.set(star()),
            },
            "★",
          ),
        // Ключ по умолчанию — сам элемент; для чисел это уже уникальный ключ,
        // поэтому getKey здесь не нужен.
      ),
      span(cls`caption`, () => (shown() ? `${shown()} из ${max()}` : "без оценки")),
    );
  }
}

export const starRating = useCustomComponent(StarRating, "x-rating");

// --- демонстрация ---------------------------------------------------------------

const DEMO_CSS = css`
  .reviews { display: grid; gap: 10px; margin-top: 14px; }
  .review { display: flex; align-items: center; gap: 12px; }
  .review .who { min-width: 120px; font-weight: 600; }
  .avg { font: 600 15px ui-monospace, monospace; color: var(--ok); }
`;

type Review = { id: number; who: string; score: number };

const reviews = signal<Review[]>([
  { id: 1, who: "Ирина", score: 5 },
  { id: 2, who: "Павел", score: 3 },
  { id: 3, who: "Дана", score: 4 },
]);

const myScore = signal(0);
const maxStars = signal(5);

class RatingDemo extends defineComponent({ props: {}, styles: [BASE_CSS, DEMO_CSS] }) {
  render() {
    const average = computed(() => {
      const list = reviews();
      return list.reduce((sum, review) => sum + review.score, 0) / list.length;
    });

    return div(
      {},
      div(
        cls`row`,
        span(cls`label`, "Ваша оценка"),
        starRating({
          ".value": myScore,
          ".max": maxStars,
          "@change": (event) => myScore.set(event.detail),
        }),
      ),
      div(
        cls`row`,
        button(
          { "@click": () => maxStars.update((value) => (value === 5 ? 10 : 5)) },
          "5 ↔ 10 звёзд",
        ),
        span(cls`muted`, "each дорисует звёзды, уже стоящие узлы останутся на месте"),
      ),
      div(
        cls`reviews`,
        each(
          reviews,
          (review) =>
            div(
              cls`review`,
              // Ребёнок: обычной функции достаточно, реактивным её делает сама позиция.
              span(cls`who`, () => review().who),
              // А это проп компонента — там функция была бы значением, нужен сигнал.
              starRating({ ".value": computed(() => review().score), ".readonly": true }),
            ),
          (review) => review.id,
        ),
      ),
      div(
        cls`row`,
        span(cls`avg`, () => average().toFixed(2)),
        span(cls`muted`, "средняя оценка — computed поверх списка"),
      ),
    );
  }
}

const ratingDemo = useCustomComponent(RatingDemo, "rating-demo");

export const example: Example = {
  title: "StarRating — each поверх производного списка",
  file: "examples/rating.ts",
  hint:
    "Звёзды — производный массив от пропса max, наведение живёт в собственном сигнале " +
    "компонента. Тот же компонент работает и как индикатор: достаточно readonly.",
  mount: ratingDemo,
};

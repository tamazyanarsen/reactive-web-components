/**
 * Счётчик с границами: пропсы, события, производные значения.
 *
 * Компонент неуправляемый: он сам пишет в свой проп value и лишь уведомляет наружу
 * событием change. Управляемый вариант (родитель хранит значение, компонент только
 * шлёт событие) показан в playground.ts — там это counter-card.
 */
import {
  defineComponent,
  payload,
  useCustomComponent,
} from "../src/shared/components/custom/custom-element";
import { button, cls, computed, css, div, span, strong } from "../src/shared/components/html";
import { signal } from "../src/shared/signals";
import { BASE_CSS, type Example } from "./shared";

const CSS = css`
  :host { display: inline-block; }
  .counter { display: flex; align-items: center; gap: 12px; }
  .value {
    font: 600 26px/1 ui-monospace, monospace; min-width: 3ch; text-align: center;
    color: var(--accent); transition: color .15s;
  }
  .value.at-limit { color: var(--warn); }
  .step { width: 34px; height: 34px; padding: 0; border-radius: 50%; font-size: 18px; line-height: 1; }
`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export class Counter extends defineComponent({
  // Значения по умолчанию задают и типы пропсов, и список observedAttributes:
  // <x-counter max="5"> разберётся по типу начального значения и станет числом.
  props: { value: 0, step: 1, min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY },
  events: { change: payload<number>() },
  // Массив стилей: сначала общая база галереи, потом собственные правила.
  // Ровно то же самое можно объявить как `static override styles = [...]`.
  styles: [BASE_CSS, CSS],
}) {
  render() {
    const { value, step, min, max } = this.props;

    // computed, а не обычная функция: каждое значение читают в двух местах — в
    // .disabled кнопки и в условии класса, — и пересчитывать его дважды незачем.
    const atMin = computed(() => value() <= min());
    const atMax = computed(() => value() >= max());

    const shift = (direction: number) => {
      const next = clamp(value() + direction * step(), min(), max());
      // Упёрлись в границу — ни записи, ни события: снаружи не должно быть ложных change.
      if (next === value()) return;
      value.set(next);
      this.events.change(next);
    };

    // Обёртки вокруг разметки нет: стили приезжают из styles, а render волен вернуть
    // хоть один элемент, хоть фрагмент, хоть массив узлов.
    return div(
      cls`counter`,
      button(
        {
          class: "step",
          ".disabled": atMin,
          attrs: { "aria-label": "убавить" },
          "@click": () => shift(-1),
        },
        "−",
      ),
      span(
        {
          // Токен ставится, пока условие истинно: функция, а не заранее посчитанное значение.
          class: ["value", { "at-limit": () => atMin() || atMax() }],
          attrs: { role: "status" },
        },
        value,
      ),
      button(
        {
          class: "step",
          ".disabled": atMax,
          attrs: { "aria-label": "прибавить" },
          "@click": () => shift(1),
        },
        "+",
      ),
    );
  }
}

export const counter = useCustomComponent(Counter, "x-counter");

// --- демонстрация ---------------------------------------------------------------

const DEMO_CSS = css`
  .line { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .line + .line { margin-top: 14px; }
  .total { font: 600 15px ui-monospace, monospace; color: var(--ok); }
`;

/** Состояние стенда живёт вне компонента: переживает пересборку разметки. */
const guests = signal(2);
const nights = signal(1);
const lastEvent = signal("событий ещё не было");

const PRICE_PER_NIGHT = 3500;

class CounterDemo extends defineComponent({ props: {}, styles: [BASE_CSS, DEMO_CSS] }) {
  render() {
    const total = computed(() => guests() * nights() * PRICE_PER_NIGHT);

    return div(
      {},
      div(
        cls`line`,
        span(cls`label`, "Гостей"),
        counter({
          // Двусторонняя связь: сигнал уезжает в проп, событие возвращает значение обратно.
          // Зацикливания нет — set тем же значением отсекается в сигнале.
          ".value": guests,
          ".min": 1,
          ".max": 6,
          "@change": (event) => {
            guests.set(event.detail);
            lastEvent.set(`гости → ${event.detail}`);
          },
        }),
        span(cls`muted`, "от 1 до 6 — кнопки гаснут на границах"),
      ),
      div(
        cls`line`,
        span(cls`label`, "Ночей"),
        counter({
          ".value": nights,
          ".min": 1,
          ".max": 30,
          ".step": 2,
          "@change": (event) => {
            nights.set(event.detail);
            lastEvent.set(`ночи → ${event.detail}`);
          },
        }),
        span(cls`muted`, "шаг 2"),
      ),
      div(
        cls`line`,
        // Выражение читают в одном месте — хватит обычной функции, computed тут лишний.
        span(cls`total`, () => `${total().toLocaleString("ru-RU")} ₽`),
        span(cls`muted`, "— один computed поверх двух пропсов"),
      ),
      div(cls`line muted`, "последнее событие: ", strong(cls`mono`, lastEvent)),
    );
  }
}

const counterDemo = useCustomComponent(CounterDemo, "counter-demo");

export const example: Example = {
  title: "Counter — пропсы, события, границы",
  file: "examples/counter.ts",
  hint:
    "Компонент сам меняет свой проп и шлёт change. Кнопки гаснут через computed, " +
    "родитель держит то же значение в своём сигнале — связь двусторонняя.",
  mount: counterDemo,
};

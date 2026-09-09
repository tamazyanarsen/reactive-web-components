/**
 * Секундомер: эффект с таймером, уборка в onCleanup, batch и списочный рендер.
 *
 * Главное здесь — жизненный цикл. Интервал создаётся внутри эффекта компонента,
 * поэтому его снимает и перезапуск эффекта (пауза), и размонтирование компонента:
 * зависшего setInterval после удаления узла из DOM не остаётся.
 */
import {
  defineComponent,
  payload,
  useCustomComponent,
} from "../src/shared/components/custom/custom-element";
import { button, cls, css, div, each, li, span, ul, when } from "../src/shared/components/html";
import { batch, onCleanup, signal } from "../src/shared/signals";
import { BASE_CSS, type Example } from "./shared";

const CSS = css`
  .display {
    font: 600 40px/1 ui-monospace, monospace; color: var(--accent);
    letter-spacing: .02em; margin-bottom: 14px;
  }
  .display.paused { color: var(--muted); }
  .primary { min-width: 96px; }
  .laps { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 6px; }
  .lap {
    display: grid; grid-template-columns: 3ch 1fr auto; gap: 10px; align-items: baseline;
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px;
    font-family: ui-monospace, monospace;
  }
  .lap .num { color: var(--muted); }
  .lap .split { color: var(--ok); }
`;

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/** мс -> мм:сс.цц */
const format = (ms: number) => {
  const centiseconds = Math.floor(ms / 10) % 100;
  const totalSeconds = Math.floor(ms / 1000);
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}.${pad(centiseconds)}`;
};

type Lap = { id: number; at: number };

let nextLapId = 1;

export class Stopwatch extends defineComponent({
  props: { running: false, tick: 50 },
  events: { lap: payload<number>() },
  styles: [BASE_CSS, CSS],
}) {
  /**
   * Состояние — поля экземпляра, а не локальные переменные render(): при повторном
   * подключении к DOM компонент рендерится заново, и накопленное время должно уцелеть.
   */
  private elapsed = signal(0);
  private laps = signal<Lap[]>([]);

  render() {
    const { running, tick } = this.props;

    this.addEffect(() => {
      // Читаем условие первой строкой: подписка оформляется на прогоне, а не после return.
      if (!running()) return;

      // peek, а не вызов: иначе эффект подписался бы на собственный тик,
      // перезапускался бы каждые 50 мс и пересоздавал интервал.
      const startedAt = performance.now() - this.elapsed.peek();

      // Опорная точка, а не elapsed += tick: setInterval врёт, ошибка копилась бы.
      const timerId = setInterval(() => this.elapsed.set(performance.now() - startedAt), tick());

      // Снимется и на паузе (перезапуск эффекта), и при размонтировании (destroy).
      onCleanup(() => clearInterval(timerId));
    });

    const addLap = () => {
      const at = this.elapsed();
      // Новый круг сверху: update читает предыдущее значение без подписки на него.
      this.laps.update((list) => [{ id: nextLapId++, at }, ...list]);
      this.events.lap(at);
    };

    const reset = () =>
      // batch: три записи — один прогон подписчиков, а не три.
      batch(() => {
        running.set(false);
        this.elapsed.set(0);
        this.laps.set([]);
      });

    // Корневой обёртки нет: render волен вернуть массив узлов.
    return [
      div(
        { class: ["display", { paused: () => !running() }], attrs: { role: "timer" } },
        () => format(this.elapsed()),
      ),
      div(
        cls`row`,
        button(
          { class: "primary", "@click": () => running.update((value) => !value) },
          () => (running() ? "пауза" : "старт"),
        ),
        button({ ".disabled": () => !running(), "@click": addLap }, "круг"),
        button({ ".disabled": () => this.elapsed() === 0, "@click": reset }, "сброс"),
      ),
      when(
        () => this.laps().length > 0,
        () =>
          ul(
            cls`laps`,
            each(
              this.laps,
              (lap, index) =>
                li(
                  cls`lap`,
                  // Номер круга: список хранится задом наперёд, считаем от длины.
                  span(cls`num`, () => `#${this.laps().length - index()}`),
                  span(() => format(lap().at)),
                  span(cls`split`, () => {
                    // Предыдущий по времени круг лежит следующим в массиве.
                    const previous = this.laps()[index() + 1];
                    return `+${format(lap().at - (previous?.at ?? 0))}`;
                  }),
                ),
              (lap) => lap.id,
            ),
          ),
      ),
    ];
  }
}

export const stopwatch = useCustomComponent(Stopwatch, "x-stopwatch");

// --- демонстрация ---------------------------------------------------------------

const DEMO_CSS = css`
  .slot { margin-top: 14px; }
  .log { margin-top: 12px; font-family: ui-monospace, monospace; color: var(--muted); }
`;

const mounted = signal(true);
const lastLap = signal("кругов ещё не было");

class StopwatchDemo extends defineComponent({ props: {}, styles: [BASE_CSS, DEMO_CSS] }) {
  render() {
    return div(
      {},
      div(
        cls`row`,
        button(
          { "@click": () => mounted.update((value) => !value) },
          () => (mounted() ? "размонтировать" : "смонтировать"),
        ),
        span(cls`muted`, "проверьте: на паузе и после размонтирования таймер не тикает"),
      ),
      div(
        cls`slot`,
        // when пересобирает ветку в собственном скоупе — компонент действительно
        // удаляется из DOM, а с ним умирают его эффекты и интервал.
        when(
          mounted,
          () =>
            stopwatch({
              ".running": true,
              "@lap": (event) => lastLap.set(`круг на ${format(event.detail)}`),
            }),
          () => div(cls`note`, "секундомер размонтирован — новый экземпляр начнёт с нуля"),
        ),
      ),
      div(cls`log`, "событие lap: ", lastLap),
    );
  }
}

const stopwatchDemo = useCustomComponent(StopwatchDemo, "stopwatch-demo");

export const example: Example = {
  title: "Stopwatch — таймер, onCleanup, batch",
  file: "examples/stopwatch.ts",
  hint:
    "Интервал живёт внутри эффекта и снимается в onCleanup — и на паузе, и при " +
    "размонтировании. Сброс тремя записями завёрнут в batch, круги рисует each по ключу.",
  mount: stopwatchDemo,
};

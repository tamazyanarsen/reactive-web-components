/**
 * Функциональные компоненты: createComponent.
 *
 * Функциональный компонент — просто функция, возвращающая элемент. Своего тега,
 * теневого корня и наблюдаемых атрибутов у него нет, поэтому он дешевле
 * веб-компонента и годится для кусков разметки, а не для самостоятельных единиц UI.
 *
 * Что даёт обёртка createComponent: к пропсам добавляются class, attrs, style и show,
 * и она сама вешает их на корневой элемент. Благодаря этому вызов выглядит так же,
 * как вызов обычной фабрики тега, и компонент можно оформлять снаружи.
 *
 * Чего у него нет — изоляции стилей. Разметка попадает в теневой корень того
 * компонента, который его вызвал, и оформляется его же CSS. Это не недостаток, а
 * ровно та причина, по которой такие компоненты и берут: им нужны стили хозяина.
 *
 * Эффекты, созданные внутри, тоже принадлежат вызвавшему компоненту — значит
 * умирают вместе с ним, и отдельной уборки не требуют.
 */
import { createComponent } from "../src/shared/components/custom/fn-component";
import {
  defineComponent,
  useCustomComponent,
} from "../src/shared/components/custom/custom-element";
import {
  button,
  cls,
  computed,
  css,
  div,
  each,
  type ElementChild,
  h3,
  span,
  strong,
} from "../src/shared/components/html";
import { signal, type ReadonlySignal } from "../src/shared/signals";
import { BASE_CSS, type Example } from "./shared";

const CSS = css`
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
  .stat {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 12px;
  }
  .stat .title { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  .stat .value { font: 600 22px/1.2 ui-monospace, monospace; color: var(--accent); }
  .stat.warn .value { color: var(--warn); }

  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    border-radius: 999px; padding: 3px 10px; font-size: 12px;
    border: 1px solid currentColor;
  }
  .badge.ok { color: var(--ok); }
  .badge.warn { color: var(--warn); }
  .badge.err { color: var(--err); }

  .panel { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .panel > .head {
    display: flex; align-items: center; gap: 10px; width: 100%;
    background: var(--raised); border: 0; border-radius: 0; text-align: left;
  }
  .panel > .body { padding: 12px 14px; display: grid; gap: 8px; }
  .chevron { margin-left: auto; transition: transform .15s; }
  .chevron.open { transform: rotate(90deg); }

  h3 { margin: 0 0 10px; font-size: 14px; }
`;

// --- сами функциональные компоненты -----------------------------------------------

type Tone = "ok" | "warn" | "err";

/**
 * Плитка с показателем. Значение приходит источником, а не числом: тогда меняется
 * только текст, а узлы плитки живут дальше.
 */
const Stat = createComponent((props: { title: string; value: ReadonlySignal<string> }) =>
  div(
    cls`stat`,
    div(cls`title`, props.title),
    div(cls`value`, props.value),
  ),
);

/** Значок состояния. Детей принимает как обычная фабрика тега. */
const Badge = createComponent((props: { tone: Tone }, ...children: ElementChild[]) =>
  span({ class: ["badge", props.tone] }, ...children),
);

/**
 * Раскрывающаяся панель с собственным состоянием.
 *
 * Сигнал создаётся на каждый вызов, то есть у каждой панели он свой. Содержимое не
 * уничтожается, а прячется через show — так переключение не теряет ни состояние
 * вложенных полей, ни позицию прокрутки.
 */
const Collapsible = createComponent(
  (props: { title: string; opened?: boolean }, ...children: ElementChild[]) => {
    const open = signal(props.opened ?? false);

    return div(
      cls`panel`,
      button(
        {
          class: "head",
          attrs: { "aria-expanded": open },
          "@click": () => open.update((value) => !value),
        },
        strong(props.title),
        span({ class: ["chevron", { open }] }, "›"),
      ),
      div({ class: "body", show: open }, ...children),
    );
  },
);

// --- демонстрация ---------------------------------------------------------------

type ServerNode = { id: number; name: string; load: number };

const nodes = signal<ServerNode[]>([
  { id: 1, name: "eu-1", load: 42 },
  { id: 2, name: "eu-2", load: 88 },
  { id: 3, name: "ap-1", load: 17 },
]);

const shuffleLoad = () =>
  nodes.update((list) =>
    list.map((node) => ({ ...node, load: Math.floor(Math.random() * 100) })),
  );

class FunctionComponentsDemo extends defineComponent({
  props: {},
  styles: [BASE_CSS, CSS],
}) {
  render() {
    const total = computed(() => nodes().length);
    const busiest = computed(() =>
      nodes().reduce((worst, node) => (node.load > worst.load ? node : worst)),
    );
    const averageLoad = computed(
      () => nodes().reduce((sum, node) => sum + node.load, 0) / nodes().length,
    );

    return div(
      {},
      h3("Показатели"),
      div(
        cls`grid`,
        // Пропсы обычные, а class/style/show обёртка добавила сама.
        Stat({ title: "Узлов", value: computed(() => String(total())) }),
        Stat({
          title: "Средняя нагрузка",
          value: computed(() => `${averageLoad().toFixed(0)}%`),
          // Модификатор извне: корневой элемент компонента оформляет вызывающий.
          class: { warn: () => averageLoad() > 60 },
        }),
        Stat({ title: "Самый загруженный", value: computed(() => busiest().name) }),
      ),

      div(
        cls`row`,
        button({ "@click": shuffleLoad }, "перемешать нагрузку"),
        // show из обёртки: значок не удаляется, а прячется через display.
        Badge({ tone: "err", show: () => averageLoad() > 60 }, "нагрузка выше нормы"),
        Badge({ tone: "ok", show: () => averageLoad() <= 60 }, "всё спокойно"),
      ),

      div(
        { class: "row", style: { marginTop: "14px", display: "grid" } },
        // Две панели — два независимых состояния: сигнал живёт внутри вызова.
        Collapsible(
          { title: "Узлы", opened: true },
          each(
            nodes,
            (node) =>
              div(
                cls`row`,
                span(cls`mono`, () => node().name),
                Badge(
                  {
                    // Тон считаем на месте: у функционального компонента пропсы —
                    // обычные значения, реактивность живёт в разметке внутри него.
                    tone: "warn",
                    show: () => node().load > 70,
                  },
                  () => `${node().load}%`,
                ),
                span({ class: "muted", show: () => node().load <= 70 }, () => `${node().load}%`),
              ),
            (node) => node.id,
          ),
        ),
        Collapsible(
          { title: "Когда брать функциональный компонент" },
          div(
            cls`muted`,
            "нужен кусок разметки, который переиспользуют внутри одного компонента " +
              "или UI-кита, и который должен наследовать стили хозяина",
          ),
          div(
            cls`muted`,
            "веб-компонент нужен там, где важны изоляция стилей, свои атрибуты, " +
              "события наружу и возможность вставить тег в чужую разметку",
          ),
        ),
      ),
    );
  }
}

const functionComponentsDemo = useCustomComponent(
  FunctionComponentsDemo,
  "function-components-demo",
);

export const example: Example = {
  title: "createComponent — компоненты в функциональном стиле",
  file: "examples/function-components.ts",
  hint:
    "Функция вместо класса: ни своего тега, ни теневого корня, ни атрибутов. Обёртка " +
    "добавляет к пропсам class/attrs/style/show, поэтому вызов ничем не отличается от " +
    "фабрики тега. Стили компонент берёт у хозяина — в этом и смысл.",
  mount: functionComponentsDemo,
};

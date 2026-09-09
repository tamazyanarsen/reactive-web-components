/**
 * Стенд собран самой библиотекой: фабрики тегов, компоненты, сигналы.
 *
 * Раскладка намеренная: шапка, рамки секций и лог живут в светлом DOM, поэтому к ним
 * применяется CSS страницы. Всё реактивное вынесено в компоненты — эффект должен
 * принадлежать веб-компоненту, иначе его некому уничтожить (будет warning в консоли).
 * Свои стили компоненты возят с собой: CSS страницы внутрь shadow root не проникает.
 */
import {
  defineComponent,
  payload,
  useCustomComponent,
} from "./src/shared/components/custom/custom-element";
import {
  button,
  cls,
  computed,
  div,
  dynamic,
  each,
  el,
  h1,
  h2,
  header,
  input,
  label,
  li,
  p,
  section,
  slot,
  span,
  strong,
  ul,
  when,
  type ElementChild,
} from "./src/shared/components/html";
import { signal } from "./src/shared/signals";

// --- лог (светлый DOM, переживает размонтирование компонентов) -----------------

type Tag = "click" | "set" | "effect" | "life" | "event" | "error";

const logBox = div({ ".id": "log" });

const log = (tag: Tag, msg: string, bad = false) =>
  logBox.prepend(
    div(
      { class: bad ? "entry bad" : "entry" },
      span(cls`time`, new Date().toLocaleTimeString("ru-RU")),
      span({ class: `tag t-${tag}` }, tag),
      span(cls`msg`, msg),
    ),
  );

// --- общие стили компонентов ---------------------------------------------------

const COMPONENT_CSS = `
  :host { display: block; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .row + .row { margin-top: 12px; }
  button {
    background: #2a2f38; color: inherit; border: 1px solid #2f343d; border-radius: 6px;
    padding: 7px 14px; font: inherit; cursor: pointer;
  }
  button:hover:not(:disabled) { border-color: #6ea8fe; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  /* :not(...) обязателен: иначе min-width растягивает и чекбоксы */
  input:not([type="checkbox"]) {
    background: #23262d; color: inherit; border: 1px solid #2f343d; border-radius: 6px;
    padding: 7px 10px; font: inherit; min-width: 220px;
  }
  input[type="checkbox"] { width: 16px; height: 16px; margin: 0; cursor: pointer; }
  .counter { font: 600 28px/1 ui-monospace, monospace; color: #6ea8fe; min-width: 4ch; text-align: center; }
  .mono { font-family: ui-monospace, monospace; color: #6ea8fe; }
  .label { font-weight: 600; margin-bottom: 4px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 14px; }
  .card { background: #23262d; border: 1px solid #2f343d; border-radius: 8px; padding: 14px; }
  .card .num { font: 600 22px/1.2 ui-monospace, monospace; color: #6ea8fe; margin: 6px 0; }
  .card .why { color: #8b93a1; font-size: 13px; }
  .verdict { border-left: 3px solid #8b93a1; padding: 12px 14px; border-radius: 6px; background: #23262d; margin-top: 16px; }
  .verdict.ok { border-left-color: #6ee7a8; }
  .verdict.err { border-left-color: #ff8b8b; }
  .verdict.wait { border-left-color: #ffd479; }
  .verdict-title { font-weight: 600; }
  .verdict-text { color: #8b93a1; }

  /* демо классов: каждый токен виден глазами */
  .demo {
    margin-top: 10px; padding: 10px 12px; border-radius: 6px;
    font-family: ui-monospace, monospace; font-size: 13px;
    background: #23262d; border: 1px dashed transparent; color: #8b93a1;
  }
  .demo.theme-blue { color: #6ea8fe; }
  .demo.theme-green { color: #6ee7a8; }
  .demo.boxed { border-color: currentColor; }
  .demo.is-empty { opacity: .5; }
  .demo.size-lg { font-size: 17px; }
  .demo.accent { background: #2a2f38; box-shadow: inset 3px 0 0 currentColor; }

  /* Хост дочернего компонента лежит внутри этого shadow root, поэтому CSS страницы
     до него не достаёт — стили для его классов нужны здесь. */
  .demo-host { display: block; border-left: 3px solid transparent; padding-left: 10px; }
  .demo-host.theme-blue { border-left-color: #6ea8fe; }
  .demo-host.theme-green { border-left-color: #6ee7a8; }
  .demo-host.is-empty { opacity: .6; }

  /* список задач */
  .progress {
    height: 6px; border-radius: 3px; background: #2a2f38; margin: 12px 0; overflow: hidden;
  }
  .progress[data-empty] { opacity: .35; }
  .progress-bar { height: 100%; width: var(--progress, 0%); background: #6ee7a8; transition: width .2s; }
  .todo-list { list-style: none; margin: 12px 0; padding: 0; display: grid; gap: 6px; }
  .todo {
    display: flex; align-items: center; gap: 8px;
    background: #23262d; border: 1px solid #2f343d; border-radius: 6px; padding: 6px 10px;
  }
  .todo.done .todo-text { text-decoration: line-through; color: #8b93a1; }
  .todo-text { flex: 1; }
  .todo-remove { padding: 2px 9px; line-height: 1.2; }
  .empty {
    margin: 12px 0; padding: 14px; text-align: center; color: #8b93a1;
    border: 1px dashed #2f343d; border-radius: 6px;
  }

  /* слоты */
  .panel-head {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 8px 12px; background: #2a2f38; border-radius: 6px 6px 0 0;
  }
  .panel-head .label { margin: 0; }
  .panel-body { padding: 12px; border: 1px solid #2f343d; border-top: 0; border-radius: 0 0 6px 6px; }
  .muted { color: #8b93a1; font-style: italic; }
  .accent { color: #6ee7a8; }
  panel-box { display: block; margin-bottom: 12px; }
`;

/** Стили едут в каждый shadow root отдельно: CSS страницы внутрь не проникает. */
const componentStyles = () => el("style", COMPONENT_CSS);

// --- общее состояние стенда -----------------------------------------------------

const count = signal(0);
const userName = signal("гость");
/** Счётчик прогонов не выводится из состояния — его пишет сам эффект. */
const effectRuns = signal(0);
/** А это уже производное значение: computed пересчитает сам, отдельный эффект не нужен. */
const isEmpty = computed(() => userName().trim() === "");
/** Значения совпадают с именами классов-модификаторов — сигнал прямо едет в class. */
const verdict = signal<"wait" | "ok" | "err">("wait");
const verdictTitle = signal("Реактивность ещё не проверена");
const verdictText = signal("Нажми +1 — проверю, перезапустился ли эффект после записи.");

let runs = 0;

// --- 1. сигналы и эффекты --------------------------------------------------------

class SignalsDemo extends defineComponent({ props: {} }) {
  render(): HTMLElement {
    // Эффект живёт ровно столько же, сколько компонент: при размонтировании умрёт.
    this.addEffect(() => {
      const value = count();
      effectRuns.set(++runs);
      log("effect", `колбэк счётчика выполнился, вызов №${runs}, count() = ${value}`);
    });

    /** Пишет в сигнал и сверяет число прогонов до и после — так видно, дошёл ли set. */
    const write = (next: number, what: string) => {
      const prev = count();
      const runsBefore = runs;

      log("click", `нажата кнопка «${what}»`);
      log(
        "set",
        `count.set(${next}), было ${prev}. ` +
          (next === prev
            ? "значение то же — set должен выйти на раннем return"
            : "значение новое — подписчики обязаны перезапуститься"),
      );

      count.set(next);

      if (next === prev) {
        const ok = runs === runsBefore;
        log(
          ok ? "effect" : "error",
          ok
            ? "эффект не перезапускался — верно, запись тем же значением отсекается"
            : "эффект перезапустился на записи тем же значением — лишняя работа",
          !ok,
        );
        return;
      }

      const ok = runs > runsBefore;
      verdict.set(ok ? "ok" : "err");
      verdictTitle.set(ok ? "Реактивность работает" : "Реактивность не работает");
      verdictText.set(
        ok
          ? `Клик вызвал только count.set(${next}), а число перерисовал эффект — значит set прошёл по подписчикам.`
          : "Значение в сигнале изменилось, но колбэк эффекта не выполнился повторно.",
      );
    };

    return div(
      componentStyles(),
      div(
        cls`row`,
        button({ "@click": () => write(count() - 1, "−1") }, "−1"),
        span(cls`counter`, count),
        button({ ".id": "inc", "@click": () => write(count() + 1, "+1") }, "+1"),
        button({ "@click": () => write(0, "сброс") }, "сброс в 0"),
        button({ "@click": () => write(count(), "set тем же") }, "set тем же числом"),
      ),
      div(
        cls`cards`,
        div(
          cls`card`,
          div(cls`label`, "Что вернёт count()"),
          div(cls`num`, count),
          div(cls`why`, "Значение, которое лежит в сигнале прямо сейчас."),
        ),
        div(
          cls`card`,
          div(cls`label`, "Прогонов колбэка счётчика"),
          div(cls`num`, effectRuns),
          div(
            cls`why`,
            "Первый — сразу при создании эффекта, дальше по одному на каждое изменение.",
          ),
        ),
      ),
      // Значения сигнала и есть имена классов-модификаторов, поэтому объект условий
      // не нужен: "verdict" — статика, verdict — источник второго токена.
      div(
        { class: ["verdict", verdict] },
        div(cls`verdict-title`, verdictTitle),
        div(cls`verdict-text`, verdictText),
      ),
    );
  }
}

// --- 2. фабрики тегов и реактивные свойства --------------------------------------

class FormDemo extends defineComponent({ props: {} }) {
  render(): HTMLElement {
    return div(
      componentStyles(),
      div(
        cls`row`,
        label("Имя:"),
        input({
          ".id": "name-input",
          ".value": userName,
          ".placeholder": "введи имя",
          // aria-* получает буквальные "true"/"false", а не присутствие атрибута
          attrs: { "aria-invalid": isEmpty },
          style: { borderColor: computed(() => (isEmpty() ? "#ff8b8b" : "")) },
          "@input": (event) => userName.set(event.currentTarget.value),
        }),
        button(
          {
            ".id": "greet",
            ".disabled": isEmpty,
            ".title": userName,
            "@click": () => log("click", `кнопка приветствия, имя = "${userName()}"`),
          },
          "поздороваться",
        ),
      ),
      div(
        cls`row`,
        "Привет, ",
        strong(userName),
        "! Пустое имя: ",
        span(cls`mono`, isEmpty),
        " — один computed питает и .disabled кнопки, и aria-invalid, и цвет рамки.",
      ),
    );
  }
}

// --- 3. классы: ключ class и тег cls ------------------------------------------------

const theme = signal("theme-blue");
const size = signal("md");
const boxed = signal(true);
/** Второй источник того же токена "accent" — проверка refcount. */
const accentA = signal("accent");
const accentB = signal("accent");

class ClassDemo extends defineComponent({ props: {} }) {
  render(): HTMLElement {
    return div(
      componentStyles(),
      div(
        cls`row`,
        button(
          {
            ".id": "toggle-theme",
            "@click": () => theme.set(theme() === "theme-blue" ? "theme-green" : "theme-blue"),
          },
          "сменить тему",
        ),
        button({ ".id": "toggle-boxed", "@click": () => boxed.set(!boxed()) }, "рамка вкл/выкл"),
        button(
          { ".id": "toggle-size", "@click": () => size.set(size() === "md" ? "lg" : "md") },
          "размер",
        ),
        button({ ".id": "drop-a", "@click": () => accentA.set("") }, "отпустить accent A"),
        button({ ".id": "drop-b", "@click": () => accentB.set("") }, "отпустить accent B"),
      ),
      // Массив: статика + сигнал темы + слитная склейка через cls + условия
      div(
        {
          ".id": "demo-box",
          class: ["demo", theme, { boxed, "is-empty": isEmpty }],
        },
        "class: [\"demo\", themeSignal, { boxed, 'is-empty': isEmpty }]",
      ),
      // cls без конфига: слитная интерполяция даёт один токен size-md / size-lg
      div(cls`demo size-${size}`, "cls`demo size-${size}` — склеивается в один токен"),
      // Два источника дают один и тот же токен: снимется, только когда отпустят оба
      div(
        { ".id": "demo-refcount", class: ["demo", accentA, accentB] },
        "два источника держат класс accent",
      ),
    );
  }
}

// --- 4. условный и списочный рендер, attrs и style ----------------------------------

type Todo = { id: number; text: string; done: boolean };

let nextTodoId = 3;
const todos = signal<Todo[]>([
  { id: 1, text: "перенести cls", done: true },
  { id: 2, text: "сделать each", done: false },
]);
const draft = signal("");
const onlyPending = signal(false);

/** Производные значения — ни одного ручного эффекта. */
const visibleTodos = computed(() => (onlyPending() ? todos().filter((t) => !t.done) : todos()));
const doneCount = computed(() => todos().filter((t) => t.done).length);
const progress = computed(() => (todos().length ? doneCount() / todos().length : 0));

const patchTodo = (id: number, patch: Partial<Todo>) =>
  todos.set(todos().map((todo) => (todo.id === id ? { ...todo, ...patch } : todo)));

class ListDemo extends defineComponent({ props: {} }) {
  render(): HTMLElement {
    const addTodo = () => {
      const text = draft().trim();
      if (!text) return;
      todos.set([...todos(), { id: nextTodoId++, text, done: false }]);
      draft.set("");
      log("set", `добавлена задача «${text}»`);
    };

    return div(
      componentStyles(),
      div(
        cls`row`,
        input({
          ".id": "todo-input",
          ".value": draft,
          ".placeholder": "новая задача",
          "@input": (event) => draft.set(event.currentTarget.value),
          "@keydown": (event) => event.key === "Enter" && addTodo(),
        }),
        button(
          {
            ".id": "todo-add",
            ".disabled": computed(() => !draft().trim()),
            "@click": addTodo,
          },
          "добавить",
        ),
        button(
          { ".id": "todo-filter", "@click": () => onlyPending.set(!onlyPending()) },
          // Здесь меняется только текст, узлы те же — это работа для computed, а не для when.
          computed(() => (onlyPending() ? "показать все" : "только незакрытые")),
        ),
      ),
      // Полоса прогресса: реактивные инлайновые стили и произвольные атрибуты
      div(
        {
          class: "progress",
          attrs: {
            role: "progressbar",
            "aria-valuenow": computed(() => Math.round(progress() * 100)),
            "data-empty": computed(() => todos().length === 0),
          },
          style: { "--progress": computed(() => `${Math.round(progress() * 100)}%`) },
        },
        div(cls`progress-bar`),
      ),
      div(
        cls`row`,
        "готово ",
        span(cls`mono`, doneCount),
        " из ",
        span(cls`mono`, computed(() => todos().length)),
      ),
      // Условный рендер: пустое состояние вместо списка
      when(
        () => visibleTodos().length > 0,
        () =>
          ul(
            { class: "todo-list", ".id": "todo-list" },
            // Списочный рендер по ключу: узел задачи переживает переупорядочивание
            each(
              visibleTodos,
              (todo) =>
                li(
                  {
                    class: ["todo", { done: () => todo().done }],
                    attrs: {
                      "data-id": computed(() => todo().id),
                      "aria-checked": computed(() => todo().done),
                    },
                  },
                  input({
                    ".type": "checkbox",
                    ".checked": computed(() => todo().done),
                    "@change": (event) =>
                      patchTodo(todo().id, { done: event.currentTarget.checked }),
                  }),
                  span(cls`todo-text`, computed(() => todo().text)),
                  button(
                    {
                      class: "todo-remove",
                      "@click": () => todos.set(todos().filter((t) => t.id !== todo().id)),
                    },
                    "×",
                  ),
                ),
              (todo) => todo.id,
            ),
          ),
        () => div({ class: "empty", ".id": "todo-empty" }, "ничего не найдено"),
      ),
      div(
        cls`row`,
        button(
          {
            ".id": "todo-shuffle",
            "@click": () => todos.set([...todos()].reverse()),
          },
          "перевернуть список",
        ),
        button({ ".id": "todo-clear", "@click": () => todos.set([]) }, "очистить"),
      ),
    );
  }
}

// --- 5. слоты и шаблоны ---------------------------------------------------------------

/**
 * Нативные слоты: тег <slot> в shadow root, контент приходит в light DOM хоста.
 * Спецмеханики не нужно — фабрика компонента уже кладёт детей туда, куда надо.
 */
class PanelBox extends defineComponent({ props: { title: "панель" } }) {
  render(): HTMLElement {
    return div(
      componentStyles(),
      div(
        cls`panel-head`,
        span(cls`label`, this.props.title),
        slot({ ".name": "actions" }),
      ),
      // Слот без имени принимает всё остальное; дети слота — его дефолтный контент
      div(cls`panel-body`, slot(span(cls`muted`, "содержимое не передано"))),
    );
  }
}

type Row = { id: number; label: string };

const rows = signal<Row[]>([
  { id: 1, label: "первая" },
  { id: 2, label: "вторая" },
]);
const fancyRows = signal(false);

/**
 * Аналог setSlotTemplate из старой версии: шаблон строки задаёт потребитель.
 * Здесь для этого не нужен отдельный механизм — проп может быть функцией, потому что
 * пропсы пишутся прямо в сигнал, без сериализации. Значение пропа по умолчанию
 * и есть дефолтный шаблон.
 */
class DataList extends defineComponent({
  props: {
    rows: [] as Row[],
    renderRow: ((row: Row) => span(row.label)) as (row: Row) => ElementChild,
  },
}) {
  render(): HTMLElement {
    return div(
      componentStyles(),
      ul(
        { class: "todo-list", ".id": "slot-rows" },
        each(
          this.props.rows,
          (row) =>
            li(
              cls`todo`,
              // dynamic пересобирает строку, когда сменился шаблон или сами данные
              dynamic(() => this.props.renderRow()(row())),
            ),
          (row) => row.id,
        ),
      ),
    );
  }
}

const panelBox = useCustomComponent(PanelBox, "panel-box");
const dataList = useCustomComponent(DataList, "data-list");

class SlotDemo extends defineComponent({ props: {} }) {
  render(): HTMLElement {
    return div(
      componentStyles(),
      panelBox(
        { ".title": "нативные слоты" },
        // Именованный слот: обычное свойство .slot на ребёнке
        button(
          { ".slot": "actions", ".id": "slot-action", "@click": () => count.set(count() + 1) },
          "кнопка в шапке",
        ),
        div("это дефолтный слот, "),
        span(cls`mono`, count),
      ),
      // Слот без переданного контента показывает свой запасной вариант
      panelBox({ ".title": "слот без контента" }),
      div(
        cls`row`,
        button(
          { ".id": "toggle-template", "@click": () => fancyRows.set(!fancyRows()) },
          "сменить шаблон строки",
        ),
        button(
          {
            ".id": "add-row",
            "@click": () => rows.set([...rows(), { id: Date.now(), label: `строка ${rows().length + 1}` }]),
          },
          "добавить строку",
        ),
      ),
      dataList({
        ".rows": rows,
        // Шаблон-проп: тот же scoped slot, но типизированный и с дефолтом в defineComponent
        ".renderRow": computed(() =>
          fancyRows()
            ? (row: Row) => strong(cls`accent`, `#${row.id} `, row.label)
            : (row: Row) => span(row.label),
        ),
      }),
    );
  }
}

// --- 6. вложенный компонент -------------------------------------------------------

class CounterCard extends defineComponent({
  props: { label: "значение общего сигнала", value: 0, locked: false },
  events: { inc: payload<number>(), reset: payload<void>() },
}) {
  render(): HTMLElement {
    return div(
      componentStyles(),
      div(cls`label`, this.props.label),
      div(cls`row`, div(cls`counter`, this.props.value)),
      div(
        cls`row`,
        button(
          {
            ".id": "card-inc",
            ".disabled": this.props.locked,
            "@click": () => this.events.inc(this.props.value() + 1),
          },
          "+1 изнутри карточки",
        ),
        button({ "@click": () => this.events.reset() }, "сброс изнутри"),
      ),
    );
  }
}

const counterCard = useCustomComponent(CounterCard, "counter-card");

class NestedDemo extends defineComponent({ props: {} }) {
  render(): HTMLElement {
    // Карточка создаётся в render этого компонента, поэтому эффект реактивного
    // ".value" принадлежит NestedDemo, а собственные эффекты карточки — ей самой.
    const card = counterCard({
      // Реактивный класс на хосте дочернего компонента: эффект принадлежит родителю,
      // который этот элемент и создал.
      class: ["demo-host", theme, { "is-empty": isEmpty }],
      ".value": count,
      ".locked": isEmpty,
      "@inc": (event) => {
        log("event", `counter-card прислала inc с payload ${event.detail}`);
        count.set(event.detail);
      },
      "@reset": () => {
        log("event", "counter-card прислала reset");
        count.set(0);
      },
    });

    return div(
      componentStyles(),
      card,
      div(
        cls`row`,
        button(
          {
            ".id": "label-by-attr",
            "@click": () => {
              card.setAttribute("label", "подпись из атрибута");
              log("set", 'снаружи: setAttribute("label", ...) — значение пройдёт через parseValue');
            },
          },
          "подпись атрибутом",
        ),
        button(
          {
            ".id": "label-by-prop",
            "@click": () => {
              card.props.label.set("подпись прямой записью");
              log("set", "снаружи: props.label.set(...) — без сериализации");
            },
          },
          "подпись пропом",
        ),
        button(
          {
            ".id": "label-remove",
            "@click": () => {
              card.removeAttribute("label");
              log("set", "removeAttribute(label) — откат к значению из конфига компонента");
            },
          },
          "снять атрибут",
        ),
      ),
    );
  }
}

// --- сборка страницы ---------------------------------------------------------------

const signalsDemo = useCustomComponent(SignalsDemo, "signals-demo");
const formDemo = useCustomComponent(FormDemo, "form-demo");
const classDemo = useCustomComponent(ClassDemo, "class-demo");
const listDemo = useCustomComponent(ListDemo, "list-demo");
const slotDemo = useCustomComponent(SlotDemo, "slot-demo");
const nestedDemo = useCustomComponent(NestedDemo, "nested-demo");

/** Хост и его место в разметке: одна запись на секцию, ничего не забыть при добавлении. */
const mountPoint = (host: HTMLElement) => ({ host, slot: div(host) });

const signals = mountPoint(signalsDemo());
const form = mountPoint(formDemo());
// Только статика: вызов на уровне модуля, вне чьего-либо render(), поэтому реактивный
// класс здесь стал бы бесхозным эффектом (библиотека предупредит в консоли).
// Реактивный класс на хосте компонента показан в секции 5, внутри render() родителя.
const classes = mountPoint(classDemo(cls`demo-host`));
const list = mountPoint(listDemo());
const slots = mountPoint(slotDemo());
const nested = mountPoint(nestedDemo());

const mounts = [signals, form, classes, list, slots, nested];

/** Число живых эффектов компонента — доказательство, что teardown отработал. */
const effectCount = (host: HTMLElement) =>
  (host as unknown as { componentEffectList?: Set<unknown> }).componentEffectList?.size ?? 0;

const lifeStatus = span({ ".id": "life-status", class: "mono" }, "—");

const refreshLifeStatus = () => {
  const total = mounts.reduce((sum, { host }) => sum + effectCount(host), 0);
  lifeStatus.textContent = `живых эффектов у компонентов: ${total}`;
};

// Монтирование императивное намеренно: when здесь не подойдёт — тулбар живёт в светлом
// DOM, вне чьего-либо render(), и его эффект был бы бесхозным. Плюс смысл секции именно
// в настоящих connected/disconnectedCallback хостов, а не в подмене узлов.
const toolbar = div(
  cls`row`,
  button(
    {
      ".id": "unmount",
      "@click": () => {
        if (!signals.host.isConnected) return log("life", "уже размонтировано");
        mounts.forEach(({ host }) => host.remove());
        refreshLifeStatus();
        log("life", `disconnectedCallback отработал, ${lifeStatus.textContent}`);
      },
    },
    "размонтировать компоненты",
  ),
  button(
    {
      ".id": "mount",
      "@click": () => {
        if (signals.host.isConnected) return log("life", "уже смонтировано");
        mounts.forEach(({ host, slot }) => slot.append(host));
        refreshLifeStatus();
        log("life", `connectedCallback отработал заново, ${lifeStatus.textContent}`);
      },
    },
    "смонтировать обратно",
  ),
  lifeStatus,
);

const sectionBlock = (title: string, hint: string, body: HTMLElement) =>
  section(cls`section`, h2(title), p(cls`hint`, hint), body);

document.getElementById("app")!.append(
  header(
    h1("rwc — стенд"),
    p(
      "Страница целиком собрана фабриками библиотеки. Всё реактивное живёт внутри " +
        "компонентов, чтобы эффекты умирали вместе с ними.",
    ),
  ),
  sectionBlock(
    "0. Жизненный цикл",
    "Размонтируй компоненты: эффекты должны уничтожиться, а при обратном монтировании — создаться заново.",
    toolbar,
  ),
  sectionBlock(
    "1. Сигналы и эффекты",
    "Число рисует не обработчик клика, а колбэк эффекта. Клик только вызывает count.set(...).",
    signals.slot,
  ),
  sectionBlock(
    "2. Фабрики тегов и реактивные свойства",
    "Сигнал уезжает в .value инпута, в .disabled и .title кнопки и прямо в дети.",
    form.slot,
  ),
  sectionBlock(
    "3. Классы: ключ class и тег cls",
    "Строка, сигнал, объект условий и массив — всё одним ключом. Токены снимаются по одному, " +
      "статика остаётся, общий токен держится, пока его не отпустят все источники.",
    classes.slot,
  ),
  sectionBlock(
    "4. Условный и списочный рендер, attrs и style",
    "when подменяет узлы по условию, each переиспользует их по ключу. Прогресс-бар — " +
      "реактивная CSS-переменная в style и произвольные атрибуты role/aria/data.",
    list.slot,
  ),
  sectionBlock(
    "5. Слоты и шаблоны",
    "Нативный <slot> работает без спецмеханики: контент едет в light DOM хоста. " +
      "Скоуп-слот — это проп-функция, потому что пропсы пишутся прямо в сигнал.",
    slots.slot,
  ),
  sectionBlock(
    "6. Вложенный компонент",
    "Родитель отдаёт сигнал в проп карточки и слушает её события. Подпись меняется и атрибутом, и пропом.",
    nested.slot,
  ),
  sectionBlock("7. Лог", "Сверху — самое свежее.", logBox),
);

refreshLifeStatus();
log("life", `страница собрана, ${lifeStatus.textContent}`);

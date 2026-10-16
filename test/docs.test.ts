/**
 * Примеры из README и docs/ — в рабочем виде. Документация, которая не собирается,
 * хуже её отсутствия, поэтому ключевые фрагменты живут здесь и проверяются вместе
 * со всем остальным.
 */
import { afterEach, describe, expect, test } from "bun:test";
import {
  applyClass,
  button,
  cls,
  computed,
  createComponent,
  createContext,
  createRoot,
  css,
  defineComponent,
  div,
  each,
  effect,
  h3,
  input,
  label,
  li,
  onCleanup,
  p,
  payload,
  resource,
  section,
  signal,
  slot,
  span,
  table,
  td,
  tr,
  useCustomComponent,
  when,
  type CustomTagName,
  type ReadonlySignal,
} from "../src";

let tagCounter = 0;
const nextTag = (name: string) => `doc-${name}-${tagCounter++}` as CustomTagName;

const mounted: HTMLElement[] = [];
const mount = <T extends HTMLElement>(element: T) => {
  document.body.append(element);
  mounted.push(element);
  return element;
};

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  for (const element of mounted) element.remove();
  mounted.length = 0;
});

describe("README: счётчик", () => {
  class Counter extends defineComponent({
    props: { value: 0, step: 1 },
    events: { change: payload<number>() },
    styles: css`
      :host { display: inline-flex; gap: 8px }
      .value { min-width: 3ch; text-align: center }
    `,
  }) {
    render() {
      const { value, step } = this.props;

      const shift = (direction: number) => {
        value.update((current) => current + direction * step());
        this.events.change(value.peek());
      };

      return div(
        cls`counter`,
        button({ "@click": () => shift(-1) }, "−"),
        span(cls`value`, value),
        button({ "@click": () => shift(1) }, "+"),
      );
    }
  }

  const counter = useCustomComponent(Counter, nextTag("counter"));

  test("считает и шлёт событие с типизированным payload", () => {
    const seen: number[] = [];
    const element = mount(
      counter({ ".value": 5, ".step": 2, "@change": (event) => seen.push(event.detail) }),
    );

    const [minus, plus] = element.shadowRoot!.querySelectorAll("button");
    plus!.dispatchEvent(new Event("click"));
    expect(element.shadowRoot!.querySelector(".value")!.textContent).toBe("7");

    minus!.dispatchEvent(new Event("click"));
    expect(seen).toEqual([7, 5]);
  });
});

describe("Гайд: слоты с контекстом", () => {
  type Row = { id: number; name: string; total: number };

  class DataTable extends defineComponent({
    props: { rows: [] as Row[] },
    slots: {
      row: payload<{ row: ReadonlySignal<Row>; index: ReadonlySignal<number> }>(),
      empty: payload<void>(),
    },
  }) {
    render() {
      return when(
        () => this.props.rows().length > 0,
        () =>
          table(
            {},
            each(
              this.props.rows,
              (row, index) =>
                this.renderSlot("row", { row, index }, () => tr({}, td(() => row().name))),
              (row) => row.id,
            ),
          ),
        () => this.renderSlot("empty", undefined, () => p("пусто")),
      );
    }
  }

  const dataTable = useCustomComponent(DataTable, nextTag("table"));

  test("шаблон строки получает типизированный контекст", () => {
    const rows = signal<Row[]>([
      { id: 1, name: "раз", total: 100 },
      { id: 2, name: "два", total: 200 },
    ]);

    const element = mount(
      dataTable({
        ".rows": rows,
        "#row": ({ row, index }) =>
          tr(
            { class: { odd: () => index() % 2 === 1 } },
            td(() => row().name),
            td(() => String(row().total)),
          ),
        "#empty": () => p("ничего не нашлось"),
      }),
    );

    const cells = [...element.shadowRoot!.querySelectorAll("td")].map((el) => el.textContent);
    expect(cells).toEqual(["раз", "100", "два", "200"]);

    // Строка переиспользуется по id: меняется только текст ячейки.
    const firstRow = element.shadowRoot!.querySelector("tr")!;
    rows.set([
      { id: 1, name: "раз", total: 150 },
      { id: 2, name: "два", total: 200 },
    ]);
    expect(element.shadowRoot!.querySelector("tr")).toBe(firstRow);
    expect(element.shadowRoot!.querySelectorAll("td")[1]!.textContent).toBe("150");
  });

  test("без строк рендерится слот empty", () => {
    const element = mount(dataTable({ ".rows": [], "#empty": () => p("ничего не нашлось") }));
    expect(element.shadowRoot!.textContent).toBe("ничего не нашлось");
  });
});

describe("Рецепт: тема через контекст", () => {
  type Theme = "light" | "dark";
  const ThemeKey = createContext<Theme>("theme", "light");

  class Toolbar extends defineComponent({ props: {} }) {
    static override styles = css`
      :host { background: var(--bg) }
      :host(.dark) { --bg: #222 }
    `;

    render() {
      const theme = this.inject(ThemeKey);
      applyClass(this, { dark: () => theme() === "dark" });
      return div({}, slot());
    }
  }
  const toolbar = useCustomComponent(Toolbar, nextTag("toolbar"));

  class App extends defineComponent({ props: {} }) {
    render() {
      const theme = signal<Theme>("light");
      this.provide(ThemeKey, theme);

      return div(
        {},
        button(
          { "@click": () => theme.update((t) => (t === "light" ? "dark" : "light")) },
          "тема",
        ),
        toolbar(),
      );
    }
  }
  const app = useCustomComponent(App, nextTag("app"));

  test("переключение доходит до потребителя через теневые корни", () => {
    const element = mount(app());
    const bar = element.shadowRoot!.querySelector("*")!.lastElementChild!;

    expect([...bar.classList]).toEqual([]);

    element.shadowRoot!.querySelector("button")!.dispatchEvent(new Event("click"));
    expect([...bar.classList]).toEqual(["dark"]);
  });
});

describe("Рецепт: поле с валидацией", () => {
  class EmailField extends defineComponent({
    props: { value: "", touched: false },
    events: { valueChange: payload<string>() },
  }) {
    render() {
      const { value, touched } = this.props;

      const error = computed(() => {
        if (!value()) return "укажите почту";
        if (!value().includes("@")) return "нужен знак @";
        return null;
      });

      const visibleError = computed(() => (touched() ? error() : null));

      return label(
        {},
        "Почта",
        input({
          ".value": value,
          ".type": "email",
          class: ["field", { invalid: () => visibleError() !== null }],
          attrs: { "aria-invalid": () => visibleError() !== null },
          "@input": (event) => {
            value.set(event.currentTarget.value);
            this.events.valueChange(event.currentTarget.value);
          },
          "@blur": () => touched.set(true),
        }),
        when(visibleError, () => span(cls`error`, visibleError)),
      );
    }
  }
  const emailField = useCustomComponent(EmailField, nextTag("email"));

  test("ошибка появляется только после blur", () => {
    const element = mount(emailField());
    const field = element.shadowRoot!.querySelector("input")!;

    expect(element.shadowRoot!.querySelector(".error")).toBeNull();
    expect(field.getAttribute("aria-invalid")).toBe("false");

    field.dispatchEvent(new Event("blur"));
    expect(element.shadowRoot!.querySelector(".error")!.textContent).toBe("укажите почту");
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });

  test("исправление ввода убирает ошибку", () => {
    const element = mount(emailField({ ".touched": true, ".value": "нет собаки" }));
    expect(element.shadowRoot!.querySelector(".error")!.textContent).toBe("нужен знак @");

    (element as InstanceType<typeof EmailField>).props.value.set("a@b.c");
    expect(element.shadowRoot!.querySelector(".error")).toBeNull();
  });
});

describe("Рецепт: секундомер", () => {
  class Stopwatch extends defineComponent({ props: { running: false } }) {
    render() {
      const elapsed = signal(0);

      effect(() => {
        if (!this.props.running()) return;

        const started = Date.now() - elapsed.peek();
        const id = setInterval(() => elapsed.set(Date.now() - started), 5);
        onCleanup(() => clearInterval(id));
      });

      return div({}, () => (elapsed() / 1000).toFixed(1), " с");
    }
  }
  const stopwatch = useCustomComponent(Stopwatch, nextTag("stopwatch"));

  test("идёт, пока running, и останавливается на паузе", async () => {
    const element = mount(stopwatch({ ".running": true }));
    const instance = element as InstanceType<typeof Stopwatch>;

    await new Promise((resolve) => setTimeout(resolve, 40));
    instance.props.running.set(false);
    const stoppedAt = element.shadowRoot!.textContent;

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(element.shadowRoot!.textContent).toBe(stoppedAt!);
  });
});

describe("Рецепт: поиск с дебаунсом", () => {
  type Person = { id: number; name: string };
  const requests: string[] = [];

  class Search extends defineComponent({ props: { minLength: 2 } }) {
    render() {
      const typed = signal("");
      const query = signal("");

      effect(() => {
        const next = typed();
        const timer = setTimeout(() => query.set(next), 20);
        onCleanup(() => clearTimeout(timer));
      });

      const found = resource(
        async () => {
          const text = query();
          if (text.length < this.props.minLength()) return [] as Person[];
          requests.push(text);
          return [{ id: 1, name: `нашли ${text}` }];
        },
        { initialValue: [] as Person[] },
      );

      return div(
        {},
        input({
          ".value": typed,
          "@input": (event) => typed.set(event.currentTarget.value),
        }),
        span({ show: found.loading }, "ищем…"),
        each(
          () => found.data() ?? [],
          (person) => li({}, () => person().name),
          (person) => person.id,
        ),
      );
    }
  }
  const search = useCustomComponent(Search, nextTag("search"));

  test("быстрый ввод даёт один запрос", async () => {
    requests.length = 0;
    const element = mount(search());
    const field = element.shadowRoot!.querySelector("input")!;

    for (const text of ["а", "аб", "абв"]) {
      field.value = text;
      field.dispatchEvent(new Event("input"));
    }

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(requests).toEqual(["абв"]);
    expect(element.shadowRoot!.querySelector("li")!.textContent).toBe("нашли абв");
  });
});

describe("Гайд: функциональные компоненты и createRoot", () => {
  test("Card принимает пропсы, детей и оформление", () => {
    const Card = createComponent<{ title: string }, HTMLElement>((props, ...children) =>
      section(cls`card`, h3(props.title), ...children),
    );

    const total = signal(1);
    const app = mount(
      createRoot(() => div({}, Card({ title: "Отчёт", class: ["wide"] }, p(() => String(total()))))),
    );

    const card = app.querySelector("section")!;
    expect([...card.classList].sort()).toEqual(["card", "wide"]);
    expect(card.querySelector("h3")!.textContent).toBe("Отчёт");
    expect(card.querySelector("p")!.textContent).toBe("1");

    total.set(2);
    expect(card.querySelector("p")!.textContent).toBe("2");
  });

  test("dispose из createRoot уничтожает эффекты", () => {
    const source = signal(0);
    let runs = 0;
    let disposeRoot: (() => void) | null = null;

    mount(
      createRoot((dispose) => {
        disposeRoot = dispose;
        return div(
          {},
          span(() => {
            runs++;
            return String(source());
          }),
        );
      }),
    );

    source.set(1);
    expect(runs).toBe(2);

    disposeRoot!();
    source.set(2);
    expect(runs).toBe(2);
  });
});

describe("Экосистема: таблица версий пакетов", () => {
  // Таблица живёт в двух языках и устаревает молча — сверяем её с package.json.
  const manifests = [
    "package.json",
    ...["ui", "router", "forms", "cem-plugin", "create"].map((name) => `packages/${name}/package.json`),
  ].map((path) => require(`../${path}`) as { name: string; version: string; peerDependencies?: Record<string, string> });

  for (const lang of ["en", "ru"]) {
    test(`docs/${lang}/ecosystem.md совпадает с package.json`, async () => {
      const markdown = await Bun.file(`${import.meta.dir}/../docs/${lang}/ecosystem.md`).text();
      for (const { name, version, peerDependencies } of manifests) {
        // Строка таблицы: | `@rwcjs/ui` | 0.1.x | `^3.2.0` |
        const row = markdown.split("\n").find((text) => text.startsWith(`| \`${name}\` |`));
        expect(row, `${name} нет в таблице`).toBeDefined();
        const [, , line = "", core = ""] = row!.split("|").map((cell) => cell.trim());
        // Линия "0.1.x" или "3.x" — префикс текущей версии.
        expect(version.startsWith(line.replace(/x$/, ""))).toBe(true);
        const range = peerDependencies?.["@rwcjs/core"];
        expect(core).toBe(range ? `\`${range}\`` : "—");
      }
    });
  }
});

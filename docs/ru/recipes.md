# Рецепты

[English](../en/recipes.md) · [Гайд](./guide.md) · [Справочник API](./api.md) · [Фреймворки](./frameworks.md) · [SSR](./ssr.md)

- [Поле ввода с валидацией](#поле-ввода-с-валидацией)
- [Поле ввода для формы](#поле-ввода-для-формы)
- [Поиск с дебаунсом и отменой](#поиск-с-дебаунсом-и-отменой)
- [Тема через контекст](#тема-через-контекст)
- [Таблица с шаблоном строки](#таблица-с-шаблоном-строки)
- [Таймер, который убирает за собой](#таймер-который-убирает-за-собой)
- [Две версии UI-кита на одной странице](#две-версии-ui-кита-на-одной-странице)
- [Тестирование компонента](#тестирование-компонента)
- [Что выбрать: when, show или dynamic](#что-выбрать-when-show-или-dynamic)

## Поле ввода с валидацией

Ошибка — производное значение, а не отдельное состояние: рассинхронизироваться
нечему.

```ts
class EmailField extends defineComponent({
  props: { value: "", touched: false },
  events: { valueChange: payload<string>() },
  styles: css`
    :host { display: block }
    .error { color: #c00; font-size: 0.85em }
    input.invalid { border-color: #c00 }
  `,
}) {
  render() {
    const { value, touched } = this.props;

    const error = computed(() => {
      if (!value()) return "укажите почту";
      if (!value().includes("@")) return "нужен знак @";
      return null;
    });

    // Показываем ошибку только после того, как поле трогали.
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
```

## Поле ввода для формы

С `form: true` компонент ведёт себя как нативное поле: значение попадает в
`FormData`, `required` не даёт отправить форму, а кнопка сброса формы его очищает.

```ts
class TextField extends defineComponent({
  props: { value: "", required: false },
  form: true,
  reflect: ["required"],
  styles: css`
    :host { display: inline-block }
    :host(:invalid) input { border-color: #c00 }
  `,
}) {
  render() {
    const { value, required } = this.props;

    // FormData следует за сигналом: вручную синхронизировать на каждый ввод не нужно.
    this.setFormValue(value);

    const field = input({
      ".value": value,
      ".disabled": this.formDisabled,
      "@input": (event) => value.set(event.currentTarget.value),
    });

    // onMount: третий аргумент setValidity должен уже лежать в теневом корне,
    // а внутри render() разметка ещё не вставлена — браузер бросил бы NotFoundError.
    onMount(() => {
      this.addEffect(() => {
        if (required() && !value()) {
          // Третий аргумент — элемент, к которому браузер привяжет подсказку валидации.
          this.internals.setValidity({ valueMissing: true }, "Заполните это поле", field);
        } else {
          this.internals.setValidity({});
        }
      });
    });

    return field;
  }
}

export const textField = useCustomComponent(TextField, "x-text-field");
```

В форме он используется как обычный input; имя поля — привычный атрибут `name`:

```ts
const signup = form(
  {
    "@submit": (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      console.log(data.get("email"));
    },
  },
  textField({ attrs: { name: "email", required: true } }),
  button({ ".type": "submit" }, "Зарегистрироваться"),
  button({ ".type": "reset" }, "Очистить"),
);
```

Сброс возвращает все пропсы к начальным значениям — так работает `formReset()` по
умолчанию. Отключённый `fieldset` вокруг компонента переключает `this.formDisabled`.

## Поиск с дебаунсом и отменой

`resource` берёт на себя отмену устаревшего запроса, дебаунс остаётся за
эффектом.

```ts
class Search extends defineComponent({ props: { minLength: 2 } }) {
  render() {
    const typed = signal("");
    const query = signal("");

    // Дебаунс: таймер живёт в эффекте, onCleanup снимает его при каждом новом вводе.
    effect(() => {
      const next = typed();
      const timer = setTimeout(() => query.set(next), 300);
      onCleanup(() => clearTimeout(timer));
    });

    const found = resource(
      async (abort) => {
        const text = query();
        if (text.length < this.props.minLength()) return [];
        const response = await fetch(`/api/search?q=${encodeURIComponent(text)}`, { signal: abort });
        return (await response.json()) as Person[];
      },
      { initialValue: [] },
    );

    return div(
      {},
      input({
        ".value": typed,
        "@input": (event) => typed.set(event.currentTarget.value),
        attrs: { placeholder: "кого ищем" },
      }),
      // Спиннер не мигает на каждый символ: loading поднимается только на реальный запрос.
      span({ show: found.loading }, "ищем…"),
      when(found.error, () => span(cls`error`, "не получилось")),
      ul(
        {},
        each(
          () => found.data() ?? [],
          (person) => li({}, () => person().name),
          (person) => person.id,
        ),
      ),
    );
  }
}
```

Почему две переменные: `typed` меняется на каждое нажатие, `query` — раз в 300 мс.
Зависимостью `resource` становится именно `query`, поэтому запрос уходит один.

## Тема через контекст

```ts
// theme.ts
export type Theme = "light" | "dark";
export const ThemeKey = createContext<Theme>("theme", "light");
```

Провайдер отдаёт сигнал — тогда переключение доходит до всех потребителей сразу:

```ts
class App extends defineComponent({ props: {} }) {
  render() {
    const theme = signal<Theme>("light");
    this.provide(ThemeKey, theme);

    return div(
      {},
      button({ "@click": () => theme.update((t) => (t === "light" ? "dark" : "light")) }, "тема"),
      toolbar(),
      content(),
    );
  }
}
```

Потребитель на любой глубине, через любое число теневых корней:

```ts
class Toolbar extends defineComponent({ props: {} }) {
  static override styles = css`
    :host { background: var(--bg) }
    :host(.dark) { --bg: #222 }
  `;

  render() {
    const theme = this.inject(ThemeKey);
    // Класс на host: снаружи он в светлом DOM, значит доступен и :host(.dark), и странице.
    applyClass(this, { dark: () => theme() === "dark" });
    return div({}, slot());
  }
}
```

Значение объявляйте в `render()` провайдера или раньше: потомки читают контекст,
когда подключаются к DOM.

## Таблица с шаблоном строки

Компонент отвечает за раскладку и состояние, разметку строки задаёт вызывающий.

```ts
type Row = { id: number; name: string; total: number };

class DataTable extends defineComponent({
  props: { rows: [] as Row[] },
  slots: {
    row: payload<{ row: ReadonlySignal<Row>; index: ReadonlySignal<number> }>(),
    empty: payload<void>(),
  },
  styles: css`
    table { border-collapse: collapse; width: 100% }
    :host { display: block }
  `,
}) {
  render() {
    return when(
      () => this.props.rows().length > 0,
      () =>
        table(
          {},
          each(
            this.props.rows,
            (row, index) => this.renderSlot("row", { row, index }, () => tr({}, td(() => row().name))),
            (row) => row.id,
          ),
        ),
      () => this.renderSlot("empty", undefined, () => p("пусто")),
    );
  }
}

export const dataTable = useCustomComponent(DataTable, "x-data-table");
```

Использование — контекст строки типизирован:

```ts
dataTable({
  ".rows": rows,
  "#row": ({ row, index }) =>
    tr(
      { class: { odd: () => index() % 2 === 1 } },
      td(() => row().name),
      td(() => row().total.toLocaleString("ru-RU")),
    ),
  "#empty": () => p("ничего не нашлось"),
});
```

Строки переиспользуются по `id`: сортировка переставляет узлы, а изменение суммы
меняет только текст ячейки.

## Таймер, который убирает за собой

```ts
class Stopwatch extends defineComponent({
  props: { running: false },
  events: { tick: payload<number>() },
}) {
  render() {
    const elapsed = signal(0);

    effect(() => {
      // Читаем условие первым делом — это и есть подписка эффекта.
      if (!this.props.running()) return;

      const started = Date.now() - elapsed.peek();
      const id = setInterval(() => elapsed.set(Date.now() - started), 50);
      onCleanup(() => clearInterval(id));
    });

    return div({}, () => (elapsed() / 1000).toFixed(1), " с");
  }
}
```

`onCleanup` снимает таймер и при паузе, и при отключении компонента от DOM.
`elapsed.peek()` вместо `elapsed()` — иначе эффект подписался бы на сигнал,
в который сам же пишет, и зациклился.

## Две версии UI-кита на одной странице

В ките компонент объявляется без немедленной регистрации:

```ts
// @acme/ui-kit
export const [UiButton, registerUiButton] = configCustomComponent(Button, "ui-button");
export const [UiModal, registerUiModal] = configCustomComponent(Modal, "ui-modal");

export const registerAll = (options?: { postfix?: string }) => {
  registerUiButton(options);
  registerUiModal(options);
};
```

Каждый бизнес-модуль регистрирует свой набор тегов:

```ts
// модуль A, кит 1.7
import { registerAll, UiButton } from "@acme/ui-kit-1.7";
registerAll({ postfix: "moduleA" });   // <ui-button-modulea>

// модуль B, кит 1.8
import { registerAll, UiButton } from "@acme/ui-kit-1.8";
registerAll({ postfix: "moduleB" });   // <ui-button-moduleb>
```

Прикладной код в обоих модулях одинаковый — он идёт через фабрику, а не через
имя тега:

```ts
UiButton({ ".type": "primary" }, "Сохранить");
```

Так модули обновляются по одному. Условие: разные версии должны быть разными
сборками — один класс `customElements` разрешает зарегистрировать только под
одним тегом.

## Тестирование компонента

Тег регистрируется глобально и навсегда, поэтому в тестах давайте каждому
компоненту своё имя.

```ts
import { afterEach, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

let counter = 0;
const nextTag = () => `test-counter-${counter++}` as const;

test("кнопка увеличивает счётчик и шлёт событие", async () => {
  const counterFactory = useCustomComponent(Counter, nextTag());

  const seen: number[] = [];
  const element = counterFactory({ ".value": 1, "@change": (e) => seen.push(e.detail) });
  document.body.append(element);

  // shadow по умолчанию open — внутренности доступны тесту.
  const [minus, plus] = element.shadowRoot!.querySelectorAll("button");
  plus!.dispatchEvent(new Event("click"));

  expect(element.shadowRoot!.textContent).toContain("2");
  expect(seen).toEqual([2]);

  element.remove();
  // Уборка отложена на микрозадачу — вдруг элемент просто перемещают.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(element.shadowRoot!.textContent).toBe(""); // эффекты уничтожены, разметка очищена
});
```

Реактивность синхронная: после `dispatchEvent` и после `signal.set` разметка уже
обновлена, ждать микрозадач не нужно. Исключений два. `resource`: ответ приходит
через промис. И отключение: после `remove()` компонент убирается на микрозадаче,
поэтому перед проверкой уборки нужен `await`.

## Что выбрать: when, show или dynamic

| | Что делает | Когда брать |
| --- | --- | --- |
| `when` | пересобирает ветку при смене истинности условия, снятую уничтожает | содержимое должно исчезнуть по-настоящему: модалка, вкладка, пустое состояние |
| `show` | прячет через `display`, DOM и эффекты живут | переключение частое, а содержимое дорого собирать заново или хранит состояние (позиция скролла, ввод) |
| `dynamic` | пересобирает содержимое при изменении любого прочитанного сигнала | меняется сама структура разметки, а не одно значение |

Когда меняется одно значение, не нужен ни один из них: реактивный ребёнок,
атрибут или класс обновит ровно свой узел.

```ts
span(() => user().name);              // так
dynamic(() => span(user().name));      // не так: пересоберёт узел на каждое изменение
```

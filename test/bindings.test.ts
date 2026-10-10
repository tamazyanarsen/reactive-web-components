import { afterEach, describe, expect, test } from "bun:test";
import { applyClass, cls } from "../src/shared/components/utils/class-binding";
import { div, input, span } from "../src/shared/components/html/html-fabric";
import { signal } from "../src/shared/signals";
import { mountScope } from "./helpers";

let mounted: ReturnType<typeof mountScope> | null = null;

const mount = () => {
  mounted = mountScope();
  return mounted;
};

const tokens = (element: Element) => [...element.classList].sort();

afterEach(() => {
  mounted?.dispose();
  mounted = null;
});

describe("class", () => {
  test("строка и массив дают токены", () => {
    const { render } = mount();
    const element = render(() => div({ class: ["card", "wide"] })) .firstElementChild!;
    expect(tokens(element)).toEqual(["card", "wide"]);
  });

  test("объект-условие ставит и снимает токен реактивно", () => {
    const active = signal(false);
    const { render } = mount();
    const element = render(() => div({ class: ["tab", { active }] })).firstElementChild!;

    expect(tokens(element)).toEqual(["tab"]);
    active.set(true);
    expect(tokens(element)).toEqual(["active", "tab"]);
    active.set(false);
    expect(tokens(element)).toEqual(["tab"]);
  });

  test("условие обычной функцией тоже реактивно", () => {
    const count = signal(0);
    const { render } = mount();
    const element = render(() =>
      div({ class: ["item", { many: () => count() > 2 }] }),
    ).firstElementChild!;

    expect(tokens(element)).toEqual(["item"]);
    count.set(5);
    expect(tokens(element)).toEqual(["item", "many"]);
  });

  test("два источника одного токена не гасят друг друга", () => {
    const a = signal(true);
    const b = signal(true);
    const { render } = mount();
    const element = render(() =>
      div({ class: [{ busy: a }, { busy: b }] }),
    ).firstElementChild!;

    expect(tokens(element)).toEqual(["busy"]);

    // Первый источник снял свой токен — второй всё ещё держит.
    a.set(false);
    expect(tokens(element)).toEqual(["busy"]);

    b.set(false);
    expect(tokens(element)).toEqual([]);
  });

  test("источник не стирает статический токен с тем же именем", () => {
    const on = signal(true);
    const { render } = mount();
    const element = render(() => div({ class: ["busy", { busy: on }] })).firstElementChild!;

    on.set(false);
    expect(tokens(element)).toEqual(["busy"]);
  });

  test("класс, поставленный раньше и снаружи, реактивный источник не снимает", () => {
    const on = signal(true);
    const { render } = mount();
    const element = render(() => {
      const node = div({ class: "card" });
      node.classList.add("external");
      applyClass(node, { card: on, external: on });
      return node;
    }).firstElementChild!;

    on.set(false);
    expect(tokens(element)).toEqual(["card", "external"]);
  });

  test("условие на один токен переключает его без лишних операций", () => {
    const on = signal(false);
    const { render } = mount();
    const element = render(() => div({ class: { active: on } })).firstElementChild!;
    expect(tokens(element)).toEqual([]);

    on.set(true);
    expect(tokens(element)).toEqual(["active"]);
    on.set(false);
    expect(tokens(element)).toEqual([]);
  });

  test("cls склеивает написанное слитно в один токен", () => {
    const size = signal("lg");
    const { render } = mount();
    const element = render(() => div(cls`btn btn-${size}`)).firstElementChild!;

    expect(tokens(element)).toEqual(["btn", "btn-lg"]);
    size.set("sm");
    expect(tokens(element)).toEqual(["btn", "btn-sm"]);
  });

  test("cls разворачивается спредом рядом с другими ключами", () => {
    const { render } = mount();
    const element = render(() => div({ ...cls`card`, ".id": "x" })).firstElementChild!;

    expect(tokens(element)).toEqual(["card"]);
    expect(element.id).toBe("x");
  });
});

describe("attrs", () => {
  test("статические значения ставятся один раз", () => {
    const { render } = mount();
    const element = render(() => div({ attrs: { role: "status", "data-n": 3 } }))
      .firstElementChild!;

    expect(element.getAttribute("role")).toBe("status");
    expect(element.getAttribute("data-n")).toBe("3");
  });

  test("булев атрибут ставится пустым и снимается по false", () => {
    const busy = signal(true);
    const { render } = mount();
    const element = render(() => div({ attrs: { hidden: busy } })).firstElementChild!;

    expect(element.getAttribute("hidden")).toBe("");
    busy.set(false);
    expect(element.hasAttribute("hidden")).toBe(false);
  });

  test("aria-* получает буквальные true/false", () => {
    const checked = signal(false);
    const { render } = mount();
    const element = render(() => div({ attrs: { "aria-checked": checked } })).firstElementChild!;

    expect(element.getAttribute("aria-checked")).toBe("false");
    checked.set(true);
    expect(element.getAttribute("aria-checked")).toBe("true");
  });

  test("null снимает атрибут", () => {
    const value = signal<string | null>("тут");
    const { render } = mount();
    const element = render(() => div({ attrs: { title: value } })).firstElementChild!;

    expect(element.getAttribute("title")).toBe("тут");
    value.set(null);
    expect(element.hasAttribute("title")).toBe(false);
  });

  test("обычная функция работает как источник", () => {
    const count = signal(1);
    const { render } = mount();
    const element = render(() => div({ attrs: { "data-count": () => count() * 2 } }))
      .firstElementChild!;

    expect(element.getAttribute("data-count")).toBe("2");
    count.set(3);
    expect(element.getAttribute("data-count")).toBe("6");
  });
});

describe("style", () => {
  test("camelCase и kebab-case ведут в одно свойство", () => {
    const { render } = mount();
    const element = render(() => div({ style: { backgroundColor: "red" } }))
      .firstElementChild as HTMLElement;

    expect(element.style.getPropertyValue("background-color")).toBe("red");
  });

  test("CSS-переменная сохраняет регистр и обновляется", () => {
    const hue = signal(10);
    const { render } = mount();
    const element = render(() => div({ style: { "--rwcHue": hue } }))
      .firstElementChild as HTMLElement;

    expect(element.style.getPropertyValue("--rwcHue")).toBe("10");
    hue.set(20);
    expect(element.style.getPropertyValue("--rwcHue")).toBe("20");
  });

  test("пустая строка и null снимают свойство", () => {
    const width = signal<string | null>("10px");
    const { render } = mount();
    const element = render(() => div({ style: { width } })).firstElementChild as HTMLElement;

    expect(element.style.getPropertyValue("width")).toBe("10px");
    width.set(null);
    expect(element.style.getPropertyValue("width")).toBe("");
  });
});

describe("свойства и события элемента", () => {
  test(".prop пишется в свойство, а не в атрибут", () => {
    const { render } = mount();
    const element = render(() => input({ ".value": "привет" })).firstElementChild as HTMLInputElement;

    expect(element.value).toBe("привет");
    expect(element.hasAttribute("value")).toBe(false);
  });

  test(".prop реактивен и от сигнала, и от функции", () => {
    const value = signal("a");
    const { render } = mount();
    const element = render(() => input({ ".value": () => value().toUpperCase() }))
      .firstElementChild as HTMLInputElement;

    expect(element.value).toBe("A");
    value.set("b");
    expect(element.value).toBe("B");
  });

  test("@event вешает слушатель", () => {
    let clicks = 0;
    const { render } = mount();
    const element = render(() => div({ "@click": () => clicks++ })).firstElementChild!;

    element.dispatchEvent(new Event("click"));
    expect(clicks).toBe(1);
  });
});

describe("дети", () => {
  test("строки, числа и узлы", () => {
    const { render } = mount();
    const element = render(() => div({}, "a", 1, span("b"))).firstElementChild!;
    expect(element.textContent).toBe("a1b");
  });

  test("null, undefined и false не оставляют следов", () => {
    const { render } = mount();
    const element = render(() => div({}, "a", null, undefined, false, "b")).firstElementChild!;

    expect(element.textContent).toBe("ab");
    expect(element.childNodes.length).toBe(2);
  });

  test("сигнал и функция дают реактивный текст", () => {
    const name = signal("мир");
    const { render } = mount();
    const element = render(() => div({}, name, "|", () => name().toUpperCase()))
      .firstElementChild!;

    expect(element.textContent).toBe("мир|МИР");
    name.set("rwc");
    expect(element.textContent).toBe("rwc|RWC");
  });

  test("конфиг можно не передавать", () => {
    const { render } = mount();
    const element = render(() => div("просто текст")).firstElementChild!;
    expect(element.textContent).toBe("просто текст");
  });
});

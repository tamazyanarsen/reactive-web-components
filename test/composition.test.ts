import { afterEach, describe, expect, test } from "bun:test";
import { flushMicrotasks } from "./helpers";
import {
  configCustomComponent,
  defineComponent,
  type CustomTagName,
} from "../src/shared/components/custom/custom-element";
import { createComponent } from "../src/shared/components/custom/fn-component";
import { div, h3, p, section, span } from "../src/shared/components/html/html-fabric";
import { signal } from "../src/shared/signals";
import { mountScope } from "./helpers";

let tagCounter = 0;
const nextTag = (name: string) => `cmp-${name}-${tagCounter++}` as CustomTagName;

let mounted: ReturnType<typeof mountScope> | null = null;
const mount = () => {
  mounted = mountScope();
  return mounted;
};

const mountedElements: HTMLElement[] = [];
const mountElement = <T extends HTMLElement>(element: T) => {
  document.body.append(element);
  mountedElements.push(element);
  return element;
};

afterEach(() => {
  mounted?.dispose();
  mounted = null;
  for (const element of mountedElements) element.remove();
  mountedElements.length = 0;
});

describe("show", () => {
  test("скрывает и показывает без удаления узла", () => {
    const visible = signal(true);
    const { container, render } = mount();
    render(() => div({ show: visible }, "тут"));

    const element = container.firstElementChild as HTMLElement;
    expect(element.style.getPropertyValue("display")).toBe("");

    visible.set(false);
    expect(element.style.getPropertyValue("display")).toBe("none");
    expect(element.isConnected).toBe(true);
    expect(element.textContent).toBe("тут");

    visible.set(true);
    expect(element.style.getPropertyValue("display")).toBe("");
  });

  test("возвращает инлайновый display, который был задан через style", () => {
    const visible = signal(true);
    const { container, render } = mount();
    render(() => div({ show: visible, style: { display: "flex" } }));

    const element = container.firstElementChild as HTMLElement;
    expect(element.style.getPropertyValue("display")).toBe("flex");

    visible.set(false);
    expect(element.style.getPropertyValue("display")).toBe("none");

    visible.set(true);
    expect(element.style.getPropertyValue("display")).toBe("flex");
  });

  test("эффекты внутри продолжают жить, пока элемент скрыт", () => {
    const visible = signal(true);
    const source = signal(0);
    let runs = 0;
    const { container, render } = mount();

    render(() =>
      div(
        { show: visible },
        span(() => {
          runs++;
          return String(source());
        }),
      ),
    );

    visible.set(false);
    source.set(1);
    // В отличие от when содержимое не уничтожается — эффект отработал.
    expect(runs).toBe(2);
    expect(container.textContent).toBe("1");
  });

  test("принимает обычную функцию как условие", () => {
    const count = signal(0);
    const { container, render } = mount();
    render(() => div({ show: () => count() > 0 }));

    const element = container.firstElementChild as HTMLElement;
    expect(element.style.getPropertyValue("display")).toBe("none");

    count.set(1);
    expect(element.style.getPropertyValue("display")).toBe("");
  });

  test("работает на веб-компоненте", () => {
    class Hidden extends defineComponent({ props: {} }) {
      render() {
        return div("внутри");
      }
    }
    const [hidden, register] = configCustomComponent(Hidden, nextTag("hidden"));
    register();

    const visible = signal(true);
    const { container, render } = mount();
    render(() => div({}, hidden({ show: visible })));

    const element = container.querySelector("*")!.firstElementChild as HTMLElement;
    visible.set(false);
    expect(element.style.getPropertyValue("display")).toBe("none");
  });
});

describe("createComponent", () => {
  test("возвращает разметку и принимает детей", () => {
    const Card = createComponent<{ title: string }, HTMLElement>((props, ...children) =>
      section({ class: "card" }, h3(props.title), ...children),
    );

    const { container, render } = mount();
    render(() => Card({ title: "Отчёт" }, p("тело")));

    const element = container.firstElementChild!;
    expect(element.tagName).toBe("SECTION");
    expect(element.querySelector("h3")!.textContent).toBe("Отчёт");
    expect(element.querySelector("p")!.textContent).toBe("тело");
  });

  test("class/attrs/style/show ложатся на корневой элемент", () => {
    const Box = createComponent<{ label: string }, HTMLElement>((props) => div(props.label));

    const visible = signal(true);
    const { container, render } = mount();
    render(() =>
      Box({
        label: "текст",
        class: ["boxed"],
        attrs: { role: "note" },
        style: { color: "red" },
        show: visible,
      }),
    );

    const element = container.firstElementChild as HTMLElement;
    expect([...element.classList]).toEqual(["boxed"]);
    expect(element.getAttribute("role")).toBe("note");
    expect(element.style.getPropertyValue("color")).toBe("red");

    visible.set(false);
    expect(element.style.getPropertyValue("display")).toBe("none");
  });

  test("реактивность внутри принадлежит вызывающему компоненту", async () => {
    const source = signal(0);
    let runs = 0;

    const Live = createComponent<{}, HTMLElement>(() =>
      span(() => {
        runs++;
        return String(source());
      }),
    );

    class Holder extends defineComponent({ props: {} }) {
      render() {
        return div({}, Live({}));
      }
    }
    const [holder, register] = configCustomComponent(Holder, nextTag("fn-holder"));
    register();

    const element = mountElement(holder());
    expect(runs).toBe(1);

    source.set(1);
    expect(runs).toBe(2);

    element.remove();
    await flushMicrotasks();
    source.set(2);
    expect(runs).toBe(2);
  });
});

describe("configCustomComponent", () => {
  test("регистрация с постфиксом меняет тег, но не вызов фабрики", () => {
    class Button extends defineComponent({ props: { label: "" } }) {
      render() {
        return span(this.props.label);
      }
    }
    const base = nextTag("btn");
    const [button, register] = configCustomComponent(Button, base);

    const tag = register({ postfix: "moduleA" });
    expect(tag).toBe(`${base}-modulea` as CustomTagName);
    expect(customElements.get(tag)).toBe(Button as unknown as CustomElementConstructor);

    const element = mountElement(button({ ".label": "жми" }));
    expect(element.tagName.toLowerCase()).toBe(tag);
    expect(element.shadowRoot!.textContent).toBe("жми");
  });

  test("без постфикса берётся базовый тег", () => {
    class Plain extends defineComponent({ props: {} }) {
      render() {
        return div();
      }
    }
    const base = nextTag("plain");
    const [, register] = configCustomComponent(Plain, base);

    expect(register()).toBe(base);
  });

  test("фабрика до регистрации падает с понятной ошибкой", () => {
    class Early extends defineComponent({ props: {} }) {
      render() {
        return div();
      }
    }
    const [early] = configCustomComponent(Early, nextTag("early"));

    expect(() => early()).toThrow(/is not registered/);
  });

  test("две сборки одного кита уживаются на странице, вызовы фабрик одинаковые", () => {
    // Сборка кита: свои классы, внутренняя композиция идёт через фабрики, а не через имена тегов.
    const buildKit = (version: string) => {
      class Button extends defineComponent({ props: { label: "" } }) {
        render() {
          return span(`${version}:`, this.props.label);
        }
      }
      class Card extends defineComponent({ props: { title: "" } }) {
        render() {
          return div(h3(this.props.title), kitButton({ ".label": "ok" }));
        }
      }
      const [kitButton, registerButton] = configCustomComponent(Button, buttonTag);
      const [kitCard, registerCard] = configCustomComponent(Card, cardTag);
      const registerAll = (options?: { postfix?: string }) => [registerButton(options), registerCard(options)];
      return { kitCard, registerAll };
    };
    const buttonTag = nextTag("kit-button");
    const cardTag = nextTag("kit-card");

    const kit1 = buildKit("1.7");
    const kit2 = buildKit("1.8");
    expect(kit1.registerAll({ postfix: "v1-7" })).toEqual([`${buttonTag}-v1-7`, `${cardTag}-v1-7`] as CustomTagName[]);
    expect(kit2.registerAll({ postfix: "v1-8" })).toEqual([`${buttonTag}-v1-8`, `${cardTag}-v1-8`] as CustomTagName[]);

    // Модуль на ките 1.8 встроен в модуль на ките 1.7.
    const inner = kit2.kitCard({ ".title": "B" });
    const outer = mountElement(kit1.kitCard({ ".title": "A" }, inner));

    const innerButton = inner.shadowRoot!.querySelector(`${buttonTag}-v1-8`)!;
    const outerButton = outer.shadowRoot!.querySelector(`${buttonTag}-v1-7`)!;
    expect(innerButton.shadowRoot!.textContent).toBe("1.8:ok");
    expect(outerButton.shadowRoot!.textContent).toBe("1.7:ok");
  });

  test("постфикс по версии кита: общий экземпляр кита регистрируют два модуля без ошибок", () => {
    class Shared extends defineComponent({ props: {} }) {
      render() {
        return div();
      }
    }
    const base = nextTag("shared");
    const [, register] = configCustomComponent(Shared, base);
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      expect(register({ postfix: "v2" })).toBe(`${base}-v2` as CustomTagName);
      expect(register({ postfix: "v2" })).toBe(`${base}-v2` as CustomTagName);
    } finally {
      console.error = original;
    }
    expect(errors).toEqual([]);
  });

  test("повторная регистрация тем же тегом безопасна", () => {
    class Twice extends defineComponent({ props: {} }) {
      render() {
        return div();
      }
    }
    const base = nextTag("twice");
    const [twice, register] = configCustomComponent(Twice, base);

    register();
    expect(register()).toBe(base);
    expect(mountElement(twice()).tagName.toLowerCase()).toBe(base);
  });
});

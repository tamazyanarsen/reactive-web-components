import { afterEach, describe, expect, test } from "bun:test";
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

  test("реактивность внутри принадлежит вызывающему компоненту", () => {
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

    expect(() => early()).toThrow(/не зарегистрирован/);
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

import { afterEach, describe, expect, test } from "bun:test";
import { flushMicrotasks } from "./helpers";
import {
  BaseElement,
  defineComponent,
  payload,
  useCustomComponent,
  type CustomTagName,
} from "../src/shared/components/custom/custom-element";
import { button, div, span } from "../src/shared/components/html/html-fabric";
import { computed, onMount } from "../src/shared/components/utils/render-context";
import { css } from "../src/shared/components/utils/styles";
import { effect, signal } from "../src/shared/signals";

/** Теги регистрируются глобально и навсегда — каждому тесту нужен свой. */
let tagCounter = 0;
const nextTag = (name: string) => `x-${name}-${tagCounter++}` as CustomTagName;

const mounted: HTMLElement[] = [];

/** Вставляет элемент в документ: без этого connectedCallback не сработает. */
const mount = <T extends HTMLElement>(element: T) => {
  document.body.append(element);
  mounted.push(element);
  return element;
};

const shadowOf = (element: HTMLElement) => element.shadowRoot!;

afterEach(() => {
  for (const element of mounted) element.remove();
  mounted.length = 0;
});

describe("defineComponent", () => {
  test("рендерит разметку в открытый shadow root", () => {
    class Hello extends defineComponent({ props: {} }) {
      render() {
        return div("привет");
      }
    }
    const hello = useCustomComponent(Hello, nextTag("hello"));

    const element = mount(hello());
    expect(shadowOf(element).textContent).toBe("привет");
  });

  test("shadow: closed закрывает доступ снаружи", () => {
    class Closed extends defineComponent({ props: {}, shadow: "closed" }) {
      render() {
        return div("скрыто");
      }
    }
    const closed = useCustomComponent(Closed, nextTag("closed"));

    const element = mount(closed());
    expect(element.shadowRoot).toBeNull();
  });

  test("пропсы — сигналы с начальными значениями", () => {
    class Counter extends defineComponent({ props: { value: 0, label: "шт" } }) {
      render() {
        return span(() => `${this.props.value()} ${this.props.label()}`);
      }
    }
    const counter = useCustomComponent(Counter, nextTag("counter"));

    const element = mount(counter());
    expect(shadowOf(element).textContent).toBe("0 шт");
  });

  test(".проп пишет прямо в сигнал, минуя атрибут", () => {
    class Box extends defineComponent({ props: { items: [] as string[] } }) {
      render() {
        return span(() => this.props.items().join(","));
      }
    }
    const box = useCustomComponent(Box, nextTag("box"));

    const element = mount(box({ ".items": ["a", "b"] }));
    expect(shadowOf(element).textContent).toBe("a,b");
    expect(element.hasAttribute("items")).toBe(false);
  });

  test("реактивный проп обновляет компонент", () => {
    class Echo extends defineComponent({ props: { text: "" } }) {
      render() {
        return span(this.props.text);
      }
    }
    const echo = useCustomComponent(Echo, nextTag("echo"));

    const source = signal("раз");
    const element = mount(echo({ ".text": source }));
    expect(shadowOf(element).textContent).toBe("раз");

    source.set("два");
    expect(shadowOf(element).textContent).toBe("два");
  });

  test("атрибут в kebab-case попадает в проп в camelCase и разбирается по типу", () => {
    class Config extends defineComponent({ props: { maxCount: 0, enabled: false } }) {
      render() {
        return span(() => `${this.props.maxCount()}/${this.props.enabled()}`);
      }
    }
    const config = useCustomComponent(Config, nextTag("config"));

    const element = mount(config());
    element.setAttribute("max-count", "7");
    element.setAttribute("enabled", "true");
    expect(shadowOf(element).textContent).toBe("7/true");
  });

  test("removeAttribute откатывает проп к начальному значению", () => {
    class WithDefault extends defineComponent({ props: { size: 10 } }) {
      render() {
        return span(() => String(this.props.size()));
      }
    }
    const withDefault = useCustomComponent(WithDefault, nextTag("default"));

    const element = mount(withDefault());
    element.setAttribute("size", "20");
    expect(shadowOf(element).textContent).toBe("20");

    element.removeAttribute("size");
    expect(shadowOf(element).textContent).toBe("10");
  });

  test("булев атрибут работает как в HTML: наличие — true, удаление — false", () => {
    class Flag extends defineComponent({ props: { disabled: false } }) {
      render() {
        return span(() => String(this.props.disabled()));
      }
    }
    const flag = useCustomComponent(Flag, nextTag("flag"));

    const element = mount(flag());
    element.setAttribute("disabled", "");
    expect(shadowOf(element).textContent).toBe("true");

    element.setAttribute("disabled", "false");
    expect(shadowOf(element).textContent).toBe("false");

    element.setAttribute("disabled", "disabled");
    element.removeAttribute("disabled");
    expect(shadowOf(element).textContent).toBe("false");
  });

  test("строковый проп получает строку, даже если она похожа на число", () => {
    class Label extends defineComponent({ props: { label: "" } }) {
      render() {
        return span(() => typeof this.props.label());
      }
    }
    const label = useCustomComponent(Label, nextTag("label"));

    const element = mount(label());
    element.setAttribute("label", "42");
    expect(shadowOf(element).textContent).toBe("string");
  });

  test("нечисло в числовом атрибуте откатывается к начальному значению", () => {
    class Size extends defineComponent({ props: { size: 10 } }) {
      render() {
        return span(() => String(this.props.size()));
      }
    }
    const size = useCustomComponent(Size, nextTag("size"));

    const element = mount(size());
    element.setAttribute("size", "abc");
    expect(shadowOf(element).textContent).toBe("10");
  });

  test("неизвестный проп предупреждает и не ломает создание", () => {
    class Empty extends defineComponent({ props: {} }) {
      render() {
        return div();
      }
    }
    const empty = useCustomComponent(Empty, nextTag("empty"));

    // @ts-expect-error пропса нет — проверяем поведение в рантайме
    const element = mount(empty({ ".missing": 1 }));
    expect(shadowOf(element).childNodes.length).toBe(1);
  });
});

describe("события", () => {
  test("эмиттер шлёт CustomEvent с payload", () => {
    class Emitter extends defineComponent({
      props: {},
      events: { valueChange: payload<number>() },
    }) {
      render() {
        return button({ "@click": () => this.events.valueChange(42) }, "жми");
      }
    }
    const emitter = useCustomComponent(Emitter, nextTag("emitter"));

    const received: number[] = [];
    const element = mount(emitter({ "@valueChange": (event) => received.push(event.detail) }));

    shadowOf(element).querySelector("button")!.dispatchEvent(new Event("click"));
    expect(received).toEqual([42]);
  });

  test("имя события переводится в kebab-case", () => {
    class Emitter extends defineComponent({
      props: {},
      events: { valueChange: payload<string>() },
    }) {
      render() {
        return div();
      }
    }
    const emitter = useCustomComponent(Emitter, nextTag("kebab"));

    const element = mount(emitter());
    let seen = "";
    element.addEventListener("value-change", (event) => {
      seen = (event as CustomEvent<string>).detail;
    });

    (element as InstanceType<typeof Emitter>).events.valueChange("ок");
    expect(seen).toBe("ок");
  });

  test("eventOptions управляют всплытием", () => {
    class Local extends defineComponent({
      props: {},
      events: { ping: payload<void>() },
      eventOptions: { ping: { bubbles: false } },
    }) {
      render() {
        return div();
      }
    }
    const local = useCustomComponent(Local, nextTag("local"));

    const wrapper = mount(document.createElement("div"));
    const element = local();
    wrapper.append(element);

    let bubbled = false;
    wrapper.addEventListener("ping", () => (bubbled = true));
    (element as InstanceType<typeof Local>).events.ping();
    expect(bubbled).toBe(false);
  });
});

describe("жизненный цикл", () => {
  test("onMount видит разметку уже в теневом корне, уборка — при отключении", async () => {
    const log: string[] = [];
    class Mounted extends defineComponent({ props: {} }) {
      render() {
        const inner = span("x");
        onMount(() => {
          log.push(`mounted:${inner.isConnected}:${this.shadowRoot!.contains(inner)}`);
          return () => log.push("cleanup");
        });
        log.push(`render:${inner.isConnected}`);
        return inner;
      }
    }
    const mounted = useCustomComponent(Mounted, nextTag("on-mount"));

    const element = mount(mounted());
    expect(log).toEqual(["render:false"]);
    await flushMicrotasks();
    expect(log).toEqual(["render:false", "mounted:true:true"]);

    element.remove();
    await flushMicrotasks();
    expect(log).toEqual(["render:false", "mounted:true:true", "cleanup"]);
  });

  test("onMount не вызывается, если компонент отключили до монтирования", async () => {
    let calls = 0;
    class Gone extends defineComponent({ props: {} }) {
      render() {
        onMount(() => {
          calls++;
        });
        return span();
      }
    }
    const gone = useCustomComponent(Gone, nextTag("gone"));

    const element = mount(gone());
    // Teardown тоже на микрозадаче, но поставлен в очередь позже onMount, поэтому
    // проверяем самый жёсткий случай — уничтожение владельца напрямую.
    element.remove();
    (element as unknown as { teardown(): void }).teardown();
    await flushMicrotasks();
    expect(calls).toBe(0);
  });

  test("обычный effect() в render() принадлежит компоненту", async () => {
    const external = signal(0);
    let runs = 0;
    class Plain extends defineComponent({ props: {} }) {
      render() {
        effect(() => {
          external();
          runs++;
        });
        return span("x");
      }
    }
    const plain = useCustomComponent(Plain, nextTag("plain-effect"));

    const element = mount(plain());
    external.set(1);
    expect(runs).toBe(2);

    element.remove();
    await flushMicrotasks();
    external.set(2);
    expect(runs).toBe(2);
  });

  test("перемещение по DOM не пересоздаёт разметку и не убивает эффекты", async () => {
    const external = signal(0);
    class Movable extends defineComponent({ props: {} }) {
      render() {
        return span(external);
      }
    }
    const movable = useCustomComponent(Movable, nextTag("movable"));

    const first = mount(div());
    const second = mount(div());
    const element = movable();
    first.append(element);
    const rendered = shadowOf(element).firstChild;

    second.append(element);
    await flushMicrotasks();

    expect(shadowOf(element).firstChild).toBe(rendered);
    external.set(1);
    expect(shadowOf(element).textContent).toBe("1");
  });

  test("connectedMoveCallback оставляет компонент как есть", () => {
    class Atomic extends defineComponent({ props: {} }) {
      render() {
        return span("x");
      }
    }
    const atomic = useCustomComponent(Atomic, nextTag("atomic"));
    const element = mount(atomic());
    const rendered = shadowOf(element).firstChild;

    (element as unknown as { connectedMoveCallback(): void }).connectedMoveCallback();
    expect(shadowOf(element).firstChild).toBe(rendered);
  });

  test("эффекты render принадлежат компоненту и умирают с ним", async () => {
    const external = signal(0);
    let runs = 0;

    class Watcher extends defineComponent({ props: {} }) {
      render() {
        return span(() => {
          runs++;
          return String(external());
        });
      }
    }
    const watcher = useCustomComponent(Watcher, nextTag("watcher"));

    const element = mount(watcher());
    expect(runs).toBe(1);

    external.set(1);
    expect(runs).toBe(2);

    element.remove();
    await flushMicrotasks();
    external.set(2);
    expect(runs).toBe(2);
  });

  test("повторное подключение рендерит заново, без дублей", async () => {
    class Again extends defineComponent({ props: {} }) {
      render() {
        return div("тут");
      }
    }
    const again = useCustomComponent(Again, nextTag("again"));

    const element = mount(again());
    expect(shadowOf(element).textContent).toBe("тут");

    element.remove();
    await flushMicrotasks();
    expect(shadowOf(element).textContent).toBe("");

    document.body.append(element);
    expect(shadowOf(element).textContent).toBe("тут");
    expect(shadowOf(element).childNodes.length).toBe(1);
  });

  test("computed внутри render живёт в компоненте", () => {
    const source = signal(2);

    class Doubler extends defineComponent({ props: {} }) {
      render() {
        const doubled = computed(() => source() * 2);
        return span(doubled);
      }
    }
    const doubler = useCustomComponent(Doubler, nextTag("doubler"));

    const element = mount(doubler());
    expect(shadowOf(element).textContent).toBe("4");

    source.set(3);
    expect(shadowOf(element).textContent).toBe("6");
  });
});

describe("styles", () => {
  test("static styles попадают в adoptedStyleSheets", () => {
    class Styled extends defineComponent({ props: {} }) {
      static override styles = css`
        :host {
          display: block;
        }
      `;
      render() {
        return div("со стилем");
      }
    }
    const styled = useCustomComponent(Styled, nextTag("styled"));

    const element = mount(styled());
    expect(shadowOf(element).adoptedStyleSheets.length).toBe(1);
  });

  test("экземпляры делят один CSSStyleSheet", () => {
    const sheetCss = css`
      :host {
        color: red;
      }
    `;

    class Shared extends defineComponent({ props: {}, styles: sheetCss }) {
      render() {
        return div();
      }
    }
    const shared = useCustomComponent(Shared, nextTag("shared"));

    const first = mount(shared());
    const second = mount(shared());
    expect(shadowOf(first).adoptedStyleSheets[0]).toBe(shadowOf(second).adoptedStyleSheets[0]!);
  });

  test("стили переживают переподключение", () => {
    class Persistent extends defineComponent({
      props: {},
      styles: css`
        :host {
          display: flex;
        }
      `,
    }) {
      render() {
        return div();
      }
    }
    const persistent = useCustomComponent(Persistent, nextTag("persistent"));

    const element = mount(persistent());
    element.remove();
    document.body.append(element);
    expect(shadowOf(element).adoptedStyleSheets.length).toBe(1);
  });

  test("массив стилей адоптится целиком", () => {
    class Many extends defineComponent({
      props: {},
      styles: [css`:host { color: red }`, css`:host { margin: 0 }`],
    }) {
      render() {
        return div();
      }
    }
    const many = useCustomComponent(Many, nextTag("many"));

    const element = mount(many());
    expect(shadowOf(element).adoptedStyleSheets.length).toBe(2);
  });
});

describe("useCustomComponent", () => {
  test("регистрирует тег и создаёт нужный класс", () => {
    class Thing extends defineComponent({ props: {} }) {
      render() {
        return div();
      }
    }
    const tag = nextTag("thing");
    const thing = useCustomComponent(Thing, tag);

    expect(customElements.get(tag)).toBe(Thing as unknown as CustomElementConstructor);
    expect(thing()).toBeInstanceOf(Thing);
    expect(Thing.renderTagName).toBe(tag);
  });

  test("класс наследует BaseElement", () => {
    class Thing extends defineComponent({ props: {} }) {
      render() {
        return div();
      }
    }
    useCustomComponent(Thing, nextTag("base"));
    expect(new Thing()).toBeInstanceOf(BaseElement);
  });

  test("дети попадают в светлый DOM", () => {
    class Wrapper extends defineComponent({ props: {} }) {
      render() {
        return div("shadow");
      }
    }
    const wrapper = useCustomComponent(Wrapper, nextTag("wrapper"));

    const element = mount(wrapper({}, span("свет")));
    expect(element.textContent).toBe("свет");
    expect(shadowOf(element).textContent).toBe("shadow");
  });

  test("class садится на host", () => {
    class Host extends defineComponent({ props: {} }) {
      render() {
        return div();
      }
    }
    const host = useCustomComponent(Host, nextTag("host"));

    const active = signal(false);
    const element = mount(host({ class: ["card", { active }] }));

    expect([...element.classList]).toEqual(["card"]);
    active.set(true);
    expect([...element.classList].sort()).toEqual(["active", "card"]);
  });
});

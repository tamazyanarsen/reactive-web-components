import { afterEach, describe, expect, test } from "bun:test";
import {
  defineComponent,
  useCustomComponent,
  type CustomTagName,
} from "../src/shared/components/custom/custom-element";
import { div, span } from "../src/shared/components/html/html-fabric";
import { createContext, provideOn } from "../src/shared/components/utils/context";
import { signal } from "../src/shared/signals";

let tagCounter = 0;
const nextTag = (name: string) => `ctx-${name}-${tagCounter++}` as CustomTagName;

const mounted: HTMLElement[] = [];
const mount = <T extends HTMLElement>(element: T) => {
  document.body.append(element);
  mounted.push(element);
  return element;
};

/**
 * Текст самого глубокого компонента цепочки: textContent теневого корня не заглядывает
 * во вложенные shadow root, поэтому спускаться приходится по одному уровню.
 */
const deepText = (element: Element, depth: number) => {
  let current = element;
  for (let i = 0; i < depth; i++) {
    current = current.shadowRoot!.querySelector("*")!.firstElementChild!;
  }
  return current.shadowRoot!.textContent;
};

afterEach(() => {
  for (const element of mounted) element.remove();
  mounted.length = 0;
});

type Theme = "light" | "dark";

describe("контекст", () => {
  test("потомок в теневом DOM видит значение предка", () => {
    const ThemeKey = createContext<Theme>("theme", "light");

    class Consumer extends defineComponent({ props: {} }) {
      render() {
        return span(this.inject(ThemeKey));
      }
    }
    const consumer = useCustomComponent(Consumer, nextTag("consumer"));

    class Provider extends defineComponent({ props: {} }) {
      render() {
        this.provide(ThemeKey, "dark" as Theme);
        return div({}, consumer());
      }
    }
    const provider = useCustomComponent(Provider, nextTag("provider"));

    expect(deepText(mount(provider()), 1)).toBe("dark");
  });

  test("значение реактивно: запись у провайдера доходит до потребителя", () => {
    const ThemeKey = createContext<Theme>("theme", "light");
    const theme = signal<Theme>("light");

    class Consumer extends defineComponent({ props: {} }) {
      render() {
        return span(this.inject(ThemeKey));
      }
    }
    const consumer = useCustomComponent(Consumer, nextTag("reactive-consumer"));

    class Provider extends defineComponent({ props: {} }) {
      render() {
        this.provide(ThemeKey, theme);
        return div({}, consumer());
      }
    }
    const provider = useCustomComponent(Provider, nextTag("reactive-provider"));

    const element = mount(provider());
    expect(deepText(element, 1)).toBe("light");

    theme.set("dark");
    expect(deepText(element, 1)).toBe("dark");
  });

  test("контекст пробивает несколько уровней компонентов", () => {
    const DepthKey = createContext<number>("depth", 0);

    class Leaf extends defineComponent({ props: {} }) {
      render() {
        return span(() => String(this.inject(DepthKey)()));
      }
    }
    const leaf = useCustomComponent(Leaf, nextTag("leaf"));

    class Middle extends defineComponent({ props: {} }) {
      render() {
        return div({}, leaf());
      }
    }
    const middle = useCustomComponent(Middle, nextTag("middle"));

    class Root extends defineComponent({ props: {} }) {
      render() {
        this.provide(DepthKey, 42);
        return div({}, middle());
      }
    }
    const root = useCustomComponent(Root, nextTag("root"));

    expect(deepText(mount(root()), 2)).toBe("42");
  });

  test("ближайший провайдер перекрывает дальний", () => {
    const LabelKey = createContext<string>("label", "нет");

    class Leaf extends defineComponent({ props: {} }) {
      render() {
        return span(this.inject(LabelKey));
      }
    }
    const leaf = useCustomComponent(Leaf, nextTag("shadow-leaf"));

    class Inner extends defineComponent({ props: {} }) {
      render() {
        this.provide(LabelKey, "ближний");
        return div({}, leaf());
      }
    }
    const inner = useCustomComponent(Inner, nextTag("inner"));

    class Outer extends defineComponent({ props: {} }) {
      render() {
        this.provide(LabelKey, "дальний");
        return div({}, inner());
      }
    }
    const outer = useCustomComponent(Outer, nextTag("outer"));

    expect(deepText(mount(outer()), 2)).toBe("ближний");
  });

  test("значение по умолчанию, когда провайдера нет", () => {
    const SizeKey = createContext<number>("size", 16);

    class Lonely extends defineComponent({ props: {} }) {
      render() {
        return span(() => String(this.inject(SizeKey)()));
      }
    }
    const lonely = useCustomComponent(Lonely, nextTag("lonely"));

    expect(mount(lonely()).shadowRoot!.textContent).toBe("16");
  });

  test("без значения по умолчанию приходит undefined", () => {
    const MissingKey = createContext<string>("missing");

    class Lonely extends defineComponent({ props: {} }) {
      render() {
        return span(() => String(this.inject(MissingKey)()));
      }
    }
    const lonely = useCustomComponent(Lonely, nextTag("missing"));

    expect(mount(lonely()).shadowRoot!.textContent).toBe("undefined");
  });

  test("потребитель в светлом DOM находит провайдера через слот", () => {
    const SlotKey = createContext<string>("slotted", "нет");

    class Consumer extends defineComponent({ props: {} }) {
      render() {
        return span(this.inject(SlotKey));
      }
    }
    const consumer = useCustomComponent(Consumer, nextTag("slot-consumer"));

    class Provider extends defineComponent({ props: {} }) {
      render() {
        this.provide(SlotKey, "через слот");
        return div({}, document.createElement("slot"));
      }
    }
    const provider = useCustomComponent(Provider, nextTag("slot-provider"));

    // Провайдер сначала подключается сам, потом получает содержимое слота:
    // так значение заведомо объявлено до того, как потребитель начнёт рендер.
    const element = mount(provider());
    const child = consumer();
    element.append(child);

    expect(child.shadowRoot!.textContent).toBe("через слот");
  });

  test("поиск ленивый: провайдер, появившийся после первого чтения, подхватывается", () => {
    const LateKey = createContext<string>("late", "нет");
    const trigger = signal(0);

    class Consumer extends defineComponent({ props: {} }) {
      render() {
        const late = this.inject(LateKey);
        return span(() => `${trigger()}:${late()}`);
      }
    }
    const consumer = useCustomComponent(Consumer, nextTag("late-consumer"));

    const host = mount(document.createElement("div"));
    const child = consumer();
    host.append(child);
    expect(child.shadowRoot!.textContent).toBe("0:нет");

    // Значение объявили позже — обход дерева на следующем чтении его найдёт.
    provideOn(host, LateKey, "поздно");
    trigger.set(1);
    expect(child.shadowRoot!.textContent).toBe("1:поздно");
  });

  test("компонент видит собственный провайдер", () => {
    const SelfKey = createContext<string>("self", "нет");

    class SelfProvider extends defineComponent({ props: {} }) {
      render() {
        this.provide(SelfKey, "своё");
        return span(this.inject(SelfKey));
      }
    }
    const selfProvider = useCustomComponent(SelfProvider, nextTag("self"));

    expect(mount(selfProvider()).shadowRoot!.textContent).toBe("своё");
  });

  test("разные ключи не пересекаются", () => {
    const A = createContext<string>("a", "-");
    const B = createContext<string>("b", "-");

    class Consumer extends defineComponent({ props: {} }) {
      render() {
        return span(() => `${this.inject(A)()}/${this.inject(B)()}`);
      }
    }
    const consumer = useCustomComponent(Consumer, nextTag("two-keys"));

    class Provider extends defineComponent({ props: {} }) {
      render() {
        this.provide(A, "а");
        this.provide(B, "б");
        return div({}, consumer());
      }
    }
    const provider = useCustomComponent(Provider, nextTag("two-keys-provider"));

    expect(deepText(mount(provider()), 1)).toBe("а/б");
  });
});

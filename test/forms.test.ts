import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  defineComponent,
  useCustomComponent,
  type CustomTagName,
  type FormValue,
} from "../src/shared/components/custom/custom-element";
import { span } from "../src/shared/components/html/html-fabric";
import { signal } from "../src/shared/signals";

let tagCounter = 0;
const nextTag = (name: string) => `x-${name}-${tagCounter++}` as CustomTagName;

const mounted: HTMLElement[] = [];
const mount = <T extends HTMLElement>(element: T) => {
  document.body.append(element);
  mounted.push(element);
  return element;
};

afterEach(() => {
  for (const element of mounted) element.remove();
  mounted.length = 0;
});

describe("reflect", () => {
  test("пропсы из reflect зеркалятся в атрибуты хоста", () => {
    class Chip extends defineComponent({
      props: { disabled: false, variant: "plain", count: 0, hidden: true },
      reflect: ["disabled", "variant", "count"],
    }) {
      render() {
        return span("chip");
      }
    }
    const chip = useCustomComponent(Chip, nextTag("chip"));

    const element = mount(chip());
    expect(element.hasAttribute("disabled")).toBe(false);
    expect(element.getAttribute("variant")).toBe("plain");
    expect(element.getAttribute("count")).toBe("0");
    // Не из списка reflect — атрибута нет.
    expect(element.hasAttribute("hidden")).toBe(false);

    element.props.disabled.set(true);
    element.props.variant.set("primary");
    element.props.count.set(3);
    expect(element.getAttribute("disabled")).toBe("");
    expect(element.getAttribute("variant")).toBe("primary");
    expect(element.getAttribute("count")).toBe("3");

    element.props.disabled.set(false);
    expect(element.hasAttribute("disabled")).toBe(false);
  });

  test("атрибут из разметки и отражение не зацикливаются", () => {
    class Toggle extends defineComponent({ props: { open: false }, reflect: ["open"] }) {
      render() {
        return span(() => String(this.props.open()));
      }
    }
    const toggle = useCustomComponent(Toggle, nextTag("toggle"));

    const element = mount(toggle());
    element.setAttribute("open", "");
    expect(element.props.open()).toBe(true);
    expect(element.shadowRoot!.textContent).toBe("true");

    element.removeAttribute("open");
    expect(element.props.open()).toBe(false);
  });

  test("значение, заданное через свойство до подключения, отражается на подключении", () => {
    class Badge extends defineComponent({ props: { tone: "info" }, reflect: ["tone"] }) {
      render() {
        return span();
      }
    }
    const badge = useCustomComponent(Badge, nextTag("badge"));

    const element = badge({ ".tone": "danger" });
    expect(element.hasAttribute("tone")).toBe(false);
    mount(element);
    expect(element.getAttribute("tone")).toBe("danger");
  });
});

describe("form-associated", () => {
  /** happy-dom не умеет ElementInternals — подменяем ровно то, что использует библиотека. */
  type FakeInternals = { value: FormValue; setFormValue(value: FormValue): void };
  const created: FakeInternals[] = [];
  const proto = HTMLElement.prototype as unknown as { attachInternals?: () => unknown };
  const original = proto.attachInternals;

  beforeAll(() => {
    proto.attachInternals = function () {
      const internals: FakeInternals = {
        value: null,
        setFormValue(value) {
          internals.value = value;
        },
      };
      created.push(internals);
      return internals;
    };
  });

  afterAll(() => {
    proto.attachInternals = original;
  });

  test("form: true включает formAssociated и даёт internals", () => {
    class Field extends defineComponent({ props: { value: "" }, form: true }) {
      render() {
        return span();
      }
    }
    const field = useCustomComponent(Field, nextTag("field"));

    expect((Field as unknown as { formAssociated: boolean }).formAssociated).toBe(true);
    const element = mount(field());
    expect(element.internals).toBe(created.at(-1) as unknown as ElementInternals);
  });

  test("без form: true internals бросает понятную ошибку", () => {
    class Plain extends defineComponent({ props: {} }) {
      render() {
        return span();
      }
    }
    const plain = useCustomComponent(Plain, nextTag("plain"));

    const element = mount(plain());
    expect(() => element.internals).toThrow(/not form-associated/);
  });

  test("setFormValue с сигналом обновляет значение формы", () => {
    class Input extends defineComponent({ props: { value: "a" }, form: true }) {
      render() {
        this.setFormValue(this.props.value);
        return span(this.props.value);
      }
    }
    const input = useCustomComponent(Input, nextTag("input"));

    const element = mount(input());
    const internals = created.at(-1)!;
    expect(internals.value).toBe("a");

    element.props.value.set("b");
    expect(internals.value).toBe("b");
  });

  test("сброс формы возвращает пропсы к начальным значениям", () => {
    class Counter extends defineComponent({ props: { count: 1 }, form: true }) {
      render() {
        return span(() => String(this.props.count()));
      }
    }
    const counter = useCustomComponent(Counter, nextTag("form-counter"));

    const element = mount(counter());
    element.props.count.set(5);
    element.formResetCallback();
    expect(element.props.count()).toBe(1);
  });

  test("formDisabled — сигнал отключения от fieldset и формы", () => {
    const seen = signal("");
    class Toggle extends defineComponent({ props: {}, form: true }) {
      render() {
        return span(() => {
          seen.set(String(this.formDisabled()));
          return seen.peek();
        });
      }
    }
    const toggle = useCustomComponent(Toggle, nextTag("form-toggle"));

    const element = mount(toggle());
    expect(element.shadowRoot!.textContent).toBe("false");
    element.formDisabledCallback(true);
    expect(element.shadowRoot!.textContent).toBe("true");
  });
});

describe("DOM-свойства пропсов", () => {
  test("el.prop читает и пишет сигнал пропса", () => {
    class Meter extends defineComponent({ props: { level: 1 } }) {
      render() {
        return span(() => String(this.props.level()));
      }
    }
    const meter = useCustomComponent(Meter, nextTag("meter"));

    const element = mount(meter());
    expect(element.level).toBe(1);
    element.level = 7;
    expect(element.props.level()).toBe(7);
    expect(element.shadowRoot!.textContent).toBe("7");
  });

  test("свойство, выставленное до регистрации, переезжает в сигнал при upgrade", () => {
    const tag = nextTag("late");
    const early = document.createElement(tag) as HTMLElement & { label?: string };
    early.label = "до регистрации";
    document.body.append(early);
    mounted.push(early);

    class Late extends defineComponent({ props: { label: "" } }) {
      render() {
        return span(this.props.label);
      }
    }
    useCustomComponent(Late, tag);

    const upgraded = early as unknown as Late;
    expect(upgraded.props.label()).toBe("до регистрации");
    expect(upgraded.shadowRoot!.textContent).toBe("до регистрации");
    upgraded.label = "после";
    expect(upgraded.shadowRoot!.textContent).toBe("после");
  });

  test("имена членов HTMLElement не перекрываются", () => {
    class Titled extends defineComponent({ props: { title: "внутренний" } }) {
      render() {
        return span(this.props.title);
      }
    }
    const titled = useCustomComponent(Titled, nextTag("titled"));

    const element = mount(titled());
    element.title = "нативный";
    expect(element.getAttribute("title")).toBe("нативный");
  });
});

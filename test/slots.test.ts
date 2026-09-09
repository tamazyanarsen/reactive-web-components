import { afterEach, describe, expect, test } from "bun:test";
import {
  defineComponent,
  payload,
  useCustomComponent,
  type CustomTagName,
} from "../src/shared/components/custom/custom-element";
import { each } from "../src/shared/components/html/flow";
import { div, li, span, ul } from "../src/shared/components/html/html-fabric";
import { signal, type ReadonlySignal } from "../src/shared/signals";

let tagCounter = 0;
const nextTag = (name: string) => `slot-${name}-${tagCounter++}` as CustomTagName;

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

type Row = { id: number; name: string };

/** Список с шаблоном строки — типовой потребитель scoped-слота. */
const defineList = (tagName: CustomTagName) => {
  class List extends defineComponent({
    props: { rows: [] as Row[] },
    slots: {
      row: payload<{ row: ReadonlySignal<Row>; index: ReadonlySignal<number> }>(),
      empty: payload<void>(),
    },
  }) {
    render() {
      return ul(
        {},
        each(
          this.props.rows,
          (row, index) => this.renderSlot("row", { row, index }, () => li(() => row().name)),
          (row) => row.id,
        ),
        () => (this.props.rows().length === 0 ? "" : ""),
      );
    }
  }
  return [List, useCustomComponent(List, tagName)] as const;
};

describe("scoped-слоты", () => {
  test("шаблон родителя получает контекст компонента", () => {
    const [, list] = defineList(nextTag("basic"));

    const element = mount(
      list({
        ".rows": [
          { id: 1, name: "раз" },
          { id: 2, name: "два" },
        ],
        "#row": ({ row, index }) => li(() => `${index()}. ${row().name}`),
      }),
    );

    const items = [...element.shadowRoot!.querySelectorAll("li")].map((el) => el.textContent);
    expect(items).toEqual(["0. раз", "1. два"]);
  });

  test("без шаблона рендерится fallback", () => {
    const [, list] = defineList(nextTag("fallback"));

    const element = mount(list({ ".rows": [{ id: 1, name: "раз" }] }));
    const items = [...element.shadowRoot!.querySelectorAll("li")].map((el) => el.textContent);
    expect(items).toEqual(["раз"]);
  });

  test("контекст из сигналов: смена данных не пересоздаёт узлы", () => {
    const [, list] = defineList(nextTag("reactive"));
    const rows = signal<Row[]>([{ id: 1, name: "раз" }]);

    const element = mount(
      list({
        ".rows": rows,
        "#row": ({ row }) => li(() => row().name),
      }),
    );

    const before = element.shadowRoot!.querySelector("li")!;
    expect(before.textContent).toBe("раз");

    rows.set([{ id: 1, name: "ОДИН" }]);
    const after = element.shadowRoot!.querySelector("li")!;
    expect(after.textContent).toBe("ОДИН");
    expect(after).toBe(before);
  });

  test("шаблон может вернуть несколько узлов", () => {
    class Pair extends defineComponent({
      props: {},
      slots: { body: payload<{ value: string }>() },
    }) {
      render() {
        return div({}, this.renderSlot("body", { value: "тут" }));
      }
    }
    const pair = useCustomComponent(Pair, nextTag("multi"));

    const element = mount(
      pair({ "#body": ({ value }) => [span("a"), span(value), span("b")] }),
    );

    const spans = [...element.shadowRoot!.querySelectorAll("span")].map((el) => el.textContent);
    expect(spans).toEqual(["a", "тут", "b"]);
  });

  test("несколько слотов не путаются", () => {
    class TwoSlots extends defineComponent({
      props: {},
      slots: { head: payload<{ title: string }>(), foot: payload<{ note: string }>() },
    }) {
      render() {
        return div(
          {},
          this.renderSlot("head", { title: "заголовок" }),
          this.renderSlot("foot", { note: "подпись" }),
        );
      }
    }
    const twoSlots = useCustomComponent(TwoSlots, nextTag("two"));

    const element = mount(
      twoSlots({
        "#head": ({ title }) => span({ class: "h" }, title),
        "#foot": ({ note }) => span({ class: "f" }, note),
      }),
    );

    expect(element.shadowRoot!.querySelector(".h")!.textContent).toBe("заголовок");
    expect(element.shadowRoot!.querySelector(".f")!.textContent).toBe("подпись");
  });

  test("слот без шаблона и без fallback не оставляет узлов", () => {
    class Maybe extends defineComponent({
      props: {},
      slots: { extra: payload<void>() },
    }) {
      render() {
        return div({}, "до", this.renderSlot("extra", undefined), "после");
      }
    }
    const maybe = useCustomComponent(Maybe, nextTag("optional"));

    const element = mount(maybe());
    expect(element.shadowRoot!.textContent).toBe("допосле");
  });

  test("эффекты внутри шаблона слота умирают вместе с компонентом", () => {
    class Holder extends defineComponent({
      props: {},
      slots: { body: payload<void>() },
    }) {
      render() {
        return div({}, this.renderSlot("body", undefined));
      }
    }
    const holder = useCustomComponent(Holder, nextTag("teardown"));

    const external = signal(0);
    let runs = 0;

    const element = mount(
      holder({
        "#body": () =>
          span(() => {
            runs++;
            return String(external());
          }),
      }),
    );

    expect(runs).toBe(1);
    external.set(1);
    expect(runs).toBe(2);

    element.remove();
    external.set(2);
    expect(runs).toBe(2);
  });
});

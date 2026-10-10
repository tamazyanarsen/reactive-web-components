import { afterEach, describe, expect, test } from "bun:test";
import { dynamic, each, when } from "../src/shared/components/html/flow";
import { div, li, span } from "../src/shared/components/html/html-fabric";
import { onCleanup, signal } from "../src/shared/signals";
import { childrenOf, mountScope, textOf } from "./helpers";

let mounted: ReturnType<typeof mountScope> | null = null;

const mount = () => {
  mounted = mountScope();
  return mounted;
};

afterEach(() => {
  mounted?.dispose();
  mounted = null;
});

describe("when", () => {
  test("показывает ветку по условию и переключает её", () => {
    const isOpen = signal(true);
    const { container, render } = mount();
    render(() => when(isOpen, () => span("да"), () => span("нет")));

    expect(textOf(container)).toBe("да");
    isOpen.set(false);
    expect(textOf(container)).toBe("нет");
  });

  test("без ветки else пусто", () => {
    const isOpen = signal(false);
    const { container, render } = mount();
    render(() => when(isOpen, () => span("да")));

    expect(textOf(container)).toBe("");
    isOpen.set(true);
    expect(textOf(container)).toBe("да");
  });

  test("не пересобирает ветку, пока истинность не изменилась", () => {
    const count = signal(1);
    let builds = 0;
    const { render } = mount();
    render(() =>
      when(
        () => count() > 0,
        () => {
          builds++;
          return span("положительное");
        },
      ),
    );

    expect(builds).toBe(1);
    count.set(2);
    count.set(3);
    expect(builds).toBe(1);

    count.set(-1);
    count.set(1);
    expect(builds).toBe(2);
  });

  test("уничтожает эффекты снятой ветки", () => {
    const isOpen = signal(true);
    const inner = signal(0);
    let runs = 0;
    const { render } = mount();

    render(() =>
      when(isOpen, () =>
        span(() => {
          runs++;
          return inner();
        }),
      ),
    );
    expect(runs).toBe(1);

    isOpen.set(false);
    inner.set(1);
    expect(runs).toBe(1);
  });

  test("не оборачивает содержимое в лишний элемент", () => {
    const { container, render } = mount();
    render(() => div({}, "до", when(() => true, () => span("тут")), "после"));

    const wrapper = container.firstElementChild!;
    expect(wrapper.querySelector("div")).toBeNull();
    expect(textOf(wrapper)).toBe("дотутпосле");
  });

  test("сохраняет место среди статических соседей при переключении", () => {
    const isOpen = signal(false);
    const { container, render } = mount();
    render(() => div({}, span("до"), when(isOpen, () => span("тут")), span("после")));

    const wrapper = container.firstElementChild!;
    expect(childrenOf(wrapper)).toEqual(["до", "после"]);

    isOpen.set(true);
    expect(childrenOf(wrapper)).toEqual(["до", "тут", "после"]);

    isOpen.set(false);
    expect(childrenOf(wrapper)).toEqual(["до", "после"]);
  });
});

describe("dynamic", () => {
  test("пересобирает содержимое на любое чтение внутри render", () => {
    const name = signal("мир");
    const { container, render } = mount();
    render(() => dynamic(() => span(`привет, ${name()}`)));

    expect(textOf(container)).toBe("привет, мир");
    name.set("rwc");
    expect(textOf(container)).toBe("привет, rwc");
  });

  test("cleanup прошлой сборки выполняется при пересборке", () => {
    const key = signal("a");
    const log: string[] = [];
    const { render } = mount();

    render(() =>
      dynamic(() => {
        const current = key();
        return span(() => {
          onCleanup(() => log.push(`cleanup:${current}`));
          return current;
        });
      }),
    );

    key.set("b");
    expect(log).toContain("cleanup:a");
  });

  test("возврат null очищает содержимое", () => {
    const show = signal(true);
    const { container, render } = mount();
    render(() => dynamic(() => (show() ? span("есть") : null)));

    expect(textOf(container)).toBe("есть");
    show.set(false);
    expect(textOf(container)).toBe("");
  });
});

describe("each", () => {
  test("рендерит список и реагирует на добавление", () => {
    const items = signal(["a", "b"]);
    const { container, render } = mount();
    render(() => div({}, each(items, (item) => li({}, item))));

    const list = container.firstElementChild!;
    expect(childrenOf(list)).toEqual(["a", "b"]);

    items.set(["a", "b", "c"]);
    expect(childrenOf(list)).toEqual(["a", "b", "c"]);
  });

  test("удаление элемента убирает его узлы", () => {
    const items = signal(["a", "b", "c"]);
    const { container, render } = mount();
    render(() => div({}, each(items, (item) => li({}, item))));

    const list = container.firstElementChild!;
    items.set(["a", "c"]);
    expect(childrenOf(list)).toEqual(["a", "c"]);
  });

  test("переиспользует узлы по ключу при перестановке", () => {
    const items = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const { container, render } = mount();
    render(() =>
      div({}, each(items, (item) => li({}, () => String(item().id)), (item) => item.id)),
    );

    const list = container.firstElementChild!;
    const before = [...list.querySelectorAll("li")];
    expect(childrenOf(list)).toEqual(["1", "2", "3"]);

    items.set([{ id: 3 }, { id: 1 }, { id: 2 }]);
    expect(childrenOf(list)).toEqual(["3", "1", "2"]);

    const after = [...list.querySelectorAll("li")];
    // Те же самые DOM-узлы, просто переставлены.
    expect(after[0]).toBe(before[2]!);
    expect(after[1]).toBe(before[0]!);
    expect(after[2]).toBe(before[1]!);
  });

  test("перестановка идёт через moveBefore, если он есть", () => {
    const proto = Element.prototype as Element & { moveBefore?: (node: Node, child: Node | null) => void };
    const moved: Node[] = [];
    proto.moveBefore = function (this: Element, node: Node, child: Node | null) {
      moved.push(node);
      this.insertBefore(node, child);
    };

    try {
      const items = signal([1, 2, 3]);
      const { container, render } = mount();
      render(() => div({}, each(items, (item) => li({}, () => String(item())))));

      const list = container.firstElementChild!;
      items.set([3, 1, 2]);
      expect(childrenOf(list)).toEqual(["3", "1", "2"]);
      expect(moved.length).toBeGreaterThan(0);
    } finally {
      // Reflect: в lib новых версий TypeScript moveBefore у Element обязательный.
      Reflect.deleteProperty(proto, "moveBefore");
    }
  });

  test("перестановка двух соседей двигает минимум узлов", () => {
    const items = signal([1, 2, 3, 4, 5]);
    const { container, render } = mount();
    render(() => div({}, each(items, (item) => li({}, () => String(item())))));

    const list = container.firstElementChild!;
    const before = [...list.querySelectorAll("li")];

    // Меняем местами 2 и 3 — остальные должны остаться на своих местах.
    items.set([1, 3, 2, 4, 5]);
    const after = [...list.querySelectorAll("li")];

    expect(childrenOf(list)).toEqual(["1", "3", "2", "4", "5"]);
    expect(after[0]).toBe(before[0]!);
    expect(after[3]).toBe(before[3]!);
    expect(after[4]).toBe(before[4]!);
  });

  test("в рендер приходят сигналы: смена значения не пересоздаёт узел", () => {
    const items = signal([
      { id: 1, text: "раз" },
      { id: 2, text: "два" },
    ]);
    const { container, render } = mount();
    render(() =>
      div({}, each(items, (item) => li({}, () => item().text), (item) => item.id)),
    );

    const list = container.firstElementChild!;
    const before = [...list.querySelectorAll("li")];

    items.set([
      { id: 1, text: "ОДИН" },
      { id: 2, text: "два" },
    ]);

    expect(childrenOf(list)).toEqual(["ОДИН", "два"]);
    expect([...list.querySelectorAll("li")][0]).toBe(before[0]!);
  });

  test("index — сигнал и обновляется при перестановке", () => {
    const items = signal([{ id: "a" }, { id: "b" }]);
    const { container, render } = mount();
    render(() =>
      div(
        {},
        each(
          items,
          (item, index) => li({}, () => `${index()}:${item().id}`),
          (item) => item.id,
        ),
      ),
    );

    const list = container.firstElementChild!;
    expect(childrenOf(list)).toEqual(["0:a", "1:b"]);

    items.set([{ id: "b" }, { id: "a" }]);
    expect(childrenOf(list)).toEqual(["0:b", "1:a"]);
  });

  test("не съедает статических соседей блока", () => {
    const items = signal(["x"]);
    const { container, render } = mount();
    render(() => div({}, "голова", each(items, (item) => span({}, item)), "хвост"));

    const wrapper = container.firstElementChild!;
    expect(textOf(wrapper)).toBe("головаxхвост");

    items.set([]);
    expect(textOf(wrapper)).toBe("головахвост");
  });

  test("уничтожает эффекты удалённых записей", () => {
    const items = signal([1, 2]);
    let runs = 0;
    const external = signal(0);
    const { render } = mount();

    render(() =>
      div(
        {},
        each(items, (item) =>
          li({}, () => {
            runs++;
            external();
            return String(item());
          }),
        ),
      ),
    );

    expect(runs).toBe(2);
    items.set([1]);

    runs = 0;
    external.set(1);
    expect(runs).toBe(1);
  });

  test("пустой список и восстановление", () => {
    const items = signal<string[]>([]);
    const { container, render } = mount();
    render(() => div({}, each(items, (item) => li({}, item))));

    const list = container.firstElementChild!;
    expect(childrenOf(list)).toEqual([]);

    items.set(["a"]);
    expect(childrenOf(list)).toEqual(["a"]);
  });

  test("вложенный when внутри записи не ломает диапазон записи", () => {
    const items = signal([1, 2]);
    const expanded = signal(false);
    const { container, render } = mount();

    render(() =>
      div(
        {},
        each(
          items,
          (item) =>
            li({}, () => String(item()), when(expanded, () => span("+"))),
          (item) => item,
        ),
      ),
    );

    const list = container.firstElementChild!;
    expect(childrenOf(list)).toEqual(["1", "2"]);

    expanded.set(true);
    expect(childrenOf(list)).toEqual(["1+", "2+"]);

    items.set([2, 1]);
    expect(childrenOf(list)).toEqual(["2+", "1+"]);
  });
});

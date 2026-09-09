import { afterEach, describe, expect, test } from "bun:test";
import { firstUpdate, resource } from "../src/shared/components/utils/effects";
import { combine, derived, effect, rs, signal } from "../src/shared/signals";
import { mountScope } from "./helpers";

let mounted: ReturnType<typeof mountScope> | null = null;

const mount = () => {
  mounted = mountScope();
  return mounted;
};

/** Отдаёт управление микрозадачам: resource раскладывает ответ в .then. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  mounted?.dispose();
  mounted = null;
});

describe("derived", () => {
  test("считается на каждое чтение и остаётся реактивным", () => {
    const first = signal("Ада");
    const last = signal("Лавлейс");
    let computes = 0;

    const full = derived(() => {
      computes++;
      return `${first()} ${last()}`;
    });

    expect(full()).toBe("Ада Лавлейс");
    expect(full()).toBe("Ада Лавлейс");
    // Без запоминания: два чтения — два вычисления.
    expect(computes).toBe(2);

    const seen: string[] = [];
    effect(() => seen.push(full()));
    last.set("Байрон");
    expect(seen).toEqual(["Ада Лавлейс", "Ада Байрон"]);
  });

  test("peek не подписывает", () => {
    const source = signal(1);
    const doubled = derived(() => source() * 2);
    let runs = 0;

    effect(() => {
      doubled.peek();
      runs++;
    });

    source.set(2);
    expect(runs).toBe(1);
    expect(doubled.peek()).toBe(4);
  });
});

describe("rs", () => {
  test("собирает строку из сигналов и статики", () => {
    const size = signal("lg");
    const label = rs`btn btn-${size}`;

    expect(label()).toBe("btn btn-lg");
    size.set("sm");
    expect(label()).toBe("btn btn-sm");
  });

  test("принимает обычные функции и статические значения", () => {
    const active = signal(true);
    const label = rs`state:${() => (active() ? "on" : "off")}:${5}`;

    expect(label()).toBe("state:on:5");
    active.set(false);
    expect(label()).toBe("state:off:5");
  });

  test("годится как реактивный текст в разметке", () => {
    const name = signal("мир");
    const { container, render } = mount();
    render(() => {
      const span = document.createElement("span");
      const text = rs`привет, ${name}`;
      effect(() => {
        span.textContent = text();
      });
      return span;
    });

    expect(container.textContent).toBe("привет, мир");
    name.set("rwc");
    expect(container.textContent).toBe("привет, rwc");
  });
});

describe("combine", () => {
  test("отдаёт кортеж значений и типы сохраняются", () => {
    const width = signal(10);
    const label = signal("px");
    const both = combine(width, label);

    const [w, l] = both();
    expect(w).toBe(10);
    expect(l).toBe("px");
  });

  test("подписывает на все источники сразу", () => {
    const a = signal(1);
    const b = signal(2);
    const seen: number[][] = [];

    effect(() => seen.push([...combine(a, b)()] as number[]));
    a.set(3);
    b.set(4);

    expect(seen).toEqual([
      [1, 2],
      [3, 2],
      [3, 4],
    ]);
  });
});

describe("firstUpdate", () => {
  test("пропускает начальное значение и ловит первое изменение", () => {
    const value = signal("а");
    const seen: string[] = [];
    const { render } = mount();

    render(() => {
      firstUpdate(value, (next) => seen.push(next));
      return document.createElement("div");
    });

    expect(seen).toEqual([]);
    value.set("б");
    expect(seen).toEqual(["б"]);
  });

  test("срабатывает ровно один раз", () => {
    const value = signal(0);
    const seen: number[] = [];
    const { render } = mount();

    render(() => {
      firstUpdate(value, (next) => seen.push(next));
      return document.createElement("div");
    });

    value.set(1);
    value.set(2);
    value.set(3);
    expect(seen).toEqual([1]);
  });
});

describe("resource", () => {
  test("раскладывает успешный ответ в data и снимает loading", async () => {
    const { render } = mount();
    let found!: ReturnType<typeof resource<string>>;

    render(() => {
      found = resource(() => Promise.resolve("готово"));
      return document.createElement("div");
    });

    expect(found.loading()).toBe(true);
    expect(found.data()).toBeUndefined();

    await tick();
    expect(found.loading()).toBe(false);
    expect(found.data()).toBe("готово");
    expect(found.error()).toBeUndefined();
  });

  test("отказ попадает в error", async () => {
    const { render } = mount();
    let found!: ReturnType<typeof resource<string>>;

    render(() => {
      found = resource(() => Promise.reject(new Error("нет связи")));
      return document.createElement("div");
    });

    await tick();
    expect(found.loading()).toBe(false);
    expect((found.error() as Error).message).toBe("нет связи");
  });

  test("перезапрашивает при изменении зависимости", async () => {
    const query = signal("а");
    const { render } = mount();
    let found!: ReturnType<typeof resource<string>>;

    render(() => {
      found = resource(() => Promise.resolve(`ответ:${query()}`));
      return document.createElement("div");
    });

    await tick();
    expect(found.data()).toBe("ответ:а");

    query.set("б");
    await tick();
    expect(found.data()).toBe("ответ:б");
  });

  test("устаревший ответ не перетирает свежий", async () => {
    const query = signal("медленный");
    const { render } = mount();
    let found!: ReturnType<typeof resource<string>>;

    render(() => {
      found = resource((abort) => {
        const value = query();
        const delay = value === "медленный" ? 30 : 0;
        return new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => resolve(value), delay);
          abort.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("отменено"));
          });
        });
      });
      return document.createElement("div");
    });

    // Меняем запрос до того, как медленный ответ успел прийти.
    query.set("быстрый");
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(found.data()).toBe("быстрый");
  });

  test("предыдущий запрос получает abort", async () => {
    const query = signal(1);
    const aborted: number[] = [];
    const { render } = mount();

    render(() => {
      resource((abort) => {
        const value = query();
        abort.addEventListener("abort", () => aborted.push(value));
        return new Promise<number>(() => {});
      });
      return document.createElement("div");
    });

    query.set(2);
    expect(aborted).toEqual([1]);
  });

  test("refetch повторяет запрос без смены зависимостей", async () => {
    let calls = 0;
    const { render } = mount();
    let found!: ReturnType<typeof resource<number>>;

    render(() => {
      found = resource(() => Promise.resolve(++calls));
      return document.createElement("div");
    });

    await tick();
    expect(found.data()).toBe(1);

    found.refetch();
    await tick();
    expect(found.data()).toBe(2);
  });

  test("initialValue виден до первого ответа", () => {
    const { render } = mount();
    let found!: ReturnType<typeof resource<string[]>>;

    render(() => {
      found = resource(() => Promise.resolve(["а"]), { initialValue: [] });
      return document.createElement("div");
    });

    expect(found.data()).toEqual([]);
  });

  test("синхронный fetcher не мигает loading", () => {
    const { render } = mount();
    let found!: ReturnType<typeof resource<number>>;

    render(() => {
      found = resource(() => 7);
      return document.createElement("div");
    });

    expect(found.loading()).toBe(false);
    expect(found.data()).toBe(7);
  });

  test("уничтожение владельца отменяет запрос", () => {
    const scope = mountScope();
    let aborted = false;

    scope.render(() => {
      resource((abort) => {
        abort.addEventListener("abort", () => (aborted = true));
        return new Promise<void>(() => {});
      });
      return document.createElement("div");
    });

    scope.dispose();
    expect(aborted).toBe(true);
  });
});

import { describe, expect, test } from "bun:test";
import { batch, effect, onCleanup, onDispose, signal, untracked } from "../src/shared/signals";

describe("вложенные эффекты", () => {
  test("создаются и работают внутри прогона родителя", () => {
    const outer = signal(0);
    const inner = signal(0);
    const seen: string[] = [];

    effect(() => {
      const o = outer();
      effect(() => seen.push(`${o}:${inner()}`));
    });

    expect(seen).toEqual(["0:0"]);
    inner.set(1);
    expect(seen).toEqual(["0:0", "0:1"]);
  });

  test("не подписывают родителя на свои зависимости", () => {
    const outer = signal(0);
    const inner = signal(0);
    let outerRuns = 0;

    effect(() => {
      outer();
      outerRuns++;
      effect(() => inner());
    });

    expect(outerRuns).toBe(1);
    inner.set(1);
    expect(outerRuns).toBe(1);
  });

  test("перезапуск родителя уничтожает старых детей, а не копит их", () => {
    const outer = signal(0);
    const inner = signal(0);
    let innerRuns = 0;

    effect(() => {
      outer();
      effect(() => {
        inner();
        innerRuns++;
      });
    });

    expect(innerRuns).toBe(1);

    // Три перезапуска родителя — каждый раз ребёнок должен быть ровно один.
    outer.set(1);
    outer.set(2);
    outer.set(3);
    expect(innerRuns).toBe(4);

    innerRuns = 0;
    inner.set(1);
    expect(innerRuns).toBe(1);
  });

  test("уничтожение родителя каскадом уносит детей и внуков", () => {
    const source = signal(0);
    let runs = 0;

    const root = effect(() => {
      effect(() => {
        effect(() => {
          source();
          runs++;
        });
      });
    });

    expect(runs).toBe(1);
    source.set(1);
    expect(runs).toBe(2);

    root.destroy();
    source.set(2);
    expect(runs).toBe(2);
  });

  test("cleanup ребёнка выполняется при перезапуске родителя", () => {
    const outer = signal(0);
    const log: string[] = [];

    effect(() => {
      const o = outer();
      effect(() => {
        onCleanup(() => log.push(`cleanup:${o}`));
      });
    });

    expect(log).toEqual([]);
    outer.set(1);
    expect(log).toEqual(["cleanup:0"]);
  });

  test("onDispose ребёнка срабатывает при перезапуске родителя", () => {
    const outer = signal(0);
    const log: string[] = [];

    effect(() => {
      const o = outer();
      effect(() => onDispose(() => log.push(`dispose:${o}`)));
    });

    outer.set(1);
    expect(log).toEqual(["dispose:0"]);
  });

  test("untracked разрывает владение: эффект переживает перезапуск родителя", () => {
    const outer = signal(0);
    const inner = signal(0);
    let innerRuns = 0;

    effect(() => {
      outer();
      untracked(() =>
        effect(() => {
          inner();
          innerRuns++;
        }),
      );
    });

    expect(innerRuns).toBe(1);
    outer.set(1);
    // Родитель перезапустился и создал ещё один независимый эффект — старый жив.
    expect(innerRuns).toBe(2);

    innerRuns = 0;
    inner.set(1);
    expect(innerRuns).toBe(2);
  });

  test("ребёнка можно уничтожить вручную, не трогая родителя", () => {
    const outer = signal(0);
    const inner = signal(0);
    let innerRuns = 0;
    let outerRuns = 0;

    let child: ReturnType<typeof effect> | null = null;
    effect(() => {
      outer();
      outerRuns++;
      child = effect(() => {
        inner();
        innerRuns++;
      });
    });

    child!.destroy();
    inner.set(1);
    expect(innerRuns).toBe(1);

    outer.set(1);
    expect(outerRuns).toBe(2);
  });
});

describe("peek", () => {
  test("отдаёт значение без подписки", () => {
    const tracked = signal(0);
    const hidden = signal(0);
    let runs = 0;

    effect(() => {
      tracked();
      hidden.peek();
      runs++;
    });

    hidden.set(1);
    expect(runs).toBe(1);

    tracked.set(1);
    expect(runs).toBe(2);
  });

  test("peek видит актуальное значение", () => {
    const count = signal(1);
    count.set(5);
    expect(count.peek()).toBe(5);
  });
});

describe("update", () => {
  test("пишет значение, вычисленное из предыдущего", () => {
    const count = signal(1);
    count.update((prev) => prev + 1);
    expect(count()).toBe(2);
  });

  test("не подписывает эффект на сигнал, в который пишет", () => {
    const trigger = signal(0);
    const count = signal(0);
    let runs = 0;

    effect(() => {
      trigger();
      count.update((prev) => prev + 1);
      runs++;
    });

    expect(runs).toBe(1);
    expect(count()).toBe(1);

    trigger.set(1);
    expect(runs).toBe(2);
    expect(count()).toBe(2);
  });
});

describe("equals", () => {
  test("по умолчанию сравнивает по Object.is", () => {
    const value = signal(Number.NaN);
    let runs = 0;
    effect(() => {
      value();
      runs++;
    });

    // NaN !== NaN, но Object.is(NaN, NaN) — true: лишнего прогона быть не должно.
    value.set(Number.NaN);
    expect(runs).toBe(1);
  });

  test("equals: false будит подписчиков на каждую запись", () => {
    const items = signal<string[]>([], { equals: false });
    const list = items();
    let runs = 0;
    effect(() => {
      items();
      runs++;
    });

    list.push("a");
    items.set(list);
    expect(runs).toBe(2);
  });

  test("своё сравнение решает, что считать изменением", () => {
    const point = signal(
      { x: 0, y: 0 },
      { equals: (prev, next) => prev.x === next.x && prev.y === next.y },
    );
    let runs = 0;
    effect(() => {
      point();
      runs++;
    });

    point.set({ x: 0, y: 0 });
    expect(runs).toBe(1);

    point.set({ x: 1, y: 0 });
    expect(runs).toBe(2);
  });
});

describe("защита от цикла", () => {
  test("эффект, который сам себя будит, падает с понятной ошибкой", () => {
    const count = signal(0);

    expect(() => {
      effect(() => {
        count.set(count() + 1);
      });
    }).toThrow(/бесконечный цикл/);
  });

  test("честная цепочка пересчётов не считается циклом", () => {
    const source = signal(0);
    const log: number[] = [];

    effect(() => log.push(source()));
    batch(() => {
      for (let i = 1; i <= 50; i++) source.set(i);
    });

    expect(log).toEqual([0, 50]);
  });
});

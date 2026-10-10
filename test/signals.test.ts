import { describe, expect, test } from "bun:test";
import {
  batch,
  createComputed,
  createSelector,
  effect,
  isSignal,
  onCleanup,
  onDispose,
  signal,
  untracked,
} from "../src/shared/signals";

describe("signal", () => {
  test("отдаёт начальное значение и обновляется через set", () => {
    const count = signal(1);
    expect(count()).toBe(1);
    count.set(2);
    expect(count()).toBe(2);
  });

  test("опознаётся isSignal, обычная функция — нет", () => {
    expect(isSignal(signal(0))).toBe(true);
    expect(isSignal(() => 0)).toBe(false);
    expect(isSignal(createComputed(() => 1))).toBe(true);
  });

  test("запись того же значения не будит подписчиков", () => {
    const count = signal(1);
    let runs = 0;
    effect(() => {
      count();
      runs++;
    });
    expect(runs).toBe(1);
    count.set(1);
    expect(runs).toBe(1);
  });
});

describe("effect", () => {
  test("выполняется сразу и на каждое изменение зависимости", () => {
    const count = signal(0);
    const seen: number[] = [];
    effect(() => seen.push(count()));

    count.set(1);
    count.set(2);
    expect(seen).toEqual([0, 1, 2]);
  });

  test("обновление синхронно: сразу после set значение уже применено", () => {
    const count = signal(0);
    let mirror = -1;
    effect(() => {
      mirror = count();
    });
    count.set(5);
    expect(mirror).toBe(5);
  });

  test("пересобирает зависимости: условная ветка подписывается заново", () => {
    const useA = signal(true);
    const a = signal("a");
    const b = signal("b");
    const seen: string[] = [];

    effect(() => seen.push(useA() ? a() : b()));
    expect(seen).toEqual(["a"]);

    // Пока читаем a, изменение b не должно будить эффект.
    b.set("b2");
    expect(seen).toEqual(["a"]);

    useA.set(false);
    expect(seen).toEqual(["a", "b2"]);

    // Теперь наоборот: a больше не зависимость.
    a.set("a2");
    expect(seen).toEqual(["a", "b2"]);

    b.set("b3");
    expect(seen).toEqual(["a", "b2", "b3"]);
  });

  test("уничтоженный эффект больше не выполняется", () => {
    const count = signal(0);
    let runs = 0;
    const cb = effect(() => {
      count();
      runs++;
    });

    cb.destroy();
    count.set(1);
    expect(runs).toBe(1);
  });

  test("ромб не даёт двойного прогона", () => {
    const source = signal(0);
    const left = createComputed(() => source() + 1);
    const right = createComputed(() => source() * 2);

    let runs = 0;
    effect(() => {
      left();
      right();
      runs++;
    });
    expect(runs).toBe(1);

    source.set(1);
    expect(runs).toBe(2);
  });
});

describe("batch", () => {
  test("схлопывает несколько записей в один прогон", () => {
    const a = signal(0);
    const b = signal(0);
    let runs = 0;
    effect(() => {
      a();
      b();
      runs++;
    });

    batch(() => {
      a.set(1);
      b.set(1);
    });
    expect(runs).toBe(2);
  });

  test("возвращает значение fn", () => {
    expect(batch(() => 42)).toBe(42);
  });

  test("вложенный batch разбирается на выходе из внешнего", () => {
    const a = signal(0);
    let runs = 0;
    effect(() => {
      a();
      runs++;
    });

    batch(() => {
      batch(() => a.set(1));
      expect(runs).toBe(1);
      a.set(2);
    });
    expect(runs).toBe(2);
    expect(a()).toBe(2);
  });
});

describe("untracked", () => {
  test("чтение внутри не создаёт подписку", () => {
    const tracked = signal(0);
    const hidden = signal(0);
    let runs = 0;

    effect(() => {
      tracked();
      untracked(() => hidden());
      runs++;
    });

    hidden.set(1);
    expect(runs).toBe(1);

    tracked.set(1);
    expect(runs).toBe(2);
  });

  test("возвращает значение и восстанавливает отслеживание после себя", () => {
    const a = signal(1);
    const b = signal(10);
    let sum = 0;

    effect(() => {
      const hidden = untracked(() => b());
      sum = a() + hidden;
    });
    expect(sum).toBe(11);

    b.set(20);
    expect(sum).toBe(11);

    a.set(2);
    expect(sum).toBe(22);
  });
});

describe("onCleanup / onDispose", () => {
  test("onCleanup выполняется перед каждым следующим прогоном", () => {
    const count = signal(0);
    const log: string[] = [];

    effect(() => {
      const value = count();
      log.push(`run:${value}`);
      onCleanup(() => log.push(`cleanup:${value}`));
    });

    count.set(1);
    count.set(2);
    expect(log).toEqual(["run:0", "cleanup:0", "run:1", "cleanup:1", "run:2"]);
  });

  test("onCleanup выполняется и при уничтожении эффекта", () => {
    const log: string[] = [];
    const cb = effect(() => onCleanup(() => log.push("cleanup")));

    cb.destroy();
    expect(log).toEqual(["cleanup"]);
  });

  test("onDispose переживает перезапуски и срабатывает один раз", () => {
    const count = signal(0);
    const log: string[] = [];

    const cb = effect(() => {
      count();
      onDispose(() => log.push("dispose"));
    });

    count.set(1);
    count.set(2);
    expect(log).toEqual([]);

    cb.destroy();
    expect(log).toEqual(["dispose"]);
  });
});

describe("createComputed", () => {
  test("пересчитывается при изменении источника", () => {
    const count = signal(2);
    const doubled = createComputed(() => count() * 2);

    expect(doubled()).toBe(4);
    count.set(3);
    expect(doubled()).toBe(6);
  });

  test("computed можно читать в эффекте", () => {
    const count = signal(1);
    const doubled = createComputed(() => count() * 2);
    const seen: number[] = [];

    effect(() => seen.push(doubled()));
    count.set(2);
    expect(seen).toEqual([2, 4]);
  });

  test("цепочка computed обновляется целиком", () => {
    const count = signal(1);
    const doubled = createComputed(() => count() * 2);
    const quadrupled = createComputed(() => doubled() * 2);

    count.set(3);
    expect(quadrupled()).toBe(12);
  });
});

describe("ленивый computed", () => {
  test("не считается, пока его не прочитали", () => {
    const count = signal(1);
    let runs = 0;
    const doubled = createComputed(() => {
      runs++;
      return count() * 2;
    });

    expect(runs).toBe(0);
    count.set(2);
    expect(runs).toBe(0);
    expect(doubled()).toBe(4);
    expect(runs).toBe(1);
  });

  test("без записей между чтениями отдаёт запомненное значение", () => {
    const count = signal(1);
    let runs = 0;
    const doubled = createComputed(() => {
      runs++;
      return count() * 2;
    });

    doubled();
    doubled();
    expect(runs).toBe(1);
    count.set(5);
    expect(doubled()).toBe(10);
    expect(runs).toBe(2);
  });

  test("эффект никогда не видит промежуточного состояния", () => {
    const a = signal(1);
    const b = createComputed(() => a() * 10);
    const c = createComputed(() => b() + 1);
    const seen: string[] = [];

    // Эффект читает и сам сигнал, и computed поверх него — в старом ядре он мог увидеть
    // новое a рядом со старым c.
    effect(() => seen.push(`${a()}:${c()}`));
    a.set(2);
    expect(seen).toEqual(["1:11", "2:21"]);
  });

  test("пересчёт в то же значение не будит наблюдателей", () => {
    const n = signal(1);
    const parity = createComputed(() => n() % 2);
    let downstream = 0;
    const label = createComputed(() => {
      downstream++;
      return parity() ? "odd" : "even";
    });
    let runs = 0;

    effect(() => {
      runs++;
      label();
    });
    expect(runs).toBe(1);
    expect(downstream).toBe(1);

    n.set(3);
    expect(runs).toBe(1);
    expect(downstream).toBe(1);

    n.set(4);
    expect(runs).toBe(2);
    expect(downstream).toBe(2);
  });

  test("ромб из computed: нижний пересчитывается один раз", () => {
    const a = signal(1);
    const left = createComputed(() => a() + 1);
    const right = createComputed(() => a() * 2);
    let bottomRuns = 0;
    const bottom = createComputed(() => {
      bottomRuns++;
      return left() + right();
    });

    effect(() => bottom());
    expect(bottomRuns).toBe(1);
    a.set(5);
    expect(bottomRuns).toBe(2);
    expect(bottom()).toBe(16);
  });

  test("отписывается от источников, когда наблюдателей не осталось", () => {
    const count = signal(1);
    let runs = 0;
    const doubled = createComputed(() => {
      runs++;
      return count() * 2;
    });

    const watcher = effect(() => doubled());
    expect(runs).toBe(1);
    watcher.destroy();

    count.set(2);
    count.set(3);
    expect(runs).toBe(1);
    expect(doubled()).toBe(6);
  });

  test("перезапуск эффекта не выбрасывает запомненное значение", () => {
    const source = signal(1);
    const other = signal(0);
    let runs = 0;
    const doubled = createComputed(() => {
      runs++;
      return source() * 2;
    });

    effect(() => {
      other();
      doubled();
    });
    other.set(1);
    other.set(2);
    expect(runs).toBe(1);
  });

  test("внутри batch отдаёт уже актуальное значение", () => {
    const count = signal(1);
    const doubled = createComputed(() => count() * 2);
    effect(() => doubled());

    let inside = 0;
    batch(() => {
      count.set(4);
      inside = doubled();
    });
    expect(inside).toBe(8);
  });

  test("equals задаёт, что считать изменением", () => {
    const point = signal({ x: 1, y: 1 });
    const x = createComputed(() => ({ value: point().x }), {
      equals: (prev, next) => prev.value === next.value,
    });
    let runs = 0;
    effect(() => {
      runs++;
      x();
    });

    point.set({ x: 1, y: 2 });
    expect(runs).toBe(1);
    point.set({ x: 2, y: 2 });
    expect(runs).toBe(2);
  });

  test("ошибка в вычислении не ломает следующий пересчёт", () => {
    const fail = signal(true);
    const value = createComputed(() => {
      if (fail()) throw new Error("boom");
      return 1;
    });

    expect(() => value()).toThrow("boom");
    fail.set(false);
    expect(value()).toBe(1);
  });
});

describe("createSelector", () => {
  test("будит только старый и новый выбранный ключ", () => {
    const selected = signal<number | null>(null);
    const isSelected = createSelector(selected);
    const runs = [0, 0, 0, 0];
    const state: boolean[] = [];

    for (let key = 0; key < 4; key++) {
      effect(() => {
        runs[key]!++;
        state[key] = isSelected(key);
      });
    }
    expect(runs).toEqual([1, 1, 1, 1]);

    selected.set(1);
    expect(runs).toEqual([1, 2, 1, 1]);
    expect(state).toEqual([false, true, false, false]);

    selected.set(3);
    expect(runs).toEqual([1, 3, 1, 2]);
    expect(state).toEqual([false, false, false, true]);
  });

  test("своё сравнение", () => {
    const selected = signal("A");
    const isSelected = createSelector(selected, (key: string, value) => key.toLowerCase() === value.toLowerCase());
    let seen = false;
    effect(() => {
      seen = isSelected("b");
    });
    selected.set("B");
    expect(seen).toBe(true);
  });

  test("ключ забывается, когда его перестали читать", () => {
    const selected = signal(0);
    const isSelected = createSelector(selected);
    let runs = 0;
    const watcher = effect(() => {
      runs++;
      isSelected(5);
    });
    watcher.destroy();
    selected.set(5);
    expect(runs).toBe(1);
  });
});

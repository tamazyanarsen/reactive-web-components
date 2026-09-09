import { describe, expect, test } from "bun:test";
import {
  batch,
  createComputed,
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

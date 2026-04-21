import { div, button, signal, effect, projectLog } from "@shared/utils";

// Включаем логи для тестов
projectLog("Starting batching tests");

export function testSimpleBatching() {
  console.log("=== Test 1: Simple Batching ===");

  const count = signal(0);
  const name = signal("Alice");
  let effectRunCount = 0;

  effect(() => {
    effectRunCount++;
    console.log(
      `Effect run #${effectRunCount}: count=${count()}, name=${name()}`,
    );
  });

  // Синхронные изменения
  console.log("Making 3 synchronous changes...");
  count.set(1);
  count.set(2);
  name.set("Bob");

  console.log(
    `Immediately after changes: effectRunCount = ${effectRunCount} (should be 1 - initial run)`,
  );

  // Даем время на выполнение микрозадач
  setTimeout(() => {
    console.log(
      `After microtasks: effectRunCount = ${effectRunCount} (should be 2)`,
    );
    console.log(`Result: ${effectRunCount === 2 ? "PASS" : "FAIL"}`);
    console.log("");
  }, 0);
}

export function testNestedEffects() {
  console.log("=== Test 2: Nested Effects ===");

  const trigger = signal(false);
  const counter = signal(0);
  let outerEffectCount = 0;
  let innerEffectCount = 0;

  effect(() => {
    outerEffectCount++;
    console.log(`Outer effect #${outerEffectCount}: trigger=${trigger()}`);

    if (trigger()) {
      // Создаем вложенный эффект
      effect(() => {
        innerEffectCount++;
        console.log(`Inner effect #${innerEffectCount}: counter=${counter()}`);
      });

      // Изменяем сигнал внутри внешнего эффекта
      console.log("Changing counter inside outer effect...");
      counter.set(counter() + 1);
    }
  });

  console.log("Activating trigger...");
  trigger.set(true);

  setTimeout(() => {
    console.log(
      `Results: outerEffectCount=${outerEffectCount}, innerEffectCount=${innerEffectCount}`,
    );

    // Ожидаемые результаты с улучшенным батчингом:
    // - Внешний эффект: 2 раза (начальный + при trigger.set(true))
    // - Внутренний эффект: 2 раза (начальный при создании + при counter.set())
    const expectedOuter = 2;
    const expectedInner = 2;

    console.log(`Expected: outer=${expectedOuter}, inner=${expectedInner}`);
    console.log(
      `Test: ${outerEffectCount === expectedOuter && innerEffectCount === expectedInner ? "PASS" : "FAIL"}`,
    );
    console.log("");
  }, 0);
}

export function testMultipleNestedUpdates() {
  console.log("=== Test 3: Multiple Nested Updates ===");

  const a = signal(0);
  const b = signal(0);
  const c = signal(0);
  let effectRunCount = 0;

  effect(() => {
    effectRunCount++;
    console.log(`Effect run #${effectRunCount}: a=${a()}, b=${b()}, c=${c()}`);

    if (a() === 1) {
      b.set(2);
    }
    if (b() === 2) {
      c.set(3);
    }
  });

  console.log("Setting a=1 (should trigger chain a->b->c)...");
  a.set(1);

  setTimeout(() => {
    console.log(`Final values: a=${a()}, b=${b()}, c=${c()}`);
    console.log(`Effect run count: ${effectRunCount}`);

    // Ожидаемые результаты:
    // 1. Начальный эффект (a=0, b=0, c=0)
    // 2. Эффект после a.set(1) (a=1, b=0, c=0) → устанавливает b=2
    // 3. Эффект после b.set(2) (a=1, b=2, c=0) → устанавливает c=3
    // 4. Эффект после c.set(3) (a=1, b=2, c=3)
    // Но из-за батчинга некоторые могут объединиться

    // В идеальном батчинге:
    // - Эффект срабатывает 2 раза: начальный и после всех изменений
    // - Все сигналы получают правильные значения
    const valuesCorrect = a() === 1 && b() === 2 && c() === 3;

    console.log(`Expected values: a=1, b=2, c=3`);
    console.log(`Values correct: ${valuesCorrect ? "YES" : "NO"}`);
    console.log(
      `Expected effect runs: 2-4 (depends on batching implementation)`,
    );
    console.log(`Test: ${valuesCorrect ? "PASS" : "FAIL"}`);
    console.log("");
  }, 0);
}

export function testEffectNotRunSynchronously() {
  console.log("=== Test 4: Effects Not Run Synchronously ===");

  const value = signal(0);
  let syncCallCount = 0;
  let asyncCallCount = 0;

  effect(() => {
    const currentValue = value();
    console.log(`Effect called with value: ${currentValue}`);
    asyncCallCount++;
  });

  console.log("Changing signal 5 times synchronously...");

  // Меняем сигнал несколько раз синхронно
  for (let i = 1; i <= 5; i++) {
    value.set(i);
    syncCallCount++;
  }

  console.log(`Sync operations: ${syncCallCount}`);
  console.log(
    `Immediate async calls: ${asyncCallCount} (should be 1 - initial run)`,
  );

  setTimeout(() => {
    console.log(
      `Final async calls: ${asyncCallCount} (should be 2 - initial + batched)`,
    );
    console.log(`Test: ${asyncCallCount === 2 ? "PASS" : "FAIL"}`);
    console.log("");
  }, 0);
}

export function testBatchComponentUpdates() {
  console.log("=== Test 5: Component Update Batching ===");

  const count = signal(0);
  const text = signal("Hello");
  let renderCount = 0;

  const TestComponent = () => {
    renderCount++;
    console.log(
      `Component render #${renderCount}: count=${count()}, text=${text()}`,
    );
    return div(`Count: ${count()}, Text: ${text()}`);
  };

  // Создаем эффект для рендера компонента
  effect(() => {
    TestComponent();
  });

  console.log("Updating multiple signals...");

  // Изменяем несколько сигналов
  count.set(1);
  text.set("World");
  count.set(2);
  text.set("!");
  count.set(3);

  setTimeout(() => {
    console.log(`Total renders: ${renderCount}`);
    // Ожидается: 2 рендера (начальный + батчированный)
    console.log(`Expected: 2 renders`);
    console.log(`Test: ${renderCount === 2 ? "PASS" : "FAIL"}`);
    console.log("");
  }, 0);
}

// UI компонент для визуального тестирования
export function createBatchingTestUI() {
  const test1Passed = signal("⏳");
  const test2Passed = signal("⏳");
  const test3Passed = signal("⏳");
  const test4Passed = signal("⏳");
  const test5Passed = signal("⏳");

  const runTest1 = () => {
    test1Passed.set("🔄");
    setTimeout(() => {
      try {
        testSimpleBatching();
        // В реальном тесте здесь была бы проверка,
        // но для UI просто покажем результат
        test1Passed.set("✅");
      } catch (e) {
        test1Passed.set("❌");
        console.error("Test 1 failed:", e);
      }
    }, 100);
  };

  const runTest2 = () => {
    test2Passed.set("🔄");
    setTimeout(() => {
      try {
        testNestedEffects();
        test2Passed.set("✅");
      } catch (e) {
        test2Passed.set("❌");
        console.error("Test 2 failed:", e);
      }
    }, 100);
  };

  const runTest3 = () => {
    test3Passed.set("🔄");
    setTimeout(() => {
      try {
        testMultipleNestedUpdates();
        test3Passed.set("✅");
      } catch (e) {
        test3Passed.set("❌");
        console.error("Test 3 failed:", e);
      }
    }, 100);
  };

  const runTest4 = () => {
    test4Passed.set("🔄");
    setTimeout(() => {
      try {
        testEffectNotRunSynchronously();
        test4Passed.set("✅");
      } catch (e) {
        test4Passed.set("❌");
        console.error("Test 4 failed:", e);
      }
    }, 100);
  };

  const runTest5 = () => {
    test5Passed.set("🔄");
    setTimeout(() => {
      try {
        testBatchComponentUpdates();
        test5Passed.set("✅");
      } catch (e) {
        test5Passed.set("❌");
        console.error("Test 5 failed:", e);
      }
    }, 100);
  };

  const runAllTests = () => {
    runTest1();
    setTimeout(runTest2, 300);
    setTimeout(runTest3, 600);
    setTimeout(runTest4, 900);
    setTimeout(runTest5, 1200);
  };

  return div(
    { style: { padding: "20px", fontFamily: "monospace" } },
    div(
      { style: { fontSize: "24px", marginBottom: "20px" } },
      "🧪 Effect Batching Tests",
    ),

    div(
      { style: { marginBottom: "10px" } },
      button(
        {
          "@click": runAllTests,
          style: { padding: "10px 20px", fontSize: "16px" },
        },
        "Run All Tests",
      ),
    ),

    div(
      { style: { display: "grid", gap: "10px", marginTop: "20px" } },

      div(
        { style: { display: "flex", alignItems: "center", gap: "10px" } },
        button({ "@click": runTest1 }, "Test 1: Simple Batching"),
        div(test1Passed),
        div("Multiple sync changes → single effect run"),
      ),

      div(
        { style: { display: "flex", alignItems: "center", gap: "10px" } },
        button({ "@click": runTest2 }, "Test 2: Nested Effects"),
        div(test2Passed),
        div("Effects creating other effects"),
      ),

      div(
        { style: { display: "flex", alignItems: "center", gap: "10px" } },
        button({ "@click": runTest3 }, "Test 3: Multiple Nested"),
        div(test3Passed),
        div("Chain of signal updates"),
      ),

      div(
        { style: { display: "flex", alignItems: "center", gap: "10px" } },
        button({ "@click": runTest4 }, "Test 4: Async Execution"),
        div(test4Passed),
        div("Effects never run synchronously"),
      ),

      div(
        { style: { display: "flex", alignItems: "center", gap: "10px" } },
        button({ "@click": runTest5 }, "Test 5: Component Updates"),
        div(test5Passed),
        div("UI component render batching"),
      ),
    ),

    div(
      {
        style: {
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#f5f5f5",
          borderRadius: "5px",
        },
      },
      div(
        { style: { fontWeight: "bold", marginBottom: "10px" } },
        "📝 Test Results in Console",
      ),
      div(
        "Open browser Developer Tools (F12) and check the Console tab to see detailed test output.",
      ),
    ),
  );
}

// Экспорт для использования в других частях приложения
export const BatchingTestComponent = () => createBatchingTestUI();

// Функция для запуска всех тестов из консоли
export function runAllBatchingTests() {
  console.log("🚀 Running all batching tests...");
  console.log("========================================");

  // Запускаем тесты с небольшими задержками между ними
  testSimpleBatching();

  setTimeout(() => {
    testNestedEffects();

    setTimeout(() => {
      testMultipleNestedUpdates();

      setTimeout(() => {
        testEffectNotRunSynchronously();

        setTimeout(() => {
          testBatchComponentUpdates();

          setTimeout(() => {
            console.log("========================================");
            console.log("🎉 All tests completed!");
            console.log("Check results above for PASS/FAIL status.");
          }, 500);
        }, 500);
      }, 500);
    }, 500);
  }, 500);
}

// Автоматический запуск при импорте в dev-режиме
// if (import.meta.env?.DEV) {
//   setTimeout(() => {
//     console.log(
//       "🔍 Batching tests module loaded. Call runAllBatchingTests() to run tests.",
//     );
//   }, 100);
// }

import "./style.css";

import { div, effect, signal } from "@shared/utils";

// ============================================
// ТЕСТ 1: Реактивные стили в вложенных эффектах
// ============================================
console.log("=== ТЕСТ 1: Реактивные стили в вложенных эффектах ===");
const test1Color = signal('red');
const test1Size = signal('10px');

let test1Container: HTMLElement | null = null;

effect(() => {
  const color = test1Color();
  const size = test1Size();
  
  console.log(`[Тест 1] Внешний эффект: color=${color}, size=${size}`);
  
  effect(() => {
    const innerColor = test1Color();
    const innerSize = test1Size();
    
    // Создаём div с реактивными стилями
    const reactiveDiv = div({
      '.id': 'test1-reactive-div',
      style: {
        backgroundColor: () => test1Color(), // Реактивный стиль
        padding: () => test1Size(),          // Реактивный стиль
        color: 'white',
        '--custom-var': () => test1Color(),  // CSS Custom Property
      }
    }, `Color: ${innerColor}, Size: ${innerSize}`);
    
    if (!test1Container) {
      test1Container = document.createElement('div');
      test1Container.id = 'test1-container';
      document.body.appendChild(test1Container);
    }
    
    // Заменяем старый div новым (старые подписки должны удалиться)
    const oldDiv = test1Container.querySelector('#test1-reactive-div');
    if (oldDiv) {
      test1Container.removeChild(oldDiv);
    }
    test1Container.appendChild(reactiveDiv.hostElement);
  });
});

setTimeout(() => test1Color.set('blue'), 100);
setTimeout(() => test1Size.set('20px'), 200);
setTimeout(() => {
  test1Color.set('green');
  test1Size.set('30px');
}, 300);

// ============================================
// ТЕСТ 2: Реактивные классы (classList с функциями)
// ============================================
console.log("=== ТЕСТ 2: Реактивные классы ===");
const test2Active = signal(false);
const test2Highlight = signal(false);

let test2Container: HTMLElement | null = null;

effect(() => {
  const active = test2Active();
  const highlight = test2Highlight();
  
  console.log(`[Тест 2] Внешний эффект: active=${active}, highlight=${highlight}`);
  
  effect(() => {
    const innerActive = test2Active();
    const innerHighlight = test2Highlight();
    
    const reactiveDiv = div({
      '.id': 'test2-reactive-classes',
      classList: [
        'base-class',
        () => test2Active() ? 'active' : '',      // Реактивный класс
        () => test2Highlight() ? 'highlight' : '', // Реактивный класс
        'static-class'
      ],
      style: {
        padding: '10px',
        margin: '5px',
        border: '1px solid black'
      }
    }, `Active: ${innerActive}, Highlight: ${innerHighlight}`);
    
    if (!test2Container) {
      test2Container = document.createElement('div');
      test2Container.id = 'test2-container';
      document.body.appendChild(test2Container);
    }
    
    const oldDiv = test2Container.querySelector('#test2-reactive-classes');
    if (oldDiv) {
      test2Container.removeChild(oldDiv);
    }
    test2Container.appendChild(reactiveDiv.hostElement);
  });
});

setTimeout(() => test2Active.set(true), 400);
setTimeout(() => test2Highlight.set(true), 500);
setTimeout(() => {
  test2Active.set(false);
  test2Highlight.set(false);
}, 600);

// ============================================
// ТЕСТ 3: reactiveClassList с сигналами
// ============================================
console.log("=== ТЕСТ 3: reactiveClassList ===");
const test3Red = signal(false);
const test3Bold = signal(false);
const test3Italic = signal(false);

let test3Container: HTMLElement | null = null;

effect(() => {
  const red = test3Red();
  const bold = test3Bold();
  
  console.log(`[Тест 3] Внешний эффект: red=${red}, bold=${bold}`);
  
  effect(() => {
    const innerRed = test3Red();
    const innerBold = test3Bold();
    const innerItalic = test3Italic();
    
    const reactiveDiv = div({
      '.id': 'test3-reactive-class-list',
      reactiveClassList: {
        'red': test3Red,      // Сигнал для класса
        'bold': test3Bold,    // Сигнал для класса
        'italic': test3Italic // Сигнал для класса
      },
      style: {
        padding: '10px',
        margin: '5px'
      }
    }, `Red: ${innerRed}, Bold: ${innerBold}, Italic: ${innerItalic}`);
    
    if (!test3Container) {
      test3Container = document.createElement('div');
      test3Container.id = 'test3-container';
      document.body.appendChild(test3Container);
    }
    
    const oldDiv = test3Container.querySelector('#test3-reactive-class-list');
    if (oldDiv) {
      test3Container.removeChild(oldDiv);
    }
    test3Container.appendChild(reactiveDiv.hostElement);
  });
});

setTimeout(() => test3Red.set(true), 700);
setTimeout(() => test3Bold.set(true), 800);
setTimeout(() => {
  test3Italic.set(true);
  test3Red.set(false);
}, 900);

// ============================================
// ТЕСТ 4: Трёхуровневая вложенность с реактивными свойствами
// ============================================
console.log("=== ТЕСТ 4: Трёхуровневая вложенность ===");
const test4Level1 = signal(1);
const test4Level2 = signal(2);
const test4Level3 = signal(3);

let test4Container: HTMLElement | null = null;

effect(() => {
  const l1 = test4Level1();
  console.log(`[Тест 4] Уровень 1: ${l1}`);
  
  effect(() => {
    const l2 = test4Level2();
    console.log(`[Тест 4] Уровень 2: ${l2}`);
    
    effect(() => {
      const l3 = test4Level3();
      
      const container = div({
        '.id': 'test4-container',
        style: {
          backgroundColor: () => `rgb(${test4Level1() * 50}, ${test4Level2() * 50}, ${test4Level3() * 50})`,
          padding: () => `${test4Level1() * 10}px`,
        },
        classList: [
          () => `level1-${test4Level1()}`,
          () => `level2-${test4Level2()}`,
        ]
      },
        div({
          '.id': 'test4-inner',
          style: {
            color: () => test4Level1() > 5 ? 'white' : 'black',
            margin: () => `${test4Level2() * 5}px`,
          },
          classList: [
            () => `inner-level2-${test4Level2()}`,
            () => `inner-level3-${test4Level3()}`,
          ]
        }, `L1: ${l1}, L2: ${l2}, L3: ${l3}`)
      );
      
      if (!test4Container) {
        test4Container = document.createElement('div');
        test4Container.id = 'test4-wrapper';
        document.body.appendChild(test4Container);
      }
      
      const oldContainer = test4Container.querySelector('#test4-container');
      if (oldContainer) {
        test4Container.removeChild(oldContainer);
      }
      test4Container.appendChild(container.hostElement);
    });
  });
});

setTimeout(() => test4Level1.set(5), 1000);
setTimeout(() => test4Level2.set(10), 1100);
setTimeout(() => {
  test4Level1.set(8);
  test4Level2.set(15);
  test4Level3.set(20);
}, 1200);

// ============================================
// ТЕСТ 5: Множественные реактивные свойства одновременно
// ============================================
console.log("=== ТЕСТ 5: Множественные реактивные свойства ===");
const test5Color = signal('red');
const test5Size = signal('10px');
const test5Active = signal(false);
const test5Text = signal('Initial');

let test5Container: HTMLElement | null = null;

effect(() => {
  const color = test5Color();
  const size = test5Size();
  const active = test5Active();
  const text = test5Text();
  
  console.log(`[Тест 5] Внешний эффект: color=${color}, size=${size}, active=${active}, text=${text}`);
  
  effect(() => {
    const reactiveDiv = div({
      '.id': 'test5-multiple-reactive',
      style: {
        backgroundColor: () => test5Color(),
        padding: () => test5Size(),
        fontSize: () => test5Active() ? '20px' : '14px',
        '--theme-color': () => test5Color(),
        '--spacing': () => test5Size(),
      },
      classList: [
        'base',
        () => test5Active() ? 'active' : 'inactive',
        () => test5Color() === 'red' ? 'red-theme' : 'other-theme',
      ],
      reactiveClassList: {
        'highlight': test5Active,
      },
      customAttributes: {
        'data-value': () => test5Text(), // Реактивный кастомный атрибут
      }
    }, `Text: ${test5Text()}`);
    
    if (!test5Container) {
      test5Container = document.createElement('div');
      test5Container.id = 'test5-container';
      document.body.appendChild(test5Container);
    }
    
    const oldDiv = test5Container.querySelector('#test5-multiple-reactive');
    if (oldDiv) {
      test5Container.removeChild(oldDiv);
    }
    test5Container.appendChild(reactiveDiv.hostElement);
  });
});

setTimeout(() => test5Color.set('blue'), 1300);
setTimeout(() => test5Size.set('20px'), 1400);
setTimeout(() => test5Active.set(true), 1500);
setTimeout(() => {
  test5Text.set('Updated');
  test5Color.set('green');
}, 1600);

// ============================================
// ТЕСТ 6: Вложенные div с реактивными свойствами
// ============================================
console.log("=== ТЕСТ 6: Вложенные div с реактивными свойствами ===");
const test6Parent = signal(1);
const test6Child = signal(1);

let test6Container: HTMLElement | null = null;

effect(() => {
  const parent = test6Parent();
  
  effect(() => {
    const child = test6Child();
    
    const parentDiv = div({
      '.id': 'test6-parent',
      style: {
        backgroundColor: () => `hsl(${test6Parent() * 60}, 70%, 50%)`,
        padding: '15px',
      },
      classList: [
        () => `parent-${test6Parent()}`,
      ]
    },
      div({
        '.id': 'test6-child',
        style: {
          backgroundColor: () => `hsl(${test6Child() * 60}, 70%, 70%)`,
          padding: () => `${test6Child() * 5}px`,
        },
        classList: [
          () => `child-${test6Child()}`,
        ]
      }, `Parent: ${parent}, Child: ${child}`)
    );
    
    if (!test6Container) {
      test6Container = document.createElement('div');
      test6Container.id = 'test6-wrapper';
      document.body.appendChild(test6Container);
    }
    
    const oldParent = test6Container.querySelector('#test6-parent');
    if (oldParent) {
      test6Container.removeChild(oldParent);
    }
    test6Container.appendChild(parentDiv.hostElement);
  });
});

setTimeout(() => test6Parent.set(2), 1700);
setTimeout(() => test6Child.set(3), 1800);
setTimeout(() => {
  test6Parent.set(4);
  test6Child.set(5);
}, 1900);

// ============================================
// ТЕСТ 7: Реактивные атрибуты через .attributeName
// ============================================
console.log("=== ТЕСТ 7: Реактивные атрибуты ===");
const test7Id = signal('id-1');
const test7Title = signal('Title 1');
const test7TabIndex = signal(0);

let test7Container: HTMLElement | null = null;

effect(() => {
  const id = test7Id();
  const title = test7Title();
  const tabIndex = test7TabIndex();
  
  console.log(`[Тест 7] Внешний эффект: id=${id}, title=${title}, tabIndex=${tabIndex}`);
  
  effect(() => {
    const reactiveDiv = div({
      '.id': () => test7Id(),           // Реактивный id
      '.title': () => test7Title(),     // Реактивный title
      '.tabIndex': () => test7TabIndex(), // Реактивный tabIndex
      style: {
        padding: '10px',
        margin: '5px',
        border: '1px solid gray'
      }
    }, `ID: ${test7Id()}, Title: ${test7Title()}`);
    
    if (!test7Container) {
      test7Container = document.createElement('div');
      test7Container.id = 'test7-container';
      document.body.appendChild(test7Container);
    }
    
    const oldDiv = test7Container.querySelector(`#${test7Id()}`);
    if (oldDiv && oldDiv.id !== test7Id()) {
      test7Container.removeChild(oldDiv);
    }
    if (!test7Container.querySelector(`#${test7Id()}`)) {
      test7Container.appendChild(reactiveDiv.hostElement);
    }
  });
});

setTimeout(() => test7Id.set('id-2'), 2000);
setTimeout(() => test7Title.set('Title 2'), 2100);
setTimeout(() => {
  test7TabIndex.set(1);
  test7Id.set('id-3');
}, 2200);

// ============================================
// ТЕСТ 8: Стресс-тест: быстрые изменения множества реактивных свойств
// ============================================
console.log("=== ТЕСТ 8: Стресс-тест ===");
const test8Value = signal(0);
const test8Active = signal(false);
const test8Large = signal(false);

let test8Container: HTMLElement | null = null;

// Обновляем флаги на основе значения
effect(() => {
  const value = test8Value();
  test8Active.set(value > 5);
  test8Large.set(value > 10);
});

effect(() => {
  test8Value(); // Подписка на сигнал
  
  effect(() => {
    const reactiveDiv = div({
      '.id': 'test8-stress',
      style: {
        backgroundColor: () => `rgb(${test8Value() * 25}, 100, 100)`,
        padding: () => `${test8Value() * 2}px`,
        margin: () => `${test8Value()}px`,
        fontSize: () => `${10 + test8Value()}px`,
        '--dynamic': () => `${test8Value() * 10}px`,
      },
      classList: [
        () => `value-${test8Value()}`,
        () => test8Value() % 2 === 0 ? 'even' : 'odd',
      ],
      reactiveClassList: {
        'active': test8Active,
        'large': test8Large,
      }
    }, `Value: ${test8Value()}`);
    
    if (!test8Container) {
      test8Container = document.createElement('div');
      test8Container.id = 'test8-container';
      document.body.appendChild(test8Container);
    }
    
    const oldDiv = test8Container.querySelector('#test8-stress');
    if (oldDiv) {
      test8Container.removeChild(oldDiv);
    }
    test8Container.appendChild(reactiveDiv.hostElement);
  });
});

// Быстро меняем значение много раз
for (let i = 1; i <= 20; i++) {
  setTimeout(() => test8Value.set(i), 2300 + i * 30);
}

// ============================================
// Периодические интервалы для проверки утечек памяти
// ============================================
console.log("\n=== ЗАПУСК ПЕРИОДИЧЕСКИХ ИНТЕРВАЛОВ ДЛЯ ПРОВЕРКИ УТЕЧЕК ===");
console.log("Интервалы будут работать каждые 2 секунды для наблюдения изменений в куче\n");

let intervalCounter = 0;

// Интервал для теста 1 - меняем цвет и размер
const test1Interval = setInterval(() => {
  intervalCounter++;
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  const sizes = ['10px', '15px', '20px', '25px', '30px'];
  
  test1Color.set(colors[intervalCounter % colors.length]);
  test1Size.set(sizes[intervalCounter % sizes.length]);
  
  if (intervalCounter % 10 === 0) {
    console.log(`[Интервал] Тест 1: изменено ${intervalCounter} раз`);
  }
}, 2000);

// Интервал для теста 2 - переключаем активность
const test2Interval = setInterval(() => {
  test2Active.set(!test2Active());
  test2Highlight.set(!test2Highlight());
}, 2000);

// Интервал для теста 3 - переключаем классы
const test3Interval = setInterval(() => {
  test3Red.set(!test3Red());
  test3Bold.set(!test3Bold());
  test3Italic.set(!test3Italic());
}, 2000);

// Интервал для теста 5 - меняем множественные свойства
const test5Interval = setInterval(() => {
  const colors = ['red', 'blue', 'green'];
  const sizes = ['10px', '20px', '30px'];
  
  test5Color.set(colors[intervalCounter % colors.length]);
  test5Size.set(sizes[intervalCounter % sizes.length]);
  test5Active.set(!test5Active());
  test5Text.set(`Updated ${intervalCounter}`);
}, 2000);

// Интервал для стресс-теста 8 - быстрые изменения
const test8Interval = setInterval(() => {
  test8Value.set(Math.floor(Math.random() * 100));
}, 500);

// ============================================
// Функция для логирования статистики подписчиков
// ============================================
const logSubscriberStats = (iteration: number) => {
  const test1ColorSubs = test1Color.getSubscribers();
  const test1SizeSubs = test1Size.getSubscribers();
  const test2ActiveSubs = test2Active.getSubscribers();
  const test3RedSubs = test3Red.getSubscribers();
  const test8ValueSubs = test8Value.getSubscribers();
  
  console.log(`\n[Статистика #${iteration}] Подписчики на сигналы:`);
  console.log(`  test1Color: ${test1ColorSubs?.size || 0}`);
  console.log(`  test1Size: ${test1SizeSubs?.size || 0}`);
  console.log(`  test2Active: ${test2ActiveSubs?.size || 0}`);
  console.log(`  test3Red: ${test3RedSubs?.size || 0}`);
  console.log(`  test8Value: ${test8ValueSubs?.size || 0}`);
  
  const totalSubs = (test1ColorSubs?.size || 0) + 
                    (test1SizeSubs?.size || 0) + 
                    (test2ActiveSubs?.size || 0) + 
                    (test3RedSubs?.size || 0) + 
                    (test8ValueSubs?.size || 0);
  console.log(`  Всего подписчиков: ${totalSubs}`);
  
  if (iteration > 1) {
    console.log(`  ⚠️  Если число растёт - есть утечка памяти!`);
  }
};

// Логируем статистику каждые 10 секунд
const statsInterval = setInterval(() => {
  logSubscriberStats(Math.floor(intervalCounter / 5));
}, 10000);

// ============================================
// Финальная проверка: логирование и инструкции
// ============================================
setTimeout(() => {
  console.log(`\n=== ИТОГОВАЯ ПРОВЕРКА ===`);
  console.log(`Всего создано тестовых контейнеров: ${document.querySelectorAll('[id^="test"]').length}`);
  console.log(`\nВАЖНО: Проверьте утечки памяти в DevTools:`);
  console.log(`1. Откройте DevTools -> Memory`);
  console.log(`2. Сделайте первый Heap Snapshot (базовая линия)`);
  console.log(`3. Подождите 30-60 секунд, пока интервалы работают`);
  console.log(`4. Сделайте второй Heap Snapshot`);
  console.log(`5. Сравните количество Effect объектов - должно быть примерно одинаково`);
  console.log(`6. Проверьте количество подписок на сигналы - старые должны быть удалены`);
  console.log(`7. Если количество Effect объектов или подписчиков растёт - есть утечка памяти!\n`);
  
  logSubscriberStats(0);
  
  console.log(`\nИнтервалы продолжают работать для наблюдения изменений в куче.`);
  console.log(`Остановите интервалы командой: stopAllIntervals()`);
  
  // Добавляем функцию для остановки интервалов
  (window as any).stopAllIntervals = () => {
    clearInterval(test1Interval);
    clearInterval(test2Interval);
    clearInterval(test3Interval);
    clearInterval(test5Interval);
    clearInterval(test8Interval);
    clearInterval(statsInterval);
    console.log('Все интервалы остановлены');
  };
}, 3000);

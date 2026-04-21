# Документация библиотеки Reactive Web Components (RWC)

---

## Оглавление

1. [Введение](#введение)
2. [Основные концепции](#основные-концепции)
   - [Сигналы](#сигналы)
   - [Эффекты](#эффекты)
   - [Очистка эффектов (onCleanup)](#очистка-эффектов-oncleanup)
   - [Иерархия эффектов и componentEffect](#иерархия-эффектов-и-componenteffect)
   - [Реактивные строки (rs)](#реактивные-строки-rs)
   - [createSignal](#createsignal)
   - [Утилиты для работы с сигналами](#утилиты-для-работы-с-сигналами)
3. [Компоненты](#компоненты)
   - [Создание компонента](#создание-компонента)
   - [Жизненный цикл](#жизненный-цикл)
   - [События](#события)
   - [Контекст (providers/injects)](#контекст-providersinjects)
   - [Классовые компоненты и декораторы](#классовые-компоненты-и-декораторы)
   - [Функциональные компоненты](#функциональные-компоненты)
4. [Элементы и шаблоны](#элементы-и-шаблоны)
   - [Фабрика HTML-элементов](#фабрика-html-элементов)
   - [Конфигурирование элементов: ComponentInitConfig](#конфигурирование-элементов-componentinitconfig)
   - [Кастомные компоненты: useCustomComponent](#кастомные-компоненты-usecustomcomponent)
   - [Шаблоны слотов (Slot Templates)](#шаблоны-слотов-slot-templates)
   - [Функция как дочерний контент](#функция-как-дочерний-контент)
   - [Эффективный рендеринг списков с getList](#эффективный-рендеринг-списков-с-getlist)
   - [Условный рендеринг с помощью when](#условный-рендеринг-с-помощью-when)
   - [Условное отображение с помощью show](#условное-отображение-с-помощью-show)
   - [Вставка HTML (unsafeHtml)](#вставка-html-unsafehtml)
   - [Drag-and-drop список (ddList)](#drag-and-drop-список-ddlist)
   - [signalComponent](#signalcomponent)
5. [Примеры](#примеры)
6. [Рекомендации и best practices](#рекомендации-и-best-practices)

---

## Введение

RWC — библиотека для создания реактивных веб-компонентов с декларативным синтаксисом и строгой типизацией. Она позволяет строить сложные UI с минимальным количеством кода и автоматическим управлением реактивностью.

Ключевые особенности:
- **Сигналы** — реактивные значения с автоматическим отслеживанием зависимостей
- **Эффекты** — функции с автоматической подпиской на используемые сигналы
- **Иерархия эффектов** — каскадная очистка через parent/children связи
- **Web Components** — нативные кастомные элементы с Shadow DOM
- **TypeScript** — полная типизация всех API

---

## Основные концепции

### Сигналы

Сигнал — реактивная обёртка над значением. При вызове сигнала внутри эффекта происходит автоматическая подписка: эффект будет повторно выполнен при изменении значения сигнала.

**Тип:**
```typescript
interface ReactiveSignal<T> {
  (): T;                              // Получить значение (и подписаться, если внутри эффекта)
  initValue: Readonly<T>;             // Начальное неизменяемое значение
  set(value: T): void;                // Установить значение (с проверкой shouldUpdate)
  forceSet(value: T): void;           // Принудительно обновить все подписчики
  update(cb: (v: Readonly<T>) => T): void;  // Обновить через функцию
  peek(): Readonly<T>;                // Получить значение без подписки
  setShouldUpdateFn(fn: (oldValue: T, newValue: T) => boolean): ReactiveSignal<T>;  // Функция сравнения
  setName(name: string): ReactiveSignal<T>;  // Имя для отладки
  getSubscribers(): Set<() => void> | undefined;  // Множество подписчиков
  pipe<R>(fn: (value: T) => R, config?: { name?: string }): ReactiveSignal<UnwrapSignal<R>>;  // Производный сигнал
}
```

**Основные операции:**
```typescript
import { signal } from '@shared/utils';

const count = signal(0);

// Чтение значения
count();          // 0

// Установка значения
count.set(1);     // Обновит подписчиков, если значение изменилось

// Обновление через функцию
count.update(v => v + 1);  // Удобно для инкремента и т.п.

// Чтение без подписки (внутри эффекта не создаст зависимость)
count.peek();     // Вернёт Object.freeze(currentValue)

// Начальное значение (всегда доступно, не меняется)
count.initValue;  // 0
```

**Пользовательская функция сравнения:**
```typescript
// По умолчанию сигнал обновляет подписчиков при любом изменении (oldValue !== newValue).
// Можно задать свою функцию:
const temperature = signal(20.0);
temperature.setShouldUpdateFn((oldV, newV) => Math.abs(newV - oldV) >= 1);
// Теперь обновление произойдёт только при изменении >= 1 градус
```

**pipe — производный сигнал:**
```typescript
const count = signal(5);
const doubled = count.pipe(v => v * 2);
// doubled() === 10
// При изменении count, doubled автоматически обновится

// pipe поддерживает Promise и вложенные сигналы:
const userId = signal(1);
const userData = userId.pipe(id => fetch(`/api/users/${id}`).then(r => r.json()));
```

**forceSet — принудительное обновление:**

`forceSet` использует паттерн "destroy-then-recreate":
1. Устанавливает новое значение
2. Уничтожает (`destroy()`) все текущие эффекты-подписчики
3. Через `queueMicrotask` заново создаёт эти эффекты

Это гарантирует чистую переподписку и корректное обновление иерархии эффектов.

```typescript
const items = signal([1, 2, 3]);
// set() тоже использует forceSet внутри (при прохождении проверки shouldUpdate)
items.set([1, 2, 3, 4]);

// forceSet — напрямую, даже если значение "то же самое"
items.forceSet(items.peek());
```

**Edge cases:**
```typescript
// Массивы — используйте новую ссылку:
const arr = signal([1, 2, 3]);
arr.update(a => [...a, 4]);  // Создаёт новый массив → сработает обновление

// Объекты — аналогично:
const obj = signal({ name: 'John' });
obj.update(o => ({ ...o, age: 30 }));
```

---

### Эффекты

Эффект — функция, которая автоматически подписывается на все сигналы, вызванные внутри неё. При изменении любого из этих сигналов эффект выполняется заново.

**Базовое использование:**
```typescript
import { effect, signal } from '@shared/utils';

const count = signal(0);

effect(() => {
  console.log('Count:', count());
});
// Выведет: "Count: 0"

count.set(1);
// Выведет: "Count: 1"
```

**Возвращаемое значение:**

`effect()` возвращает `EffectCb` — объект-функцию с метаданными:

```typescript
type EffectCb = (() => void) & {
  fake?: boolean;                    // true для wrapperEffect компонентов
  effectId?: string;                 // Идентификатор для отладки
  children?: Set<EffectCb>;          // Дочерние эффекты
  parent?: WeakRef<EffectCb>;        // Ссылка на родительский эффект
  cleanupSet?: Set<() => void>;      // Функции очистки
  component?: WeakRef<HTMLElement>;  // Связанный компонент
  status: "active" | "inactive";     // Статус эффекта
  destroy?: () => void;              // Уничтожить эффект и все дочерние
};
```

**Уничтожение эффекта:**
```typescript
const eff = effect(() => {
  console.log('Value:', someSignal());
});

// Позже, когда эффект больше не нужен:
eff.destroy?.();
// Это:
// 1. Каскадно уничтожит все дочерние эффекты
// 2. Вызовет все функции из cleanupSet
// 3. Удалит эффект из подписчиков родителя
// 4. Установит status = "inactive"
```

**Вложенные эффекты:**

Эффекты, созданные внутри другого эффекта, автоматически становятся его дочерними:

```typescript
const outerEff = effect(() => {
  console.log('outer');

  effect(() => {
    console.log('inner');  // Этот эффект — дочерний для outerEff
  });
});

outerEff.destroy?.();
// Уничтожит и outer, и inner эффекты
```

---

### Очистка эффектов (onCleanup)

`onCleanup` позволяет зарегистрировать функцию очистки внутри эффекта. Она будет вызвана при уничтожении эффекта (через `destroy()` или `removeEffect()`).

```typescript
import { effect, onCleanup, signal } from '@shared/utils';

const url = signal('/api/data');

effect(() => {
  const controller = new AbortController();

  fetch(url(), { signal: controller.signal })
    .then(r => r.json())
    .then(data => console.log(data));

  // Зарегистрировать очистку — будет вызвана при перезапуске или уничтожении эффекта
  onCleanup(() => {
    controller.abort();
  });
});
```

**Как это работает:**
- `onCleanup` добавляет функцию в `cleanupSet` текущего эффекта на стеке (`cbStack`)
- При вызове `removeEffect(effectCb)` все функции из `cleanupSet` выполняются
- Это происходит после каскадного уничтожения дочерних эффектов

---

### Иерархия эффектов и componentEffect

RWC реализует иерархическую систему эффектов, привязанную к жизненному циклу веб-компонентов. Это предотвращает утечки памяти — при удалении компонента из DOM все его эффекты автоматически уничтожаются.

#### Как работает иерархия

1. **wrapperEffect** — корневой эффект веб-компонента. Создаётся в `connectedCallback` с флагом `fake: true`. Сигналы не подписываются на fake-эффекты, но он служит корнем дерева эффектов.

2. **Автоматическое родительство**: Когда эффект создаётся внутри другого эффекта, он автоматически становится дочерним (через `parent: WeakRef<EffectCb>`).

3. **componentEffect(cb)** — метод `BaseElement`, который привязывает эффект к `wrapperEffect` компонента:
```typescript
// Внутри BaseElement:
componentEffect(cb: () => void) {
  if (!this.wrapperEffect) return;
  (cb as EffectCb).parent = new WeakRef(this.wrapperEffect);
  effect(cb);
}
```

4. **Поиск по DOM-дереву**: Обычные HTML-элементы (не веб-компоненты) ищут ближайший веб-компонент с методом `componentEffect` вверх по DOM-дереву, включая пересечение границ ShadowRoot:

```typescript
// Внутри HtmlComponentConfig:
private findComponentEffect(): ((cb: () => void) => void) | undefined {
  let curr: HTMLElement | null | undefined = this.hostElement;
  while (curr && curr !== document.body) {
    if ('componentEffect' in curr && typeof curr.componentEffect === 'function') {
      return curr.componentEffect.bind(curr);
    }
    // Пересечение границы ShadowRoot
    if (!curr.parentElement && curr.getRootNode() instanceof ShadowRoot) {
      curr = (curr.getRootNode() as ShadowRoot).host as HTMLElement;
    } else {
      curr = curr.parentElement;
    }
  }
}
```

5. **Каскадная очистка**: При `disconnectedCallback` вызывается `this.wrapperEffect.destroy()`, что каскадно уничтожает все дочерние эффекты компонента.

#### Схема работы

```
@component('my-app')
└── wrapperEffect (fake=true)         ← создаётся в connectedCallback
    ├── effect из render()             ← автоматическое родительство
    │   ├── effect из div().addEffect()  ← через findComponentEffect
    │   └── effect из setReactiveAttribute()
    └── effect из init()

// При disconnectedCallback:
// wrapperEffect.destroy() → каскадно уничтожает ВСЕ дочерние эффекты
```

#### Практическое значение

Разработчику не нужно вручную управлять очисткой эффектов. Достаточно:
- Использовать стандартные методы (`addEffect`, `setReactiveAttribute`, `addReactiveClass` и т.д.)
- Эффекты внутри `render()` автоматически привязываются к компоненту
- При удалении компонента из DOM всё очищается автоматически

---

### Реактивные строки (rs)

`rs` — шаблонная строка с реактивными значениями. Возвращает `ReactiveSignal<string>`, который автоматически обновляется при изменении любого из встроенных сигналов.

```typescript
import { rs, signal } from '@shared/utils';

const name = signal('John');
const greeting = rs`Hello, ${name}!`;

greeting();  // "Hello, John!"

name.set('Jane');
greeting();  // "Hello, Jane!"
```

**Можно использовать несколько сигналов:**
```typescript
const firstName = signal('John');
const lastName = signal('Doe');
const fullName = rs`${firstName} ${lastName}`;
// "John Doe" → автоматически обновляется при изменении любого из сигналов
```

**Можно смешивать сигналы и обычные значения:**
```typescript
const count = signal(5);
const label = rs`Всего элементов: ${count} из 100`;
```

---

### createSignal

`createSignal` создаёт сигнал, значение которого вычисляется на основе функции или Promise. Отличие от `signal` — поддержка вычисляемых и асинхронных значений с автоматическим обновлением при изменении зависимостей.

**Вычисляемое значение (аналог computed):**
```typescript
import { createSignal, signal } from '@shared/utils';

const user = signal({ name: 'John', age: 30 });
const userName = createSignal(() => user().name);
// userName() === 'John'

user.set({ name: 'Jane', age: 31 });
// userName() автоматически обновится до 'Jane'
```

**Вычисление на основе другого сигнала:**
```typescript
const count = signal(0);
const doubled = createSignal(() => count() * 2);
count.set(5);
// doubled() === 10
```

**Работа с асинхронными данными:**
```typescript
const userId = signal(1);
const userData = createSignal(
  () => fetch(`/api/users/${userId()}`).then(r => r.json()),
  { name: '', loading: true }  // Начальное значение (пока загружается)
);
```

**Promise напрямую:**
```typescript
const config = createSignal(
  fetch('/api/config').then(r => r.json()),
  null  // Начальное значение
);
```

**Best practice:**
- Используйте `createSignal(() => ...)` вместо комбинации `effect` + `signal` для вычисляемых значений
- Для асинхронных данных всегда указывайте начальное значение
- Функция внутри `createSignal` должна быть чистой (без побочных эффектов)

---

### Утилиты для работы с сигналами

#### bindReactiveSignals

Двустороннее связывание двух сигналов. Изменение одного автоматически обновляет другой.

```typescript
import { bindReactiveSignals, signal } from '@shared/utils';

const signalA = signal('Hello');
const signalB = signal('World');

bindReactiveSignals(signalA, signalB);

signalA.set('Привет');  // signalB станет 'Привет'
signalB.set('Мир');     // signalA станет 'Мир'
```

**Реализация:** Использует `effect` с отслеживанием предыдущих значений для предотвращения циклических обновлений.

#### combineLatest

Объединяет несколько сигналов в один. Обновляется **при изменении любого** из исходных сигналов.

```typescript
import { combineLatest, signal } from '@shared/utils';

const name = signal('John');
const age = signal(25);

const userData = combineLatest(name, age);
// userData() === ['John', 25]

name.set('Jane');
// userData() немедленно обновится до ['Jane', 25]
```

#### forkJoin

Объединяет несколько сигналов в один. Обновляется **только когда все** сигналы получат новые значения.

```typescript
import { forkJoin, signal } from '@shared/utils';

const name = signal('John');
const age = signal(25);

const userData = forkJoin(name, age);
// userData() === ['John', 25]

name.set('Jane');   // userData НЕ обновится (age ещё не обновился)
age.set(30);        // userData обновится до ['Jane', 30]
```

**Различия `combineLatest` vs `forkJoin`:**
| | combineLatest | forkJoin |
|---|---|---|
| Обновление | При изменении любого сигнала | Когда все сигналы обновились |
| Применение | Реактивные вычисления, UI | Синхронизация, ожидание всех данных |

#### firstUpdate

Выполняет callback один раз при первом обновлении сигнала. Эффект автоматически уничтожается после первого вызова.

```typescript
import { firstUpdate, signal } from '@shared/utils';

const userSignal = signal(null);

firstUpdate(userSignal, (user) => {
  console.log('Пользователь загружен:', user);
  // Вызовется только один раз
});

userSignal.set({ name: 'John' });  // Callback выполнится
userSignal.set({ name: 'Jane' });  // Callback НЕ выполнится
```

---

## Компоненты

### Создание компонента

Компоненты создаются на основе классов с декораторами. Все props и состояния — сигналы.

```typescript
import { component, property, event } from '@shared/utils/html-decorators';
import { BaseElement } from '@shared/utils/html-elements';
import { useCustomComponent } from '@shared/utils/html-fabric/custom-fabric';
import { div } from '@shared/utils/html-fabric/fabric';
import { signal, rs, newEventEmitter } from '@shared/utils';

@component('my-counter')
class MyCounter extends BaseElement {
  @property()
  count = signal(0);

  @event()
  onCountChange = newEventEmitter<number>();

  render() {
    return div(
      { listeners: { click: () => {
        this.count.update(v => v + 1);
        this.onCountChange(this.count());
      }}},
      rs`Счётчик: ${this.count}`
    );
  }
}
export const MyCounterComp = useCustomComponent(MyCounter);
```

**Основные элементы:**
- **@component(selector)** — регистрирует кастомный элемент
- **@property()** — поле-сигнал, синхронизируется с HTML-атрибутом (camelCase → kebab-case)
- **@event(config?)** — поле-событие (EventEmitter)
- **render()** — возвращает шаблон компонента
- **useCustomComponent** — создаёт фабрику для использования компонента

---

### Жизненный цикл

#### connectedCallback

При добавлении компонента в DOM:

1. Создаётся `wrapperEffect` (корневой эффект с `fake: true`)
2. `this.wrapperEffect` назначается **до** вызова `effect()` — это гарантирует, что `componentEffect` работает внутри `render()`
3. Вызывается `this.init?.()` (опциональная инициализация)
4. Регистрируются providers
5. Выполняется `checkInjects()` для подключения inject-зависимостей
6. Настраиваются event-эмиттеры (`@event`)
7. Применяются стили
8. Вызывается `render()` и результат добавляется в Shadow DOM
9. Обрабатывается slot-контент

#### disconnectedCallback

При удалении компонента из DOM:

1. Очищается slot-контент
2. **`this.wrapperEffect.destroy()`** — каскадно уничтожает все дочерние эффекты
3. `this.wrapperEffect = null`
4. Очищается Shadow DOM (`this.shadow.replaceChildren()`)
5. Очищается Light DOM (`this.replaceChildren()`)

#### attributeChangedCallback

При изменении наблюдаемого атрибута:

1. Имя атрибута конвертируется из kebab-case в camelCase
2. Если соответствующее свойство — сигнал, вызывается `signal.set(newValue)`
3. Если `newValue === null`, сигнал сбрасывается к `initValue`

#### Пример с хуками жизненного цикла

```typescript
@component('lifecycle-demo')
class LifecycleDemo extends BaseElement {
  init() {
    console.log('Инициализация (вызывается в connectedCallback)');
  }

  connectedCallback() {
    // Вызывается автоматически декоратором @component
    console.log('Подключён к DOM');
  }

  disconnectedCallback() {
    // Вызывается автоматически декоратором @component
    console.log('Отключён от DOM');
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    console.log(`Атрибут ${name}: ${oldValue} → ${newValue}`);
  }

  render() {
    return div('Lifecycle Demo');
  }
}
```

---

### События

EventEmitter позволяет эмитить кастомные DOM-события из компонента.

**Тип:**
```typescript
interface EventEmitter<EventValue> {
  (_value: EventValue | ReactiveSignal<EventValue>): void;
  oldValue: null;
}
```

**Создание:**
```typescript
import { newEventEmitter } from '@shared/utils';

@event()
onItemSelect = newEventEmitter<number>();
```

**Эмит значения:**
```typescript
// Разовый эмит
this.onItemSelect(42);

// Реактивный эмит — событие будет эмитироваться при каждом изменении сигнала
this.onItemSelect(someSignal);
```

**Конфигурация события:**
```typescript
@event({ bubbles: true, composed: true })
onGlobalEvent = newEventEmitter<string>();
```

**Подписка на событие:**
```typescript
MyComponentComp({
  '@onItemSelect': (e, self, host) => {
    console.log('Выбран элемент:', e.detail);
  }
})
```

---

### Контекст (providers/injects)

Контекст позволяет передавать данные вглубь дерева компонентов без явного пробрасывания через props.

**Провайдер:**
```typescript
const ThemeContext = 'theme';

@component('theme-provider')
class ThemeProvider extends BaseElement {
  providers = { [ThemeContext]: signal('dark') };

  render() {
    return div(slot());
  }
}
export const ThemeProviderComp = useCustomComponent(ThemeProvider);
```

**Потребитель:**
```typescript
@component('theme-consumer')
class ThemeConsumer extends BaseElement {
  // inject вызывается ВНЕ render() — один раз при создании экземпляра
  theme = this.inject<string>(ThemeContext);

  render() {
    return div(rs`Тема: ${this.theme}`);
  }
}
export const ThemeConsumerComp = useCustomComponent(ThemeConsumer);
```

**Использование:**
```typescript
ThemeProviderComp(
  ThemeConsumerComp()
)
```

**Как это работает:**
1. Провайдер слушает события с именем контекста (`ThemeContext`)
2. Потребитель в `checkInjects()` отправляет `CustomEvent` с `bubbles: true, composed: true`
3. Провайдер перехватывает событие и передаёт сигнал через callback
4. Создаётся эффект, который синхронизирует значение provider-сигнала с inject-сигналом

---

### Классовые компоненты и декораторы

#### @component(selector, isClosed?)

Регистрирует класс как Custom Element.

```typescript
@component('my-element')        // Открытый Shadow DOM (по умолчанию)
@component('my-element', true)  // Закрытый Shadow DOM
```

#### @property()

Помечает поле класса как реактивное свойство. Поле должно быть сигналом.

```typescript
@property()
title = signal<string>('');

@property()
count = signal<number>(0);
```

Атрибут в HTML будет в kebab-case: `<my-element my-prop="value">`.

#### @event(config?)

Помечает поле как событие.

```typescript
@event()
onChange = newEventEmitter<string>();

@event({ bubbles: true, composed: true })
onSubmit = newEventEmitter<FormData>();
```

#### static styles

Статические стили компонента (применяются через `adoptedStyleSheets`):

```typescript
@component('styled-component')
class StyledComponent extends BaseElement {
  static styles = `
    :host { display: block; }
    .container { padding: 16px; }
  `;

  // Или массив стилей:
  static styles = [baseStyles, componentStyles];

  render() {
    return div({ classList: ['container'] }, 'Styled!');
  }
}
```

**Примечание:** `@property` CSS (`@property --my-var { ... }`) автоматически извлекается и регистрируется в `document.adoptedStyleSheets`.

---

### Функциональные компоненты

`createComponent` — альтернативный способ создания компонентов без классов.

```typescript
import { createComponent } from '@shared/utils/html-fabric/fn-component';
import { div, button } from '@shared/utils/html-fabric/fabric';
import { signal } from '@shared/utils';

interface ButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button = createComponent<ButtonProps>((props) => {
  return button({
    attributes: { disabled: props.disabled },
    listeners: { click: props.onClick }
  }, props.text);
});

// Использование
const myButton = Button({
  text: 'Нажми',
  onClick: () => console.log('click'),
});
```

**Особенности:**
- Автоматическая поддержка `classList` и `reactiveClassList` через props
- Подходит для простых stateless-компонентов
- Не создаёт Custom Element (нет Shadow DOM)

---

## Элементы и шаблоны

### Фабрика HTML-элементов

Для создания элементов используются фабричные функции, экспортируемые из `@shared/utils/html-fabric/fabric`:

```typescript
import { div, span, button, input, ul, li, h1, a, img, slot, /* ... */ } from '@shared/utils/html-fabric/fabric';
```

**Все стандартные HTML-теги доступны:** `div`, `span`, `section`, `input`, `button`, `table`, `tr`, `td`, `th`, `ul`, `li`, `ol`, `form`, `label`, `select`, `option`, `textarea`, `img`, `a`, `p`, `h1`-`h6`, `br`, `hr`, `pre`, `code`, `nav`, `header`, `footer`, `main`, `aside`, `article`, `figure`, `figcaption`, `blockquote`, `cite`, `small`, `strong`, `em`, `b`, `i`, `u`, `s`, `sub`, `sup`, `mark`, `del`, `ins`, `details`, `summary`, `progress`, `meter`, `audio`, `video`, `canvas`, `slot`.

**Синтаксис:**
```typescript
// Только контент
div('Текст')

// Конфиг + контент
div({ classList: ['container'] }, 'Текст')

// Вложенные элементы
div(
  h1('Заголовок'),
  p('Параграф'),
  button({ listeners: { click: () => console.log('click') }}, 'Кнопка')
)

// Тег с классом через пробел (краткий синтаксис в createEl)
// Доступно внутренне, фабрики уже используют createEl
```

---

### Конфигурирование элементов: ComponentInitConfig

Объект конфигурации для задания свойств, атрибутов, классов, событий и эффектов.

#### Стандартная нотация

```typescript
div({
  classList: ['container', () => isActive() ? 'active' : ''],
  style: {
    color: 'white',
    backgroundColor: () => primaryColor(),  // Реактивный стиль
    '--gap': '8px',                          // CSS Custom Property
  },
  attributes: { id: 'main', tabIndex: 0 },
  customAttributes: { 'data-testid': 'container' },
  reactiveClassList: {
    'visible': isVisibleSignal,
    'highlighted': isHighlightedSignal,
  },
  listeners: {
    click: (e, self, host) => console.log('click', e),
  },
  customListeners: {
    'route-change': (e, self, host) => console.log(e.detail),
  },
  effects: [
    (self, host) => console.log('element created', host),
  ],
  ref: elementRef,  // ReactiveSignal<ComponentConfig | null>
  children: [span('child')],
}, 'Основной контент')
```

#### Краткая нотация

```typescript
div({
  '.id': 'main',                              // Атрибут
  '.tabIndex': 0,                              // Атрибут
  '@click': (e) => console.log('click', e),    // Событие
  '$myEffect': (self, host) => console.log('effect'),  // Эффект
}, 'Контент')
```

#### ref — получение ссылки на компонент

```typescript
const buttonRef = signal<ComponentConfig<HTMLButtonElement> | null>(null);

button({ ref: buttonRef }, 'Нажми');

effect(() => {
  const btn = buttonRef();
  if (btn) {
    btn.addClass('ready');
  }
});
```

#### classList — шаблонная строка для классов

```typescript
import { classList } from '@shared/utils';

const isActive = signal(false);

div(
  classList`my-class ${() => isActive() ? 'active' : ''}`,
  'Контент'
)

// Или с сигналом напрямую:
const dynamicClass = signal('theme-dark');
div(
  classList`base-class ${dynamicClass}`,
  'Контент'
)
```

`cls` — алиас для `classList`.

---

### Кастомные компоненты: useCustomComponent

#### Способ 1: С декоратором @component

```typescript
@component('my-component')
class MyComponent extends BaseElement {
  render() {
    return div('Hello!');
  }
}
export const MyComponentComp = useCustomComponent(MyComponent);
```

#### Способ 2: Без декоратора (selector передаётся в useCustomComponent)

```typescript
class MyComponent extends BaseElement {
  render() {
    return div('Hello!');
  }
}
export const MyComponentComp = useCustomComponent(MyComponent, 'my-component');
```

Во втором случае `@component` вызывается внутри `useCustomComponent`.

**Использование:**
```typescript
div(
  MyComponentComp({ '.someProp': 'value' }, 'Вложенный контент')
)
```

---

### Шаблоны слотов (Slot Templates)

`slotTemplate` — механизм передачи кастомных шаблонов внутрь компонента (аналог scoped slots / render props).

**Определение в компоненте:**
```typescript
import { defineSlotTemplate } from '@shared/utils';

@component('item-list')
class ItemList extends BaseElement {
  slotTemplate = defineSlotTemplate<{
    item: (ctx: { id: number; name: string }) => ComponentConfig<any> | null;
    header: (ctx: { count: number }) => ComponentConfig<any> | null;
  }>();

  @property()
  items = signal<{ id: number; name: string }[]>([]);

  render() {
    return div(
      this.slotTemplate.header?.({ count: this.items().length }) || div(),
      getList(this.items, (i) => i.id, (item) =>
        this.slotTemplate.item?.(item) || div(item.name)
      )
    );
  }
}
export const ItemListComp = useCustomComponent(ItemList);
```

**Использование с setSlotTemplate:**
```typescript
ItemListComp({ '.items': items })
  .setSlotTemplate({
    item: (ctx) => div(`${ctx.name} (id: ${ctx.id})`),
    header: (ctx) => h1(rs`Всего: ${ctx.count}`),
  })
```

---

### Функция как дочерний контент

Функции, переданные как дочерний контент, автоматически оборачиваются в реактивный контекст. При изменении зависимых сигналов контент перерендеривается.

```typescript
const items = signal(['Item 1', 'Item 2']);

div(
  ul(
    () => items().map(item => li(item))
  )
)

// При изменении items список перерисуется
items.set(['Item 1', 'Item 2', 'Item 3']);
```

**С контекстом (self):**
```typescript
div(
  (self) => {
    // self — ссылка на ComponentConfig текущего элемента
    return items().map(item => li(item));
  }
)
```

**Условный рендер:**
```typescript
div(
  () => isVisible() ? span('Видимо') : span('Скрыто')
)
```

---

### Эффективный рендеринг списков с getList

`getList` оптимизирует рендеринг списков, обновляя только изменившиеся элементы вместо перерисовки всего списка.

**Сигнатура:**
```typescript
getList<I extends Record<string, any>, K extends keyof I>(
  items: ReactiveSignal<I[]>,
  keyFn: (item: I) => I[K] | string,
  cb: (item: I, index: number, items: I[]) => ComponentConfig<any>
): ComponentConfig<HTMLDivElement>
```

**Пример:**
```typescript
import { getList, signal, div } from '@shared/utils';

const todos = signal([
  { id: 1, text: 'Первый' },
  { id: 2, text: 'Второй' },
]);

div(
  getList(
    todos,
    (item) => item.id,      // Уникальный ключ
    (item, index) => div(`${index + 1}. ${item.text}`)
  )
)
```

**Как работает:**
- Используется `data-key` атрибут для привязки DOM-узлов к данным
- Для каждого ключа создаётся собственный сигнал и эффект
- Изменение элемента определяется сравнением `JSON.stringify`
- Удалённые ключи очищаются (DOM, сигналы, эффекты)
- Порядок DOM-узлов синхронизируется с порядком данных
- Эффекты создаются асинхронно через `Promise.resolve().then()`

**Best practices:**
- Ключи должны быть **уникальными** и **стабильными**
- Избегайте глубоких объектов — `JSON.stringify` может быть затратным
- Используйте иммутабельные обновления для корректного обнаружения изменений
- Для простых статических списков можно использовать обычный `map`

---

### Условный рендеринг с помощью when

`when` — универсальная функция условного рендеринга. Поддерживает статические и реактивные условия.

```typescript
import { when, signal, div, span } from '@shared/utils';

// Статическое условие
when(true, () => span('Показано'), () => span('Скрыто'))

// Реактивное условие (сигнал)
const isVisible = signal(true);
when(isVisible, () => span('Показано'), () => span('Скрыто'))

// Реактивное условие (функция)
const items = signal([1, 2, 3]);
when(
  () => items().length > 0,
  () => ul(() => items().map(item => li(String(item)))),
  () => div('Нет элементов')
)
```

**Как работает:**
- `boolean` → `renderIf` (статический рендер)
- `ReactiveSignal` или `() => boolean` → `rxRenderIf` (реактивный рендер)
- `elseContent` — опциональный

---

### Условное отображение с помощью show

`show` управляет видимостью через CSS `display`, не удаляя элементы из DOM.

```typescript
import { show, signal, span } from '@shared/utils';

const isVisible = signal(true);

show(isVisible, () => span('Контент'))

// С альтернативным шаблоном
show(
  isVisible,
  () => span('Видимый контент'),
  () => span('Альтернативный контент')
)
```

**Различия `when` vs `show`:**

| | when | show |
|---|---|---|
| Механизм | Добавление/удаление из DOM | `display: block/none` |
| Когда использовать | Тяжёлые компоненты, редкое переключение | Частое переключение, сохранение состояния |
| Состояние элемента | Теряется при скрытии | Сохраняется |

---

### Вставка HTML (unsafeHtml)

Рендерит строку как HTML. **Используйте только для доверенного контента!**

```typescript
import { unsafeHtml, signal } from '@shared/utils';

// Статическая строка
div(unsafeHtml('<b>bold</b> and <i>italic</i>'))

// Реактивная строка
const html = signal('<span style="color:red">Красный</span>');
div(unsafeHtml(html))
```

---

### Drag-and-drop список (ddList)

`ddList` — список с поддержкой drag-and-drop перетаскивания элементов.

```typescript
import { ddList, signal } from '@shared/utils';

const items = signal([
  { id: 1, name: 'Первый' },
  { id: 2, name: 'Второй' },
  { id: 3, name: 'Третий' },
]);

ddList(items, (item) => div(item.name))
```

Использует HTML5 Drag API с `throttle` на `dragenter` для оптимизации.

---

### signalComponent

Создаёт компонент, который автоматически заменяет себя в DOM при изменении зависимых сигналов.

```typescript
import { signalComponent, signal } from '@shared/utils';

const count = signal(0);

const counter = signalComponent(() =>
  div(`Счётчик: ${count()}`)
);
// При изменении count, div заменяется новым через replaceWith
```

**Отличие от функции-контента:**
- `signalComponent` использует `replaceWith` для замены DOM-узла
- Функция-контент оборачивается в `div[display:contents]` через `getSignalContent`

---

## Примеры

### Компонент с props, событием и стилями

```typescript
@component('user-card')
class UserCard extends BaseElement {
  static styles = `
    :host { display: block; border: 1px solid #ccc; border-radius: 8px; }
    .name { font-weight: bold; font-size: 1.2em; }
    .email { color: #666; }
  `;

  @property()
  userName = signal('');

  @property()
  email = signal('');

  @event({ bubbles: true })
  onSelect = newEventEmitter<string>();

  render() {
    return div(
      { listeners: { click: () => this.onSelect(this.userName()) }},
      div({ classList: ['name'] }, rs`${this.userName}`),
      div({ classList: ['email'] }, rs`${this.email}`)
    );
  }
}
export const UserCardComp = useCustomComponent(UserCard);
```

### Компонент с контекстом и условным рендерингом

```typescript
const AuthContext = 'auth';

@component('app-root')
class AppRoot extends BaseElement {
  providers = { [AuthContext]: signal({ user: null, isLoggedIn: false }) };

  render() {
    return div(
      slot()
    );
  }
}

@component('protected-page')
class ProtectedPage extends BaseElement {
  auth = this.inject<{ user: any; isLoggedIn: boolean }>(AuthContext);

  render() {
    return div(
      when(
        () => this.auth()?.isLoggedIn,
        () => div('Добро пожаловать!'),
        () => div('Пожалуйста, войдите в систему')
      )
    );
  }
}
```

### Список с drag-and-drop и slotTemplate

```typescript
@component('task-board')
class TaskBoard extends BaseElement {
  slotTemplate = defineSlotTemplate<{
    task: (ctx: { id: number; title: string; done: boolean }) => ComponentConfig<any> | null;
  }>();

  @property()
  tasks = signal<{ id: number; title: string; done: boolean }[]>([]);

  render() {
    return div(
      getList(
        this.tasks,
        (t) => t.id,
        (task) => this.slotTemplate.task?.(task) || div(
          { reactiveClassList: { done: signal(task.done) }},
          task.title
        )
      )
    );
  }
}
export const TaskBoardComp = useCustomComponent(TaskBoard);

// Использование с кастомным шаблоном:
TaskBoardComp({ '.tasks': tasks })
  .setSlotTemplate({
    task: (ctx) => div(
      { classList: [ctx.done ? 'completed' : 'pending'] },
      `${ctx.title} ${ctx.done ? '✓' : '○'}`
    ),
  })
```

### Использование утилит сигналов

```typescript
// Двустороннее связывание input и отображения
const inputValue = signal('');
const displayValue = signal('');
bindReactiveSignals(inputValue, displayValue);

// combineLatest для формы
const firstName = signal('');
const lastName = signal('');
const fullName = combineLatest(firstName, lastName);

effect(() => {
  const [first, last] = fullName();
  console.log(`Полное имя: ${first} ${last}`);
});

// firstUpdate для ленивой инициализации
const config = signal(null);
firstUpdate(config, (cfg) => {
  console.log('Конфигурация загружена:', cfg);
  initializeApp(cfg);
});
```

---

## Рекомендации и best practices

### Сигналы и эффекты

1. **Не мутируйте объекты/массивы в сигналах напрямую** — всегда создавайте новую ссылку:
   ```typescript
   // Плохо:
   const items = signal([1, 2]);
   items().push(3);  // Подписчики НЕ обновятся

   // Хорошо:
   items.update(arr => [...arr, 3]);
   ```

2. **Используйте `createSignal` вместо `effect` + `signal`** для вычисляемых значений:
   ```typescript
   // Плохо:
   const doubled = signal(0);
   effect(() => doubled.set(count() * 2));

   // Хорошо:
   const doubled = createSignal(() => count() * 2);
   ```

3. **Используйте `peek()`** для чтения без подписки, когда подписка не нужна

4. **Используйте `onCleanup`** для ресурсов, требующих очистки (AbortController, таймеры, подписки)

### Компоненты

5. **inject вызывайте вне render()** — один раз при создании экземпляра:
   ```typescript
   // Хорошо:
   class MyComp extends BaseElement {
     theme = this.inject<string>('theme');  // Вне render
     render() { return div(rs`${this.theme}`); }
   }
   ```

6. **Не экспортируйте класс компонента** — экспортируйте фабрику `useCustomComponent`:
   ```typescript
   @component('my-comp')
   class MyComp extends BaseElement { ... }
   export const MyCompComp = useCustomComponent(MyComp);
   ```

7. **Используйте `static styles`** вместо `rootStyle` (deprecated)

### Рендеринг

8. **getList для динамических списков** с уникальными ключами
9. **when для условного рендеринга**, **show для частого переключения**
10. **Функция как контент** для простого реактивного контента
11. **Используйте `unsafeHtml` осторожно** — только для доверенного HTML

# Документация библиотеки Reactive Web Components (RWC)

---

## Оглавление
1. [Введение](#введение)
2. [Основные концепции](#основные-концепции)
   - [Сигналы](#сигналы)
     - [Методы сигналов: set, update, forceSet](#сигналы)
   - [Эффекты](#эффекты)
   - [Реактивные строки (rs)](#реактивные-строки-rs)
   - [createSignal](#createsignal)
   - [Утилиты для работы с сигналами](#утилиты-для-работы-с-сигналами)
   - [Функция как дочерний контент](#функция-как-дочерний-контент-динамические-списки-и-условный-рендер)
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
   - [Функция как дочерний контент (динамические списки и условный рендер)](#функция-как-дочерний-контент-динамические-списки-и-условный-рендер)
   - [Эффективный рендеринг списков с getList](#эффективный-рендеринг-списков-с-getlist)
   - [Условный рендеринг с помощью when](#условный-рендеринг-с-помощью-when)
   - [Условное отображение с помощью show](#условное-отображение-с-помощью-show)
5. [Примеры](#примеры)
6. [Рекомендации и best practices](#рекомендации-и-best-practices)
7. [Заключение](#заключение)

---

## Введение
RWC — современная библиотека для создания реактивных веб-компонентов с декларативным синтаксисом и строгой типизацией. Она позволяет строить сложные UI с минимальным количеством кода и максимальной реактивностью.

## Основные концепции

### Сигналы
Сигнал — это реактивная обёртка над значением. Все состояния, свойства, контексты и инъекции в компонентах реализуются через сигналы.

**Тип:**
```typescript
interface ReactiveSignal<T> {
  (): T;
  oldValue: Readonly<T>;
  initValue: Readonly<T>;
  set(value: T): void;
  forceSet(value: T): void;
  setCompareFn(compare: (oldValue: T, newValue: T) => boolean): ReactiveSignal<T>;
  update(cb: (v: Readonly<T>) => T): void;
  clearSubscribers(): void;
  peek(): Readonly<T>;
  pipe<R>(fn: (value: T) => R): ReactiveSignal<UnwrapSignal<R>>;
}
```

**Примеры:**
```typescript
const count = signal(0);
count();        // получить значение
count.set(1);   // установить значение
count.update(v => v + 1); // обновить через функцию
count.forceSet(1);

// Реактивное использование
const doubled = signal(0);
effect(() => {
  doubled.set(count() * 2);
});

// Дополнительные методы
count.setCompareFn((oldV, newV) => Math.abs(newV - oldV) >= 1); // пользовательское сравнение
count.peek();          // безопасное чтение без подписки
count.clearSubscribers(); // очистка подписчиков эффекта

// pipe — создать производный сигнал
const doubled2 = count.pipe(v => v * 2);
effect(() => console.log('x2:', doubled2()));
```

**Когда использовать forceSet:**
- Если нужно вручную инициировать обновление подписчиков, даже если значение сигнала не изменилось (например, для форс-обновления UI или побочных эффектов).

**Edge case:**
```typescript
const arr = signal([1,2,3]);
arr.update(a => [...a, 4]); // реактивно добавит элемент
```

### Эффекты
Эффект — функция, которая автоматически подписывается на все сигналы, используемые внутри неё. Эффекты используются для побочных действий (логирование, синхронизация, вызов событий и т.д.).

**Пример:**
```typescript
effect(() => {
  console.log('Count:', count());
});
```

**Best practice:**
- Не изменяйте сигналы внутри эффекта, если это не требуется (во избежание бесконечных циклов).

### Реактивные строки (rs)
Позволяет создавать реактивные строки на основе сигналов и других значений.

**Пример:**
```typescript
const name = signal('John');
const greeting = rs`Hello, ${name}!`;
console.log(greeting()); // "Hello, John!"
name.set('Jane');
console.log(greeting()); // "Hello, Jane!"
```

**Edge case:**
```typescript
const a = signal('A');
const b = signal('B');
const combined = rs`${a}-${b}`;
a.set('X'); // combined() === 'X-B'
```

### createSignal
Позволяет создавать сигнал, значение которого вычисляется на основе функции или асинхронного значения. Отличие от signal — поддержка асинхронных источников и автоматическое обновление при изменении зависимостей.

**Типизация:**
```typescript
function createSignal<T extends Promise<any> | (() => any), I = ...>(cb: T, initializeValue?: I): ReactiveSignal<...>
```

**Основные случаи использования:**

1. **Для получения свойства из сигнала:**
```typescript
const user = signal({ name: 'John', age: 30 });
const userName = createSignal(() => user().name);
// userName() вернет 'John'
user.set({ name: 'Jane', age: 31 });
// userName() автоматически обновится и вернет 'Jane'
```

2. **Для вычисления нового значения на основе другого сигнала:**
```typescript
const count = signal(0);
const doubled = createSignal(() => count() * 2);
count.set(5); // doubled() автоматически обновится и вернет 10
```

3. **Для работы с асинхронными данными:**
```typescript
const userId = signal(1);
const userData = createSignal(
  () => fetch(`/api/users/${userId()}`).then(r => r.json()),
  { name: '', loading: true } // начальное значение
);
```

**Примеры из кодовой базы:**
```typescript
// Преобразование числового индекса в человекопонятный номер
div({ classList: ['tab-header'] }, rs`current tab: ${createSignal(() => this.activeTab() + 1)}`);
```

**Best practice:**
- Используйте createSignal для вычисляемых значений вместо комбинации effect+signal
- Для асинхронных данных всегда указывайте начальное значение (fallback)
- Функция, переданная в createSignal, должна быть чистой (без побочных эффектов)

### Утилиты для работы с сигналами

RWC предоставляет дополнительные утилиты для работы с сигналами, которые упрощают сложные сценарии использования.

#### bindReactiveSignals

Создает двустороннее связывание между двумя реактивными сигналами. Изменения в одном сигнале автоматически синхронизируются с другим.

```typescript
import { bindReactiveSignals, signal } from '@shared/utils';

const signalA = signal('Hello');
const signalB = signal('World');

// Создаем двустороннее связывание
bindReactiveSignals(signalA, signalB);

signalA.set('Привет'); // signalB автоматически станет 'Привет'
signalB.set('Мир');    // signalA автоматически станет 'Мир'
```

#### forkJoin

Объединяет несколько сигналов в один, который обновляется только когда все исходные сигналы получают новые значения.

```typescript
import { forkJoin, signal } from '@shared/utils';

const name = signal('John');
const age = signal(25);
const city = signal('Moscow');

const userData = forkJoin(name, age, city);
// userData() вернет ['John', 25, 'Moscow']

name.set('Jane');  // userData не обновится
age.set(30);       // userData не обновится  
city.set('SPB');   // userData обновится до ['Jane', 30, 'SPB']
```

**Применение:**
- Синхронизация связанных данных
- Создание составных объектов из нескольких источников
- Ожидание обновления всех зависимостей перед выполнением действий

#### combineLatest

Объединяет несколько сигналов в один, который обновляется при изменении любого из исходных сигналов. В отличие от `forkJoin`, который ждет обновления всех сигналов, `combineLatest` немедленно обновляется при изменении любого сигнала.

```typescript
import { combineLatest, signal } from '@shared/utils';

const name = signal('John');
const age = signal(25);
const city = signal('Moscow');

const userData = combineLatest(name, age, city);
// userData() вернет ['John', 25, 'Moscow']

name.set('Jane');  // userData немедленно обновится до ['Jane', 25, 'Moscow']
age.set(30);       // userData немедленно обновится до ['Jane', 30, 'Moscow']
city.set('SPB');   // userData немедленно обновится до ['Jane', 30, 'SPB']
```

**Применение:**
- Синхронизация нескольких источников данных в реальном времени
- Создание реактивных вычисляемых значений из нескольких сигналов
- Немедленное обновление UI при изменении любой зависимости

**Различия между `forkJoin` и `combineLatest`:**
- **`forkJoin`** — ждет обновления всех сигналов перед эмитом нового значения. Полезно, когда нужно, чтобы все значения обновились вместе.
- **`combineLatest`** — эмитит новое значение немедленно при изменении любого сигнала. Полезно для обновлений в реальном времени и реактивных вычислений.

  #### firstUpdate

  Выполняет callback после первого обновления реактивного сигнала. Полезно для выполнения одноразовых действий, когда сигнал получает свое первое не-начальное значение.

  ```typescript
  import { firstUpdate, signal } from '@shared/utils';

  const userSignal = signal(null);

  // Этот callback будет вызван только один раз при первом обновлении userSignal
  firstUpdate(userSignal, (user) => {
    console.log('Пользователь загружен впервые:', user);
    // Выполняем логику инициализации
  });

  // Позже, когда userSignal обновится:
  userSignal.set({ name: 'John', age: 30 }); // Callback выполнится
  userSignal.set({ name: 'Jane', age: 25 }); // Callback НЕ выполнится снова
  ```

  **Применение:**
  - Выполнение одноразовой инициализации при первом появлении данных
  - Запуск побочных эффектов только при первом обновлении
  - Обработка сценариев начальной загрузки данных

  ### Функция как дочерний контент (рекомендуемый стиль для динамических списков и условного рендера)

Функции, переданные в качестве дочернего контента в `el` или `customEl`, автоматически преобразуются в реактивный контент. Это позволяет удобно создавать динамический контент, который будет обновляться при изменении зависимых сигналов. Функция-контент получает контекст (ссылку на свой компонент) в качестве первого аргумента.

**Пример: динамический список с контекстом**
```typescript
const items = signal(['Item 1', 'Item 2']);
div(
  ul(
    (self) => {
      console.log('self!!!', self); // self - ссылка на компонент
      return items().map(item => li(item));
    }
  )
)
// При изменении items, весь список будет перерисован
items.set(['Item 1', 'Item 2', 'Item 3']);
```

**Пример: условный рендеринг с контекстом**
```typescript
div(
  (self) => {
    console.log('self!!!', self);
    return when(signal(true), () => button('test-when-signal'));
  }
)
```

**Best practice:**
- Для динамического рендера используйте функции как дочерний контент вместо signalComponent
- Для простых случаев (текст, атрибуты) используйте rs или другие реактивные примитивы
- Для сложных списков с условной логикой используйте функции в качестве дочернего контента
- Используйте контекст (self) для доступа к свойствам и методам компонента внутри функции-контента

## Компоненты

### Создание компонента

Для объявления компонента используйте классы с декораторами. Это обеспечивает строгую типизацию, поддержку реактивных props, событий, провайдеров, инъекций и хуков жизненного цикла. 

**Внутри компонента рекомендуется использовать фабричные функции элементов** (`div`, `button`, `input` и т.д.) из фабрики (`@shared/utils/html-fabric/fabric`). Это обеспечивает строгую типизацию, автодополнение и единый стиль кода. 


#### Пример: Классовый компонент с props и событием

```typescript
@component('test-decorator-component')
export class TestDecoratorComponent extends BaseElement {
    @property()
    testProp = signal<string>('Hello from Decorator!');

    @event()
    onCustomEvent = newEventEmitter<string>();

    render() {
        this.onCustomEvent('test value');
        return div(rs`Title: ${this.testProp()}`);
    }
}
export const TestDecoratorComponentComp = useCustomComponent(TestDecoratorComponent);
```

#### Кратко о параметрах:

- **@property** — поле-сигнал, автоматически синхронизируется с атрибутом.
- **@event** — поле-событие, эмитит кастомные события.
- **render** — метод, возвращающий шаблон компонента.
- **@component** — регистрирует кастомный элемент с заданным селектором.

---

**Best practice:**
- Все props/state/providers/injects — только сигналы (`ReactiveSignal<T>`)
- Все события — только через `EventEmitter<T>`
- Для передачи props используйте атрибуты

### Жизненный цикл

**Доступные хуки:**
- `onInit`, `onBeforeRender`, `onAfterRender`, `onConnected`, `onDisconnected`, `onAttributeChanged`

**Пример:**
```typescript
@component('logger-component')
export class LoggerComponent extends BaseElement {
    connectedCallback() {
        super.connectedCallback?.();
        console.log('connected');
    }
    disconnectedCallback() {
        super.disconnectedCallback?.();
        console.log('disconnected');
    }
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        super.attributeChangedCallback?.(name, oldValue, newValue);
        console.log(name, oldValue, newValue);
    }
    render() {
        return div(rs`Logger`);
    }
}
export const LoggerComponentComp = useCustomComponent(LoggerComponent);
```

### События

**Тип:**
```typescript
interface EventEmitter<T> {
  (value: T | ReactiveSignal<T>): void; // можно передать сигнал — событие будет эмититься реактивно
  oldValue: null;
}
```

**Пример:**
```typescript
@component('counter')
export class Counter extends BaseElement {
    @property()
    count = signal(0);

    @event()
    onCountChange = newEventEmitter<number>();

    render() {
        return button({
            listeners: {
                click: () => {
                    this.count.update(v => v + 1);
                    // разовый эмит значением
                    this.onCountChange(this.count());
                    // либо реактивный эмит: при следующих изменениях count событие будет эмититься автоматически
                    // this.onCountChange(this.count);
                }
            }
        }, rs`Count: ${this.count()}`);
    }
}
export const CounterComp = useCustomComponent(Counter);
```

### Контекст (providers/injects)

**Пример:**
```typescript
const ThemeContext = 'theme';

@component('theme-provider')
export class ThemeProvider extends BaseElement {
    providers = { [ThemeContext]: signal('dark') };
    render() {
        return div(slot({ attributes: { name: 'tab-item' } }));
    }
}

@component('theme-consumer')
export class ThemeConsumer extends BaseElement {
    theme = this.inject<string>(ThemeContext); // Получаем сигнал контекста один раз вне render
    render() {
        return div(rs`Theme: ${this.theme}`);
    }
}

@component('app-root')
export class AppRoot extends BaseElement {
    render() {
        return useCustomComponent(ThemeProvider)(
            useCustomComponent(ThemeConsumer)
        );
    }
}
```

### Классовые компоненты и декораторы

RWC поддерживает декларативное объявление компонентов с помощью классов и TypeScript-декораторов. Это позволяет использовать привычный ООП-подход, строгую типизацию и автодополнение.

#### Основные декораторы

- `@component('имя-компонента')` — регистрирует кастомный элемент с заданным селектором.
- `@property()` — помечает поле класса как реактивное свойство (на основе сигнала). Автоматически синхронизируется с одноимённым атрибутом (kebab-case).
- `@event()` — помечает поле класса как событие (EventEmitter). Позволяет удобно эмитить события наружу.

#### Пример классового компонента

```typescript
@component('test-decorator-component')
export class TestDecoratorComponent extends BaseElement {
    @property()
    testProp = signal<number>(1);

    @event()
    testEvent = newEventEmitter<number>();

    private count = 0;

    render() {
        return div({ listeners: { click: () => this.testEvent(++this.count) } }, rs`test ${this.testProp()}`);
    }
}
export const TestDecoratorComponentComp = useCustomComponent(TestDecoratorComponent);
```

#### Как это работает

- Все поля с `@property()` должны быть сигналами (`signal<T>()`). Изменение значения сигнала автоматически обновляет DOM и атрибуты.
- Все поля с `@event()` должны быть созданы через `newEventEmitter<T>()`. Вызов такого поля эмитит кастомное DOM-событие.
- Метод `render()` возвращает шаблон компонента.
- Класс должен наследоваться от `BaseElement`.

#### Особенности

- Классовые и функциональные компоненты могут использоваться совместно.
- Все преимущества реактивности и типизации сохраняются.
- Декораторы реализованы в `@shared/utils/html-decorators/html-property.ts` и экспортируются через `@shared/utils/html-decorators`.

### Функциональные компоненты

RWC поддерживает создание функциональных компонентов с помощью `createComponent`. Это альтернативный подход к классовым компонентам, который может быть более удобным для простых случаев.

#### createComponent

Создает функциональный компонент, который принимает props и возвращает конфигурацию элемента.

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
const count = signal(0);
const MyButton = Button({
  text: 'Увеличить',
  onClick: () => count.set(count() + 1),
  disabled: false
});
```

**Преимущества функциональных компонентов:**
- Более простой синтаксис для простых случаев
- Автоматическая поддержка `classList` и `reactiveClassList` через props
- Лучшая производительность для компонентов без состояния
- Удобство для создания переиспользуемых UI-элементов

**Когда использовать:**
- Простые компоненты без сложной логики
- UI-элементы, которые принимают только props
- Переиспользуемые компоненты (кнопки, инпуты, карточки)

## Элементы и шаблоны

### Фабрика HTML-элементов

Для создания HTML-элементов используйте фабричные функции (`div`, `button`, `input`, и т.д.) из `@shared/utils/html-fabric/fabric`. Это обеспечивает строгую типизацию, автодополнение и единый стиль.

```typescript
import { div, button, ul, li, input, slot } from '@shared/utils/html-fabric/fabric';

// Примеры:
div('Привет, мир!')
div({ classList: ['container'] },
  button({ listeners: { click: onClick } }, "Click me"),
  ul(
    li('Item 1'),
    li('Item 2')
  )
)
```
- Первый аргумент — объект-конфиг или сразу контент.
- Доступны все стандартные HTML-теги через соответствующие фабрики.

#### Конфигурирование элементов: ComponentInitConfig

Для задания свойств, атрибутов, классов, событий и эффектов элементов и компонентов используется объект-конфиг специального типа — `ComponentInitConfig<T>`. Он поддерживает как стандартную, так и краткую нотацию.

**Типизация:**
```typescript
export type ComponentInitConfig<T extends ExtraHTMLElement> = Partial<{
  classList: ConfigClassList;
  ref: ReactiveSignal<ComponentConfig<T>>;
  style: ConfigStyle;
  attributes: ConfigAttribute<T>;
  customAttributes: ConfigCustomAttribute;
  reactiveClassList: ConfigReactiveClassList;
  children: ConfigChildren;
  effects: ConfigEffect<T>;
  listeners: ConfigListeners<T>;
  customListeners: ConfigCustomListeners<T>;
}> & Partial<{
  [key in AttrSignal<T> as `.${key}`]?: AttributeValue<T, key>;
} & {
  [K in keyof HTMLElementEventMap as `@${string & K}`]?: ComponentEventListener<T, HTMLElementEventMap[K]>;
} & {
  [K in EventKeys<T> as `@${string & K}`]?: CustomEventListener<CustomEventValue<T[K]>, T>;
} & {
  [key in `$${string}`]: EffectCallback<T>;
}>
```

#### Основные возможности

- **classList** — массив классов (строки или функции/сигналы)
- **ref** — реактивный сигнал для получения ссылки на экземпляр компонента
- **style** — объект CSS-стилей; поддерживает как обычные свойства, так и CSS Custom Properties (`--var`), значения могут быть функциями/сигналами
- **attributes** — объект с HTML-атрибутами
- **customAttributes** — объект с кастомными атрибутами
- **reactiveClassList** — массив реактивных классов
- **children** — дочерние элементы/контент
- **effects** — массив эффектов (функций, вызываемых при создании элемента)
- **listeners** — объект с обработчиками DOM-событий
- **customListeners** — объект с обработчиками кастомных событий (например, `route-change`)

##### Краткая нотация

- `.имяАтрибута` — быстрое задание атрибута/свойства
- `@имяСобытия` — быстрое задание обработчика события (DOM или кастомного)
- `$` — быстрое задание эффекта

---

#### Примеры использования

**1. Обычный конфиг**
```typescript
div({
  classList: ['container', () => isActive() ? 'active' : ''],
  attributes: { id: 'main', tabIndex: 0 },
  listeners: {
    click: (e) => console.log('clicked', e)
  },
  effects: [
    (el) => console.log('created', el)
  ]
}, 'Контент')
```

**2. Краткая нотация**
```typescript
div({
  '.id': 'main',
  '.tabIndex': 0,
  '.class': 'container',
  '@click': (e) => console.log('clicked', e),
  '$': (el) => console.log('created', el)
}, 'Контент')
```

**2.1. Стили (static / reactive / custom properties)**
```typescript
const primaryColor = signal('#0d6efd');
div({
  style: {
    color: 'white',
    backgroundColor: () => primaryColor(),
    '--gap': '8px',                // CSS Custom Property
    marginTop: () => '12px'        // реактивное значение
  }
}, 'Стили через config.style')
```

**3. Использование с компонентами**
```typescript
MyComponentComp({
  '.count': countSignal, // реактивный пропс
  '@onCountChange': (value) => console.log('count changed', value)
})
```

**3.1. Кастомные события через customListeners**
```typescript
div({
  customListeners: {
    'route-change': (e, self) => {
      console.log('Изменение маршрута:', e.detail);
    }
  }
})
```

**4. Реактивные классы через classList**
```typescript
div(
  classList`static-class ${() => isActive() ? 'active' : ''}`,
  'Контент'
)
```

**5. Реактивные классы через reactiveClassList**
```typescript
const isRed = signal(false);
const isBold = signal(true);
div({
  reactiveClassList: {
    'red': isRed,
    'bold': isBold
  }
}, 'Текст с реактивными классами');
```

**6. Дочерние элементы**
```typescript
div(
  { classList: ['container'] },
  span('Text'),
  button('Click me')
)
```

**7. Получение ссылки на компонент с помощью ref**

```typescript
const buttonRef = signal<ComponentConfig<HTMLButtonElement>>(null);

// Позже, используем ссылку
button({
  ref: buttonRef,
  listeners: {
    click: () => console.log('Кнопка нажата')
  }
}, 'Нажми меня');

// Доступ к компоненту позже
effect(() => {
  const buttonComponent = buttonRef();
  if (buttonComponent) {
    console.log('Компонент кнопки доступен:', buttonComponent);
    // Можно вызывать методы компонента:
    // buttonComponent.addClass('active');
  }
});
```

---

**Best practice:**  
Используйте краткую нотацию для лаконичности, а стандартную — для сложных случаев или автодополнения в IDE.

### Кастомные компоненты: useCustomComponent

Для создания и использования кастомных компонентов используйте функцию `useCustomComponent` из `@shared/utils/html-fabric/custom-fabric`.

**Рекомендуемый стиль 1:** С использованием декоратора `@component`
1. Объявляете класс компонента с декоратором `@component`.
2. Под классом вызываете `useCustomComponent`, присваиваете результат в константу и экспортируете её (сам класс экспортировать не нужно).

```typescript
import { component, event, property } from '@shared/utils/html-decorators';
import { BaseElement } from '@shared/utils/html-elements/element';
import { useCustomComponent } from '@shared/utils/html-fabric/custom-fabric';
import { div } from '@shared/utils/html-fabric/fabric';

@component('my-component')
class MyComponent extends BaseElement {
  render() {
    return div('Hello from custom component!');
  }
}
export const MyComponentComp = useCustomComponent(MyComponent);
```

**Рекомендуемый стиль 2:** С передачей селектора напрямую в `useCustomComponent`
1. Объявляете класс компонента **без** декоратора `@component`.
2. Вызываете `useCustomComponent` с передачей класса компонента и селектора в качестве второго аргумента.

```typescript
import { event, property } from '@shared/utils/html-decorators';
import { BaseElement } from '@shared/utils/html-elements/element';
import { useCustomComponent } from '@shared/utils/html-fabric/custom-fabric';
import { div } from '@shared/utils/html-fabric/fabric';

class MyComponent extends BaseElement {
  render() {
    return div('Hello from custom component!');
  }
}
export const MyComponentComp = useCustomComponent(MyComponent, 'my-component');
```

Во втором способе декоратор `@component` вызывается внутри `useCustomComponent`, когда передан селектор. Это позволяет упростить код компонента.

**Использование в других компонентах:**
```typescript
div(
  MyComponentComp({ attributes: { someProp: 'value' } },
    'Вложенный контент'
  )
)
```

### Шаблоны слотов (Slot Templates)

`slotTemplate` — это мощный механизм для передачи кастомных шаблонов внутрь компонента. Это аналог "render props" или "scoped slots" из других фреймворков. Он позволяет дочернему компоненту получать шаблоны от родительского компонента и рендерить их с передачей специфичного для слота контекста.

Это полезно, когда компонент должен управлять логикой, но делегировать рендеринг части своего контента внешнему коду.

#### Как это работает

1.  **В компоненте (провайдере шаблона):**
    -   Определяется свойство `slotTemplate` с помощью `defineSlotTemplate<T>()`.
    -   `T` — это тип, описывающий доступные шаблоны. Ключи — имена шаблонов, значения — функции, которые будут рендерить шаблон. Аргументы этих функций — это контекст, передаваемый из компонента.
    -   В методе `render` компонент вызывает эти шаблоны, передавая им контекст.

2.  **При использовании компонента (консьюмере шаблона):**
    -   На инстансе компонента вызывается метод `.setSlotTemplate()`.
    -   В `.setSlotTemplate()` передается объект с реализациями шаблонов.

#### Пример

Допустим, у нас есть компонент списка, который рендерит элементы, но мы хотим позволить пользователю этого компонента настраивать, как именно будет выглядеть каждый элемент.

**1. Создание компонента (`example-list.ts`)**

```typescript
// src/components/example-list.ts
import { BaseElement, component, defineSlotTemplate, div, getList, property, signal, useCustomComponent } from "@shared/utils";
import { ComponentConfig } from "@shared/types";

@component('example-list')
export class ExampleListComponent extends BaseElement {
    // Определяем доступные шаблоны и их контекст
    public slotTemplate = defineSlotTemplate<{
        // Шаблон для элемента списка, получает сам элемент в контексте
        item: (slotCtx: { id: number, name: string }) => ComponentConfig<any> | null,
        // Шаблон для индекса, получает номер в контексте
        indexTemplate: (slotCtx: number) => ComponentConfig<any>
    }>()

    @property()
    items = signal<{ id: number, name: string }[]>([])

    render() {
        // Используем getList для эффективного рендеринга
        return div(getList(
            this.items,
            (item) => item.id,
            (item, index) => div(
                // Рендерим шаблон 'item' если он предоставлен, иначе - стандартный вид
                this.slotTemplate.item?.(item) || div(item.name),
                // Рендерим шаблон 'indexTemplate' если он предоставлен
                this.slotTemplate.indexTemplate?.(index) || div()
            )
        ));
    }
}
export const ExampleList = useCustomComponent(ExampleListComponent);
```

**2. Использование компонента**

```typescript
// src/components/app.ts
import { ExampleList } from './example-list';

const allItems = [
    { id: 1, name: 'Первый' },
    { id: 2, name: 'Второй' },
    { id: 3, name: 'Третий' },
];

@component('my-app')
export class App extends BaseElement {
    render() {
        return div(
            ExampleList({ '.items': allItems })
                // Передаем кастомные шаблоны
                .setSlotTemplate({
                    // Кастомный рендер для элемента
                    item: (itemCtx) => div(`Элемент: ${itemCtx.name} (id: ${itemCtx.id})`),
                    // Кастомный рендер для четных индексов
                    indexTemplate: indexCtx => indexCtx % 2 === 0 
                        ? div(`Четный индекс: ${indexCtx}`) 
                        : null,
                })
        );
    }
}
```

#### Ключевые моменты:

-   `defineSlotTemplate` создает типизированный объект для шаблонов.
-   Метод `.setSlotTemplate()` позволяет передать реализацию шаблонов в компонент.
-   Контекст (`slotCtx`) передается из компонента в функцию-шаблон, что обеспечивает гибкость.
-   Можно определить запасной рендеринг (fallback), если шаблон не был предоставлен, используя `||`.

### Функция как дочерний контент (динамические списки и условный рендер)

Функции, переданные в качестве дочернего контента в фабрики (`div`, `ul`, и т.д.), автоматически преобразуются в реактивный контент.

**Пример: динамический список**
```typescript
const items = signal(['Item 1', 'Item 2']);
div(
  ul(
    () => items().map(item => li(item))
  )
)
// При изменении items, весь список будет перерисован
items.set(['Item 1', 'Item 2', 'Item 3']);
```

### Эффективный рендеринг списков с getList

Для оптимизации производительности при работе со списками рекомендуется использовать функцию `getList`. Она позволяет эффективно обновлять только измененные элементы списка, вместо перерисовки всего списка.

**Сигнатура:**
```typescript
getList<I extends Record<string, any>, K extends keyof I>(
  items: ReactiveSignal<I[]>,
  keyFn: (item: I) => I[K] | string,
  cb: (item: I, index: number, items: I[]) => ComponentConfig<any>
): ComponentConfig<HTMLDivElement>
```

**Параметры:**
- `items` - реактивный сигнал с массивом элементов
- `keyFn` - функция, возвращающая уникальный ключ для каждого элемента (поддерживается `string` или поле элемента `I[K]`)
- `cb` - функция рендеринга элемента, принимающая элемент, его индекс и весь актуальный массив `items`

**Пример использования:**
```typescript
@component('example-list')
class ExampleList extends BaseElement {
    items = signal<{ id: number, name: string }[]>([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
    ])

    render() {
        return div(
            // Обычный рендеринг списка (перерисовывает весь список)
            div(() => this.items().map(item => div(item.name))),
            
            // Эффективный рендеринг с getList (обновляет только измененные элементы)
            div(getList(
                this.items,
                (item) => item.id,  // ключ — id элемента
                (item, index, items) => div(`${index + 1}. ${item.name}`)  // доступен index и весь массив
            ))
        )
    }
}
```

**Преимущества использования getList:**
1. Оптимизированная производительность — обновляются только измененные элементы
2. Сохранение состояния элементов списка
3. Эффективная работа с большими списками
4. Автоматическое обновление при изменении данных

**Особенности реализации:**
- Использует `data-key` для привязки DOM-узлов к элементам данных (ключ берётся из `keyFn`).
- Для каждого ключа хранится собственный сигнал; смена значения сигнала форсирует обновление соответствующего DOM-узла.
- Изменения элемента определяются сравнением: `JSON.stringify(currItem) !== JSON.stringify(oldItems[index])`.
- Узлы, чьи ключи отсутствуют в новом списке, удаляются из DOM, а их кэш (сигналы/компоненты/эффекты) очищается.
- Порядок DOM-узлов синхронизируется с порядком ключей в текущем массиве данных.
- Эффекты рендера создаются один раз на ключ и кэшируются в `currRegisteredEffects`.
- Инициализация эффектов откладывается через `Promise.resolve().then(...)` для корректной вставки в DOM в нужной позиции.
- Ключи нормализуются к строке для консистентности сопоставления.

**Best practices:**
- Ключи должны быть уникальными и стабильными между перерендерингами.
- Избегайте глубоких/больших объектов, если чувствительны к производительности: сравнение через `JSON.stringify` может быть затратным.
- Обеспечьте неизменяемые обновления элементов (immutable), чтобы изменения корректно детектировались.
- Если нужен специфический порядок, формируйте его на уровне данных перед рендером (например, сортируйте массив до передачи в `getList`).

**Best practice:**
- Всегда используйте уникальные ключи для элементов списка
- Используйте `getList` для динамических списков, особенно при частых обновлениях
- Для простых статических списков можно использовать обычный map

### Пример комплексного компонента

```typescript
import { component, event, property } from '@shared/utils/html-decorators';
import { BaseElement } from '@shared/utils/html-elements/element';
import { useCustomComponent } from '@shared/utils/html-fabric/custom-fabric';
import { div, input } from '@shared/utils/html-fabric/fabric';
import { signal } from '@shared/utils/html-elements/signal';

@component('tab-bar-test-item')
class TabBarTestItem extends BaseElement {
  render() {
    return div(
      'tab-bar-test-item 3',
      input()
    );
  }
}
export const TabBarTestItemComp = useCustomComponent(TabBarTestItem);

@component('tab-bar-test')
class TabBarTest extends BaseElement {
  activeTabNumber = signal(0);
  items = signal<string[]>(['test1', 'test2', 'test3']);
  render() {
    const isHidden = signal(false);
    return div(
      this.items,
      () => this.items().map(e => div(e)),
      div(
        { classList: [() => isHidden() ? 'test1' : 'test2'] },
        '!!!test classList!!!'
      ),
      TabBarTestItemComp(
        {},
        div('test1'),
        div('test2'),
        div(TabBarTestItemComp()),
        div(
          div(
            div()
          )
        ),
        div(TabBarTestItemComp()),
        TabBarTestItemComp()
      )
    );
  }
}
export const TabBarTestComp = useCustomComponent(TabBarTest);
```

### Условный рендеринг с помощью when

Для условного рендера используйте функцию `when` из фабрики. Она поддерживает как статические, так и реактивные условия.

```typescript
import { when } from '@shared/utils/html-fabric/fabric';
import { div, span } from '@shared/utils/html-fabric/fabric';
import { signal } from '@shared/utils/html-elements/signal';

// Статическое условие
const isVisible = true;
div(
  when(isVisible,
    () => span('Показано'),
    () => span('Скрыто')
  )
)

// Реактивное условие
const isVisibleSignal = signal(true);
div(
  when(isVisibleSignal,
    () => span('Показано'),
    () => span('Скрыто')
  )
)

// Условный рендеринг с функцией
const items = signal(['Item 1', 'Item 2']);
div(
  when(
    () => items().length > 0,
    () => ul(
      ...items().map(item => li(item))
    ),
    () => div('Нет элементов')
  )
)
```

- `when` автоматически определяет тип условия (булево, сигнал или функция)
- Поддерживает опциональный elseContent
- Используйте для любого условного рендера вместо ручных if/ternary или устаревших rxRenderIf/renderIf
- В качестве аргументов для отрисовки принимает функции типа `CompFuncContent` (функции, возвращающие `ComponentContent` или массив `ComponentContent[]`)

### Условное отображение с помощью show

Для управления видимостью элементов без их удаления из DOM используйте функцию `show`. В отличие от `when`, который полностью добавляет/удаляет элементы, `show` управляет отображением через CSS свойство `display`.

```typescript
// Статическое условие
const isVisible = true;
div(
  show(isVisible, () => span('Контент'))
)

// Реактивное условие
const isVisibleSignal = signal(true);
div(
  show(isVisibleSignal, () => span('Реактивный контент'))
)

// Условие через функцию
const itemCount = signal(5);
div(
  show(() => itemCount() > 0, () => span('Есть элементы'))
)
```

**Различия между `when` и `show`:**

- **`when`** — полностью удаляет/добавляет элементы из DOM. Более эффективно для тяжелых компонентов, которые редко показываются.
- **`show`** — скрывает/показывает элементы через `display: none/contents`. Более эффективно для частого переключения видимости, сохраняет состояние элементов.

**Когда использовать `show`:**
- Для частого переключения видимости (например, выпадающие меню, модальные окна)
- Когда нужно сохранить состояние элемента при скрытии
- Для простых случаев показа/скрытия без альтернативного контента

## Рекомендации и best practices

### Архитектурные принципы

1. **Разделение ответственности**: Используйте классовые компоненты для сложной логики, функциональные — для простых UI-элементов
2. **Реактивность**: Все состояния должны быть сигналами для автоматического обновления UI
3. **Типизация**: Используйте строгую типизацию для всех props, событий и контекстов
4. **Производительность**: Применяйте `getList` для больших списков, `show` для частых переключений видимости

### Паттерны использования

#### Композиция компонентов
```typescript
// Хорошо: композиция простых компонентов
const UserCard = createComponent<UserProps>((props) => 
  div({ classList: ['user-card'] },
    UserAvatar({ src: props.avatar }),
    UserInfo({ name: props.name, email: props.email })
  )
);

// Плохо: один большой компонент со всей логикой
const ComplexUserCard = createComponent<AllProps>((props) => {
  // 200+ строк кода
});
```

#### Управление состоянием
```typescript
// Хорошо: локальное состояние в компоненте
class UserProfile extends BaseElement {
  @property()
  isEditing = signal(false);
  
  render() {
    return when(this.isEditing, 
      () => UserEditForm(),
      () => UserDisplay()
    );
  }
}

// Хорошо: глобальное состояние через контекст
const ThemeContext = 'theme';
class ThemeProvider extends BaseElement {
  providers = { [ThemeContext]: signal('dark') };
}
```

## Примеры

#### Вставка небезопасного HTML (unsafeHtml)
```typescript
// Рендер строки как HTML. Используйте только для доверенного контента!
const html = signal('<b>bold</b> and <i>italic</i>');
div(
  unsafeHtml(html)
)

// статическая строка
div(unsafeHtml('<span style="color:red">red</span>'))
```

### Базовый компонент с props и событием
```typescript
import { component, event, property } from '@shared/utils/html-decorators';
import { BaseElement } from '@shared/utils/html-elements/element';
import { rs, signal } from '@shared/utils/html-elements/signal';
import { newEventEmitter } from '@shared/utils';

@component('test-decorator-component')
export class TestDecoratorComponent extends BaseElement {
    @property()
    testProp = signal<string>('Hello from Decorator!');

    @event()
    onCustomEvent = newEventEmitter<string>();

    render() {
        this.onCustomEvent('test value');
        return div(rs`Title: ${this.testProp()}`);
    }
}
export const TestDecoratorComponentComp = useCustomComponent(TestDecoratorComponent);
```

#### Динамический список через функцию как дочерний контент
```typescript
const items = signal(['Item 1', 'Item 2']);
div(
  () => ul(
    ...items().map(item => li(item))
  )
)
// При изменении items, весь список будет перерисован
items.set(['Item 1', 'Item 2', 'Item 3']);
```

#### Реактивное отображение массива строк
```typescript
const items = signal(['A', 'B', 'C']);
div(() => items().join(','));
```

#### Пример: таб-хедер
```typescript
div({ classList: ['tab-header'] }, rs`current tab: ${createSignal(() => this.activeTab() + 1)}`)
```

#### Пример: компонент с пропсами
```typescript
class TestDecoratorComponent extends BaseElement {
  @property()
  testProp = signal<string>('Hello from Decorator!');
  @event()
  onCustomEvent = newEventEmitter<string>();
  render() {
    this.onCustomEvent('test value');
    return div(rs`Title: ${this.testProp()}`);
  }
}
export const TestDecoratorComponentComp = useCustomComponent(TestDecoratorComponent);
```

#### Пример: компонент с логированием
```typescript
class LoggerComponent extends BaseElement {
  connectedCallback() {
    super.connectedCallback?.();
    console.log('connected');
  }
  disconnectedCallback() {
    super.disconnectedCallback?.();
    console.log('disconnected');
  }
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    super.attributeChangedCallback?.(name, oldValue, newValue);
    console.log(name, oldValue, newValue);
  }
  render() {
    return div(rs`Logger`);
  }
}
export const LoggerComponentComp = useCustomComponent(LoggerComponent);
```

#### Пример: кнопка с сигналом
```typescript
class Counter extends BaseElement {
  @property()
  count = signal(0);
  @event()
  onCountChange = newEventEmitter<number>();
  render() {
    return button({
      listeners: {
        click: () => {
          this.count.update(v => v + 1);
          this.onCountChange(this.count());
        }
      }
    }, rs`Count: ${this.count()}`);
  }
}
export const CounterComp = useCustomComponent(Counter);
```

#### Пример: слот
```typescript
div(slot({ attributes: { name: 'tab-item' } }))
```

#### Пример: использование контекста
```typescript
class ThemeConsumer extends BaseElement {
  theme = this.inject<string>(ThemeContext); // Получаем сигнал контекста один раз вне render
  render() {
    return div(rs`Theme: ${this.theme}`);
  }
}
export const ThemeConsumerComp = useCustomComponent(ThemeConsumer);
```

#### Пример: вложенные компоненты
```typescript
div(
  ThemeProviderComp(
    ThemeConsumerComp()
  )
)
```

#### Пример: функциональный компонент
```typescript
import { createComponent } from '@shared/utils/html-fabric/fn-component';
import { button } from '@shared/utils/html-fabric/fabric';

interface CounterProps {
  initialValue?: number;
  step?: number;
}

const Counter = createComponent<CounterProps>((props) => {
  const count = signal(props.initialValue || 0);
  
  return button({
    listeners: {
      click: () => count.set(count() + (props.step || 1))
    }
  }, () => `Счетчик: ${count()}`);
});

// Использование
const MyCounter = Counter({
  initialValue: 10,
  step: 5
});
```

#### Пример: работа с утилитами сигналов
```typescript
import { bindReactiveSignals, forkJoin, combineLatest, signal } from '@shared/utils';

// Двустороннее связывание
const inputValue = signal('');
const displayValue = signal('');
bindReactiveSignals(inputValue, displayValue);

// Объединение сигналов с forkJoin (ждет обновления всех)
const name = signal('John');
const age = signal(25);
const userInfo = forkJoin(name, age);
// userInfo() вернет ['John', 25] только когда оба сигнала обновятся

// Объединение сигналов с combineLatest (обновляется при любом изменении)
const firstName = signal('John');
const lastName = signal('Doe');
const fullName = combineLatest(firstName, lastName);
// fullName() вернет ['John', 'Doe'] и обновится немедленно при изменении любого сигнала
firstName.set('Jane'); // fullName() немедленно станет ['Jane', 'Doe']
```

#### Пример: обработка событий
```typescript
class TestDecoratorComponent extends BaseElement {
  @property()
  testProp = signal<number>(1);
  @event()
  testEvent = newEventEmitter<number>();
  private count = 0;
  render() {
    return div({ listeners: { click: () => this.testEvent(++this.count) } }, rs`test ${this.testProp()}`);
  }
}
export const TestDecoratorComponentComp = useCustomComponent(TestDecoratorComponent);
```

### Дополнительные утилиты

#### Использование функции `classList`

Для удобного задания динамических и статических классов в конфиге элемента можно использовать функцию `classList`. Она позволяет комбинировать строковые значения и функции (например, сигналы), возвращающие строку класса. Это особенно полезно для реактивного управления классами.

**Сигнатура:**
```typescript
classList(strings: TemplateStringsArray, ...args: (() => string)[]): { classList: (string | (() => string))[] }
```

**Пример статических и динамических классов:**
```typescript
const isActive = signal(false);
div(
  classList`my-static-class ${() => isActive() ? 'active' : ''}`,
  'Контент'
)
// При изменении isActive, класс 'active' будет добавляться или убираться автоматически
```

**Дополнительно:**
- В качестве функции внутри `classList` можно передавать **сигнал**, который возвращает строку с классом:

```typescript
const dynamicClass = signal('my-dynamic-class');
div(
  classList`static-class ${dynamicClass}`,
  'Контент'
)
// При изменении dynamicClass, класс будет автоматически обновляться
```

- Также можно передавать **функцию, возвращающую сигнал**:

```typescript
const getClassSignal = () => someSignal;
div(
  classList`test-class ${getClassSignal}`,
  'Контент'
)
// Класс будет реактивно меняться при изменении значения сигнала, возвращаемого функцией
```
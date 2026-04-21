# Reactive Web Components (RWC)

[Подробная документация](./DOCUMENTATION.md)

**RWC** — легковесная библиотека для создания реактивных [веб-компонентов](https://developer.mozilla.org/ru/docs/Web/API/Web_components) без привязки к конкретному фреймворку. Сочетает в себе fine-grained сигналы, эффекты и декларативную TypeScript-first HTML-фабрику для построения UI из строго типизированных примитивов — без шаблонов, без JSX, только TypeScript.

## Зачем нужна RWC

### Безболезненная миграция версий UI-кита и бизнес-модулей

RWC спроектирована как **фундаментный слой** для построения UI-китов и бизнес-модулей, которые могут развиваться независимо друг от друга. Ключевая архитектурная особенность — **система постфиксной регистрации**: компоненты UI-кита можно регистрировать с разными суффиксами, что позволяет нескольким версиям сосуществовать в одном DOM без конфликтов.

```
┌─────────────────────────────────────────────────┐
│  RWC (Фундамент)                                │
│  Сигналы, BaseElement, Декораторы, HTML-фабрика │
└──────────┬──────────────────────┬───────────────┘
           │                      │
    ┌──────▼──────┐        ┌──────▼──────┐
    │  UI Kit v1  │        │  UI Kit v2  │
    │  uwc-button │        │  uwc-button │
    └──────┬──────┘        └──────┬──────┘
           │                      │
    ┌──────▼──────┐        ┌──────▼──────┐
    │  Модуль A   │        │  Модуль B   │
    │  postfix:a  │        │  postfix:b  │
    │  uwc-btn-a  │        │  uwc-btn-b  │
    └─────────────┘        └─────────────┘
```

**Как это работает:**

1. UI-кит (например, `@hrcrm/web-ui-kit`) создаёт компоненты через `configCustomComponent` из RWC, который возвращает кортеж `[useComponent, registerComponent]` — разделяя **JS-фабрику** и **регистрацию Custom Element**.

2. Каждый бизнес-модуль при старте вызывает `registerAllComponents({ postfix: 'myModule' })`, регистрируя компоненты как `uwc-button-myModule`, `uwc-modal-myModule` и т.д.

3. **JS-код не меняется** — `UwcButton({ '.disabled': true })` работает одинаково независимо от постфикса. Меняется только селектор Custom Element.

4. Несколько модулей могут использовать **разные версии** UI-кита на одной странице, потому что каждый регистрирует свой набор Custom Elements с уникальным постфиксом.

```typescript
// UI Kit: определение компонента (не меняется между версиями)
export const [UwcButton, registerUwcButton] = configCustomComponent(UwcButtonComponent);

// Бизнес-модуль A: использует UI kit v1.7
import { registerAllComponents } from '@hrcrm/web-ui-kit@1.7';
registerAllComponents({ postfix: 'moduleA' });
// Регистрирует: uwc-button-moduleA, uwc-alert-moduleA, ...

// Бизнес-модуль B: использует UI kit v1.8
import { registerAllComponents } from '@hrcrm/web-ui-kit@1.8';
registerAllComponents({ postfix: 'moduleB' });
// Регистрирует: uwc-button-moduleB, uwc-alert-moduleB, ...

// Оба модуля используют одинаковый JS API:
UwcButton({ '.type': ButtonType.PRIMARY }, 'Нажми')
```

Это позволяет выполнять **поэтапную миграцию** — обновлять один модуль за раз, не трогая остальные.

### Сигналы и эффекты без привязки к фреймворку

Сигналы и эффекты в RWC — **независимые примитивы**, которые работают в любом месте кода без ограничений:

| | Сигналы везде | Эффекты везде | Требуется контекст |
|---|:---:|:---:|:---:|
| **RWC** | ✅ | ✅ | Нет |
| **Angular** | ✅ | ❌ | `effect()` требует injection context |
| **Solid.js** | ✅ | ⚠️ | `createEffect` требует reactive owner |

В Angular вызов `effect()` вне конструктора или фабрики бросает `NG0203`. В Solid.js `createEffect` вне tracking scope утекает в памяти или требует ручного `runWithOwner`.

**У RWC нет этих ограничений.** Сигналы и эффекты работают в любом контексте — внутри компонентов, вне компонентов, в утилитарных функциях, в асинхронном коде, где угодно.

### Иерархическая очистка эффектов

Эффекты в RWC образуют **дерево parent-child**, привязанное к жизненному циклу компонента. При удалении компонента из DOM его корневой `wrapperEffect` уничтожается, что **каскадно** уничтожает все дочерние эффекты — ручная очистка не нужна.

```
@component('my-app')
└── wrapperEffect (корень)
    ├── эффект из render()
    │   ├── эффект из div().addEffect()
    │   └── эффект из setReactiveAttribute()
    └── эффект из init()

// При disconnectedCallback:
// wrapperEffect.destroy() → каскадно уничтожает ВСЕ дочерние эффекты
```

Обычные HTML-элементы автоматически ищут ближайший веб-компонент вверх по DOM-дереву (включая границы ShadowRoot) и привязывают свои эффекты к нему через `componentEffect`.

### TypeScript на всех уровнях

Вся разметка строится через TypeScript-фабрики (`div`, `button`, `input`, ...):

- **Полная проверка типов в шаблонах** — props, атрибуты, события, слоты и дочерние элементы типизированы
- **Автодополнение везде** — подсказки IDE для каждой опции конфига, имени события и атрибута
- **Ошибки на этапе компиляции** — опечатки в именах атрибутов или неправильные сигнатуры обработчиков событий ловятся до runtime

### Типизированные слоты

Слоты полностью типизированы через `slotTemplate`. Родительский компонент определяет ожидаемые шаблоны, а дочерний компонент потребляет их с типизированным контекстом — аналогично scoped slots в Vue, но с гарантиями на этапе компиляции.

## Возможности

- **Реактивность** — `signal`, `effect`, `onCleanup`, `createSignal`, `rs`, `pipe`, `forkJoin`, `combineLatest`, `firstUpdate`
- **Классовые компоненты** — декораторы (`@component`, `@property`, `@event`) с хуками жизненного цикла
- **Функциональные компоненты** — легковесная альтернатива через `createComponent`
- **HTML-фабрика** — декларативное создание элементов с типизированным конфигом (`ComponentInitConfig`)
- **Краткий синтаксис** — `.attr` для атрибутов, `@event` для обработчиков, `$name` для эффектов
- **Управление потоком** — `getList` (эффективные списки с ключами), `when` (условный рендер), `show` (переключение через CSS)
- **Слоты** — типизированный `slotTemplate` с контекстом
- **DI** — контекст через providers/injects (без пробрасывания props)
- **Стилизация** — `static styles` через `adoptedStyleSheets`, реактивные `classList` и `style`, CSS Custom Properties
- **Версионирование** — кортеж `configCustomComponent` + постфиксная регистрация для сосуществования нескольких версий

## Установка

```bash
npm install @reactive-web-components/rwc
```

> Требуется TypeScript 5+ и современный браузер с поддержкой [Custom Elements v1](https://caniuse.com/custom-elementsv1).

## Быстрый старт

Минимальный реактивный счётчик:

```typescript
import {
  component, property, event,
  BaseElement,
  div, button,
  signal, rs, newEventEmitter, useCustomComponent
} from '@reactive-web-components/rwc';

@component('rwc-counter')
class Counter extends BaseElement {
  @property()
  count = signal(0);

  @event()
  onCountChange = newEventEmitter<number>();

  render() {
    return div(
      button({
        '@click': () => {
          this.count.update(v => v + 1);
          this.onCountChange(this.count());
        },
      },
        rs`Счётчик: ${this.count}`
      )
    );
  }
}

export const CounterComp = useCustomComponent(Counter);
```

Использование в другом компоненте:

```typescript
CounterComp({
  '.count': signal(10),                            // типизированный атрибут
  '@onCountChange': (e) => console.log(e.detail),  // типизированное событие
})
```

Или напрямую в HTML:

```html
<rwc-counter count="10"></rwc-counter>
```

## Краткий синтаксис конфига

```typescript
// Краткая нотация — меньше кода, та же типизация
div({
  '.id': 'main',
  '.tabIndex': 0,
  '@click': (e) => console.log('clicked', e),
  '$onMount': (self, host) => console.log('создан', host),
}, 'Контент')

// Эквивалентная стандартная нотация
div({
  attributes: { id: 'main', tabIndex: 0 },
  listeners: { click: (e) => console.log('clicked', e) },
  effects: [(self, host) => console.log('создан', host)],
}, 'Контент')
```

| Префикс | Значение | Пример |
|---------|----------|--------|
| `.` | Атрибут / свойство | `'.disabled': true` |
| `@` | Обработчик события (DOM или кастомное) | `'@click': handler` |
| `$` | Эффект (выполняется при создании элемента) | `'$init': (self, host) => ...` |

## Построение UI-кита с постфиксным версионированием

Функция `configCustomComponent` возвращает кортеж `[factory, register]`, разделяя JS API и регистрацию Custom Element:

```typescript
// ui-kit/src/components/button.ts
import { configCustomComponent, BaseElement, signal, property, div, slot } from '@reactive-web-components/rwc';

class UwcButtonComponent extends BaseElement {
  @property() disabled = signal(false);
  render() { return div({ classList: ['uwc-button'] }, slot()); }
}

export const [UwcButton, registerUwcButton] = configCustomComponent(UwcButtonComponent);

// ui-kit/src/index.ts
export const registerAllComponents = ({ postfix = '' } = {}) => {
  const wrap = (name: `${string}-${string}`): `${string}-${string}` =>
    postfix ? `${name}-${postfix}` : name;

  registerUwcButton(wrap('uwc-button'));
  registerUwcAlert(wrap('uwc-alert'));
  // ... остальные компоненты
};
```

Бизнес-модули регистрируются со своим постфиксом:

```typescript
// eok-module/src/index.ts
import { registerAllComponents } from '@hrcrm/web-ui-kit';

registerAllComponents({ postfix: 'eok' });
// Теперь доступны uwc-button-eok, uwc-alert-eok и т.д.
```

## Типизированные шаблоны слотов

```typescript
@component('item-list')
class ItemList extends BaseElement {
  slotTemplate = defineSlotTemplate<{
    item: (ctx: { id: number; name: string }) => ComponentConfig<any>;
  }>();

  @property()
  items = signal<{ id: number; name: string }[]>([]);

  render() {
    return div(getList(
      this.items,
      (i) => i.id,
      (item) => this.slotTemplate.item?.(item) || div(item.name)
    ));
  }
}
export const ItemListComp = useCustomComponent(ItemList);

// Потребитель — полностью типизированный контекст
ItemListComp({ '.items': data })
  .setSlotTemplate({
    item: (ctx) => div(`${ctx.name} (#${ctx.id})`),  // ctx типизирован!
  })
```

## Когда использовать RWC

- **Фундамент для UI-кита** — построить общую библиотеку компонентов с поддержкой сосуществования нескольких версий через постфиксную регистрацию
- **Микрофронтенды** — каждое микро-приложение регистрирует свою версию UI-кита, без конфликтов в глобальном реестре Custom Elements
- **Типобезопасные веб-компоненты** — безопасность на этапе компиляции для шаблонов, слотов и обработчиков событий без тяжёлого фреймворка
- **Реактивность на сигналах** — как в Solid или Angular Signals, но без ограничений контекста
- **Поэтапная миграция** — обновлять один бизнес-модуль за раз, пока остальные остаются на старой версии UI-кита

## Документация

| Ресурс | Описание |
|--------|----------|
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Полная документация — справочник API с примерами |

## Разработка

```bash
# Установка зависимостей
npm install

# Сборка библиотеки
npm run build

# Сборка в режиме watch
npm run dev
```

## Лицензия

[MIT](./LICENSE)

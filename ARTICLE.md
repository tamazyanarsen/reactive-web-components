# Reactive Web Components: реактивность без фреймворка

Пару лет назад я столкнулся с проблемой, которая наверняка знакома многим: нужно было сделать компонентную систему, но React казался избыточным, Vue требовал настройки сборки, а чистый JavaScript уже начинал превращаться в нечитаемую кашу из addEventListener и innerHTML.

В итоге я написал свою библиотеку — **Reactive Web Components (RWC)**. Не потому что хотел изобрести велосипед, а потому что нужен был инструмент, который даёт реактивность без лишнего оверхеда и при этом работает с нативными Web Components. То есть компоненты можно использовать где угодно — хоть в React-приложении, хоть в старом jQuery-проекте.

## Что это такое

RWC — это не фреймворк. Это просто набор утилит, которые добавляют реактивность к обычным веб-компонентам. В основе лежит система сигналов (похожа на Solid.js или Preact Signals), но заточена под Web Components.

Идея максимально простая: состояние — это сигналы, компоненты — классы с декораторами, рендеринг — через фабричные функции. Всё обёрнуто в TypeScript, так что автодополнение работает без танцев с бубном.

## Почему сигналы — не просто тренд

Сегодня все говорят о реактивных сигналах. Solid.js, Qwik, даже Vue 3 перешли на них. Но почему?

Представьте: у вас есть счётчик. В React вы напишете:

```tsx
const [count, setCount] = useState(0);
```

При изменении `count` перерисуется весь компонент и все его дети (если вы не оптимизировали через `useMemo` и `React.memo`). В RWC:

```typescript
const count = signal(0);
```

Изменение `count` обновит только те DOM-узлы, которые непосредственно зависят от этого сигнала. Никаких виртуальных DOM, диффинга, мемоизации. Только чистые сигналы и их зависимости.

Вся реактивность завязана на сигналах. Сигнал — это функция, которая возвращает значение и при этом запоминает, кто её вызвал. Звучит просто, но это и есть вся магия.

```typescript
import { signal } from '@shared/utils';

const count = signal(0);
count();        // читаем: 0
count.set(10);  // меняем
count.update(v => v + 1); // или через функцию
```

Когда вызываешь сигнал внутри эффекта или компонента, библиотека автоматически подписывается на изменения. Обновил сигнал — все подписчики пересчитались. Никаких ручных подписок, никаких `useEffect` с зависимостями, которые можно забыть обновить.

В RWC все состояния — это сигналы. Свойства компонентов — сигналы. Контекст — сигналы. Это создаёт единую систему, где обновления происходят с хирургической точностью.

```typescript
import { signal, effect } from '@shared/utils';

const name = signal('Иван');
const surname = signal('Петров');

effect(() => {
  console.log(`Полное имя: ${name()} ${surname()}`);
});

name.set('Пётр'); // автоматически выведет "Полное имя: Пётр Петров"
```

Для вычисляемых значений есть `createSignal` — он сам отслеживает зависимости:

```typescript
const price = signal(100);
const quantity = signal(2);
const total = createSignal(() => price() * quantity());
// total() всегда актуальный, обновляется сам
```

А для строк — `rs` (reactive string), работает как template literal, но реактивно:

```typescript
const user = signal('Анна');
const greeting = rs`Привет, ${user}!`;
// greeting() обновляется автоматически
```

## Компоненты: два подхода

RWC поддерживает оба подхода — классовый и функциональный. В разных ситуациях удобны разные стили.

### Классовый подход — для сложной логики

Компоненты — это обычные классы, наследующиеся от `BaseElement`. Реактивные свойства и события помечаются декораторами:

```typescript
import { component, property, event } from '@shared/utils/html-decorators';
import { BaseElement } from '@shared/utils/html-elements/element';
import { useCustomComponent } from '@shared/utils/html-fabric/custom-fabric';
import { div, button } from '@shared/utils/html-fabric/fabric';
import { signal, rs } from '@shared/utils';
import { newEventEmitter } from '@shared/utils';

@component('my-counter')
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
        }
      }, rs`Счёт: ${this.count()}`)
    );
  }
}

export const CounterComp = useCustomComponent(Counter);
```

`@property()` делает поле реактивным и синхронизирует с HTML-атрибутом. `@event()` создаёт кастомное событие. TypeScript всё типизирует, так что опечатки ловятся на этапе компиляции.

### Функциональный подход — для простоты

Для простых презентационных компонентов удобнее функциональный стиль:

```typescript
import { createComponent } from '@shared/utils/html-fabric/fn-component';
import { div, img } from '@shared/utils/html-fabric/fabric';

interface UserCardProps {
  user: { name: string; avatar: string; email: string };
}

const UserCard = createComponent<UserCardProps>((props) => 
  div(
    { classList: ['card'] },
    img({ '.src': props.user.avatar }),
    div(props.user.name),
    div(props.user.email)
  )
);
```

Функциональные компоненты легче, проще тестируются и отлично композируются. Идеальны для UI-элементов без сложной логики.

## Фабрика элементов: простота без компромиссов

Вместо `document.createElement` и ручной возни с атрибутами используются фабричные функции. Это похоже на Solid.js, но с важным отличием: **нет JSX**. Вместо него — фабричные функции (`div`, `button`), которые дают строгую типизацию и автодополнение без необходимости в Babel или TypeScript-трансформациях.

Это сознательный выбор. Когда работаешь с крупными проектами, типизация атрибутов, событий и CSS-классов экономит часы отладки. А отсутствие препроцессора упрощает настройку сборки.

```typescript
import { div, button, input, signal } from '@shared/utils';

const count = signal(0);

// Создаём производный сигнал
const doubled = count.pipe(v => v * 2);

// Рендеринг
div(
  button({ 
    '@click': () => count.update(v => v + 1) 
  }, 'Увеличить'),
  rs`Счётчик: ${count()} (удвоенное: ${doubled()})`
)
```

Есть краткая нотация: `.атрибут` для свойств, `@событие` для обработчиков. Код получается компактнее, но не менее читаемым.

## Реактивные списки

Для списков есть `getList` — он обновляет только те элементы, что реально изменились. Не перерисовывает весь список, а точечно обновляет DOM:

```typescript
import { getList } from '@shared/utils';

@component('item-list')
class ItemList extends BaseElement {
  items = signal([
    { id: 1, name: 'Первый' },
    { id: 2, name: 'Второй' }
  ]);

  render() {
    return div(
      getList(
        this.items,
        (item) => item.id, // ключ для отслеживания
        (item, index) => div(`${index + 1}. ${item.name}`)
      )
    );
  }
}
```

`getList` сравнивает элементы по ключу и трогает только изменённые. Для больших списков это критично — без этого UI начинает тормозить.

Представьте таблицу с тысячей строк, где каждая ячейка реагирует на изменения. В традиционных фреймворках это кошмар оптимизаций. В RWC — стандартный сценарий. При изменении цен в нескольких товарах RWC обновит только соответствующие DOM-узлы. Никакого перерендера всей таблицы.

## Условный рендеринг

Есть два варианта: `when` и `show`. Первый полностью удаляет/добавляет элементы в DOM, второй просто скрывает через CSS:

```typescript
import { when, show } from '@shared/utils/html-fabric/fabric';

const isVisible = signal(true);

// Полное удаление из DOM
div(
  when(isVisible, 
    () => div('Видимо'),
    () => div('Скрыто')
  )
);

// Просто скрытие
div(
  show(isVisible, () => div('Контент'))
);
```

`when` — для тяжёлых компонентов, которые редко показываются (экономишь память). `show` — для частых переключений, когда нужно сохранить состояние (например, форма с валидацией).

## Контекст и провайдеры

Для передачи данных вниз по дереву — провайдеры и инъекции. Работает как Context API в React, но через сигналы, так что всё реактивно:

```typescript
const ThemeContext = 'theme';

@component('theme-provider')
class ThemeProvider extends BaseElement {
  providers = { 
    [ThemeContext]: signal('dark') 
  };
  
  render() {
    return div(slot());
  }
}

@component('theme-consumer')
class ThemeConsumer extends BaseElement {
  theme = this.inject<string>(ThemeContext);
  
  render() {
    return div(rs`Тема: ${this.theme()}`);
  }
}
```

Изменил тему в провайдере — все потребители обновились автоматически. Без пропс-дриллинга, без лишнего кода.

## Slot Templates

Для гибкой композиции есть slot templates — аналог render props или scoped slots из Vue:

```typescript
@component('data-list')
class DataList extends BaseElement {
  slotTemplate = defineSlotTemplate<{
    item: (ctx: { id: number, name: string }) => ComponentConfig<any>
  }>();

  items = signal([...]);

  render() {
    return div(
      getList(
        this.items,
        item => item.id,
        item => this.slotTemplate.item?.(item) || div(item.name)
      )
    );
  }
}

// Использование
DataListComp()
  .setSlotTemplate({
    item: (ctx) => div(`Элемент: ${ctx.name} (id: ${ctx.id})`)
  })
```

Компонент управляет логикой, а рендеринг делегирует наружу. Удобно для библиотечных компонентов, где нужно дать пользователю контроль над внешним видом.

## Почему это не очередной фреймворк-однодневка

Я понимаю ваши сомнения. За последние годы появилось десятки «революционных» UI-библиотек. Чем RWC отличается?

**1. Минимальный API surface.** Всё строится вокруг 3-4 базовых примитивов: `signal`, `createSignal`, `effect`, `pipe`. Нет десятков хуков и магических правил.

**2. Нет виртуального DOM.** RWC работает напрямую с DOM, обновляя только изменённые узлы. Это даёт предсказуемую производительность без просадок при росте приложения.

**3. Совместимость со стандартами.** Компоненты — настоящие Web Components. Их можно использовать в любом проекте, даже без сборки. Просто `<my-component></my-component>` и всё работает.

**4. Отсутствие runtime-бандла.** В продакшене библиотека весит меньше 15KB gzipped (для сравнения: React + ReactDOM — около 45KB), потому что многие утилиты дропаются TypeScript при компиляции.

**React/Vue**: нет виртуального DOM, нет runtime-оверхеда. Компоненты можно вставить хоть в jQuery-проект, хоть в React-приложение.

**Lit**: [Lit](https://lit.dev/docs/) — популярная библиотека для веб-компонентов, весит около 5KB. В Lit реактивные свойства (помеченные `@state` или `@property`) автоматически вызывают перерисовку при изменении. Главное отличие RWC от Lit — единая система сигналов для всего состояния.

В Lit для вычисляемых значений или сложной логики нужно либо создавать геттеры, либо вручную вызывать `requestUpdate()`:
```typescript
// Lit
@state() private count = 0;
private doubled = 0;

increment() {
  this.count++;
  this.doubled = this.count * 2; // нужно вручную обновить
  this.requestUpdate(); // если doubled не реактивное свойство
}
```

В RWC вычисляемые значения — это просто сигналы, которые обновляются автоматически:
```typescript
// RWC
count = signal(0);
doubled = createSignal(() => this.count() * 2); // обновляется сам

increment() {
  this.count.update(v => v + 1); // doubled обновится автоматически
}
```

Также RWC использует фабричные функции вместо tagged template literals — это даёт строгую типизацию атрибутов и событий без необходимости в препроцессорах. В Lit шаблоны пишутся через `html\`...\``, в RWC — через `div(...)`, что даёт автодополнение в IDE и проверку типов на этапе компиляции.

**Stencil**: компилятор, который генерирует веб-компоненты. Имеет свою систему реактивности, но требует компиляции. RWC работает без компиляции, используя runtime-реактивность через сигналы.

## Отладка без магии

Один из самых частых вопросов: «Как отлаживать реактивные зависимости?» В RWC всё прозрачно.

Нет скрытых обновлений. В DevTools видно, какие сигналы влияют на какие DOM-узлы. Не нужно ломать голову, почему при изменении одного поля перерисовывается пол-страницы. Всё явно, всё можно отследить.

## Практический пример: живой поиск

Давайте соберём всё вместе. Вот компонент поиска с дебаунсом и загрузкой:

```typescript
import { component } from '@shared/utils/html-decorators';
import { BaseElement } from '@shared/utils/html-elements/element';
import { div, input, ul, li } from '@shared/utils/html-fabric/fabric';
import { signal, effect } from '@shared/utils';
import { when } from '@shared/utils/html-fabric/fabric';

@component('live-search')
class LiveSearch extends BaseElement {
  query = signal('');
  results = signal<any[]>([]);
  isLoading = signal(false);
  debounceTimer: number | null = null;

  // Дебаунс для запросов
  private debouncedSearch = () => {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    
    this.debounceTimer = window.setTimeout(async () => {
      const q = this.query();
      if (q.length < 2) {
        this.results.set([]);
        return;
      }
      
      this.isLoading.set(true);
      try {
        const response = await fetch(`/api/search?q=${q}`);
        const data = await response.json();
        this.results.set(data);
      } catch (error) {
        this.results.set([]);
      } finally {
        this.isLoading.set(false);
      }
    }, 300);
  };

  connectedCallback() {
    super.connectedCallback?.();
    // Реактивно отслеживаем изменения query
    effect(() => {
      this.query();
      this.debouncedSearch();
    });
  }

  render() {
    return div(
      { classList: ['search-container'] },
      input({
        '.value': this.query,
        '@input': (e, self, host) => this.query.set(host.value),
        '.placeholder': 'Поиск...'
      }),
      
      // Показываем лоадер
      when(() => this.isLoading(), () => div('Загрузка...')),
      
      // Результаты
      ul(
        () => this.results().map(item => 
          li(
            { 
              '@click': () => {
                this.dispatchEvent(new CustomEvent('item-selected', { 
                  detail: item 
                }));
              }
            }, 
            item.name
          )
        )
      )
    );
  }
}
```

Обратите внимание: нет `useEffect`, `useState`, `useRef`. Только сигналы и их преобразования. Обработка ошибок встроена в логику. Условная логика выразительна без лишних вложенностей. Всё работает реактивно — изменил `query`, автоматически запустился поиск.

## Когда использовать

RWC подходит, если нужно:
- Создавать переиспользуемые компоненты, которые работают везде (даже в legacy-проектах)
- Иметь реактивность без тяжёлого фреймворка
- Строгую типизацию и автодополнение
- Контроль над производительностью (нет виртуального DOM, обновления точечные)

Не подходит, если:
- Нужна огромная экосистема готовых компонентов (как у React с Material-UI)
- Команда не знает TypeScript (хотя можно и без него, но теряется половина преимуществ)
- Проект уже на другом фреймворке и переписывать не планируется (хотя компоненты можно использовать и там)

## Почему это работает

После работы с большими фреймворками начинаешь замечать, что половину времени тратишь на борьбу с абстракциями. Virtual DOM, сложные системы жизненного цикла, магия компиляторов... RWC — это попытка вернуться к основам, но с современными возможностями.

Код получается декларативным, но без магии. Всё прозрачно, всё можно отладить в DevTools. Нет скрытых обновлений, нет неожиданных ре-рендеров. Изменил сигнал — обновилось только то, что от него зависит.

И главное — компоненты работают везде, где поддерживаются Web Components (то есть почти везде). Можно постепенно мигрировать старые проекты, подключая компоненты по одному. Или использовать в новых проектах с нуля.

## Итоги

Я не призываю всех бросать React/Lit и переходить на RWC. У каждого инструмента своя область применения. Но если вы сталкиваетесь с проблемами производительности в сложных интерактивных интерфейсах, если вам надоело бороться с неоптимальными перерисовками — возможно, сигналы и fine-grained реактивность дадут вам то, чего не хватало.

RWC — это не попытка изобрести всё заново. Это аккуратное объединение лучших идей из Solid.js (реактивность), Web Components (стандарты) и функционального программирования (чистые преобразования).

Если интересно попробовать — репозиторий на GitHub, документация в README. Библиотека активно развивается, обратная связь приветствуется. Особенно интересны кейсы использования в реальных проектах — пишите, как вам работается.

*P.S. Если найдёте баг — не стесняйтесь заводить issue.*

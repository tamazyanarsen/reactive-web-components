# Reactive Web Components (RWC) Library Documentation

---

## Table of Contents
1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
   - [Signals](#signals)
     - [Signal Methods: set, update, forceSet](#signals)
   - [Effects](#effects)
   - [Reactive Strings (rs)](#reactive-strings-rs)
   - [createSignal](#createsignal)
   - [Signal Utilities](#signal-utilities)
   - [Function as Child Content](#function-as-child-content-dynamic-lists-and-conditional-render)
3. [Components](#components)
   - [Creating a Component](#creating-a-component)
   - [Lifecycle](#lifecycle)
   - [Events](#events)
   - [Context (providers/injects)](#context-providersinjects)
   - [Class Components and Decorators](#class-components-and-decorators)
   - [Functional Components](#functional-components)
4. [Elements and Templates](#elements-and-templates)
   - [HTML Element Factory](#html-element-factory)
   - [Element Configuration: ComponentInitConfig](#element-configuration-componentinitconfig)
   - [Custom Components: useCustomComponent](#custom-components-usecustomcomponent)
   - [Slot Templates](#slot-templates)
   - [Function as Child Content (Dynamic Lists and Conditional Render)](#function-as-child-content-dynamic-lists-and-conditional-render)
   - [Efficient List Rendering with getList](#efficient-list-rendering-with-getlist)
   - [Conditional Rendering with when](#conditional-rendering-with-when)
   - [Conditional Display with show](#conditional-display-with-show)
5. [Examples](#examples)
6. [Recommendations and Best Practices](#recommendations-and-best-practices)
7. [Conclusion](#conclusion)

---

## Introduction
RWC is a modern library for creating reactive web components with declarative syntax and strict typing. It allows you to build complex UIs with minimal code and maximum reactivity.

## Core Concepts

### Signals
A signal is a reactive wrapper around a value. All states, properties, contexts, and injections in components are implemented through signals.

**Type:**
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

**Examples:**
```typescript
const count = signal(0);
count();        // get value
count.set(1);   // set value
count.update(v => v + 1); // update via function
count.forceSet(1);

// Reactive usage
const doubled = signal(0);
effect(() => {
  doubled.set(count() * 2);
});

// Additional methods
count.setCompareFn((oldV, newV) => Math.abs(newV - oldV) >= 1); // custom comparison
count.peek();          // safe read without subscription
count.clearSubscribers(); // clear effect subscribers

// pipe — create a derived signal
const doubled2 = count.pipe(v => v * 2);
effect(() => console.log('x2:', doubled2()));
```

**When to use forceSet:**
- If you need to manually trigger subscriber updates, even if the signal value hasn't changed (e.g., for force-updating UI or side effects).

**Edge case:**
```typescript
const arr = signal([1,2,3]);
arr.update(a => [...a, 4]); // reactively adds element
```

### Effects
An effect is a function that automatically subscribes to all signals used inside it. Effects are used for side actions (logging, synchronization, event emission, etc.).

**Example:**
```typescript
effect(() => {
  console.log('Count:', count());
});
```

**Best practice:**
- Don't modify signals inside an effect unless required (to avoid infinite loops).

### Reactive Strings (rs)
Allows creating reactive strings based on signals and other values.

**Example:**
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
Allows creating a signal whose value is computed based on a function or async value. The difference from signal is support for async sources and automatic updates when dependencies change.

**Typing:**
```typescript
function createSignal<T extends Promise<any> | (() => any), I = ...>(cb: T, initializeValue?: I): ReactiveSignal<...>
```

**Main use cases:**

1. **To get a property from a signal:**
```typescript
const user = signal({ name: 'John', age: 30 });
const userName = createSignal(() => user().name);
// userName() returns 'John'
user.set({ name: 'Jane', age: 31 });
// userName() automatically updates and returns 'Jane'
```

2. **To compute a new value based on another signal:**
```typescript
const count = signal(0);
const doubled = createSignal(() => count() * 2);
count.set(5); // doubled() automatically updates and returns 10
```

3. **For working with async data:**
```typescript
const userId = signal(1);
const userData = createSignal(
  () => fetch(`/api/users/${userId()}`).then(r => r.json()),
  { name: '', loading: true } // initial value
);
```

**Examples from codebase:**
```typescript
// Converting numeric index to human-readable number
div({ classList: ['tab-header'] }, rs`current tab: ${createSignal(() => this.activeTab() + 1)}`);
```

**Best practice:**
- Use createSignal for computed values instead of effect+signal combination
- For async data, always specify an initial value (fallback)
- The function passed to createSignal should be pure (no side effects)

### Signal Utilities

RWC provides additional utilities for working with signals that simplify complex use cases.

#### bindReactiveSignals

Creates two-way binding between two reactive signals. Changes in one signal are automatically synchronized with the other.

```typescript
import { bindReactiveSignals, signal } from '@shared/utils';

const signalA = signal('Hello');
const signalB = signal('World');

// Create two-way binding
bindReactiveSignals(signalA, signalB);

signalA.set('Hello'); // signalB automatically becomes 'Hello'
signalB.set('World');    // signalA automatically becomes 'World'
```

#### forkJoin

Combines multiple signals into one that updates only when all source signals receive new values.

```typescript
import { forkJoin, signal } from '@shared/utils';

const name = signal('John');
const age = signal(25);
const city = signal('Moscow');

const userData = forkJoin(name, age, city);
// userData() returns ['John', 25, 'Moscow']

name.set('Jane');  // userData doesn't update
age.set(30);       // userData doesn't update  
city.set('SPB');   // userData updates to ['Jane', 30, 'SPB']
```

**Application:**
- Synchronizing related data
- Creating composite objects from multiple sources
- Waiting for all dependencies to update before executing actions

#### combineLatest

Combines multiple signals into one that updates whenever any of the source signals receives a new value. Unlike `forkJoin`, which waits for all signals to update, `combineLatest` immediately updates when any signal changes.

```typescript
import { combineLatest, signal } from '@shared/utils';

const name = signal('John');
const age = signal(25);
const city = signal('Moscow');

const userData = combineLatest(name, age, city);
// userData() returns ['John', 25, 'Moscow']

name.set('Jane');  // userData immediately updates to ['Jane', 25, 'Moscow']
age.set(30);       // userData immediately updates to ['Jane', 30, 'Moscow']
city.set('SPB');   // userData immediately updates to ['Jane', 30, 'SPB']
```

**Application:**
- Real-time synchronization of multiple data sources
- Creating reactive computed values from multiple signals
- Updating UI immediately when any dependency changes

**Differences between `forkJoin` and `combineLatest`:**
- **`forkJoin`** — waits for all signals to update before emitting a new value. Useful when you need all values to be updated together.
- **`combineLatest`** — emits a new value immediately when any signal changes. Useful for real-time updates and reactive computations.

  ### Function as Child Content (recommended style for dynamic lists and conditional render)

Functions passed as child content to `el` or `customEl` are automatically converted to reactive content. This allows convenient creation of dynamic content that will update when dependent signals change. The content function receives context (a reference to its component) as the first argument.

**Example: dynamic list with context**
```typescript
const items = signal(['Item 1', 'Item 2']);
div(
  ul(
    (self) => {
      console.log('self!!!', self); // self - component reference
      return items().map(item => li(item));
    }
  )
)
// When items changes, the entire list will be re-rendered
items.set(['Item 1', 'Item 2', 'Item 3']);
```

**Example: conditional render with context**
```typescript
div(
  (self) => {
    console.log('self!!!', self);
    return when(signal(true), () => button('test-when-signal'));
  }
)
```

**Best practice:**
- For dynamic rendering, use functions as child content instead of signalComponent
- For simple cases (text, attributes), use rs or other reactive primitives
- For complex lists with conditional logic, use functions as child content
- Use context (self) to access component properties and methods inside the content function

## Components

### Creating a Component

To declare a component, use classes with decorators. This provides strict typing, support for reactive props, events, providers, injections, and lifecycle hooks. 

**Inside a component, it's recommended to use element factory functions** (`div`, `button`, `input`, etc.) from the factory (`@shared/utils/html-fabric/fabric`). This ensures strict typing, autocomplete, and consistent code style. 


#### Example: Class Component with props and event

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

#### Brief on parameters:

- **@property** — a signal field that automatically syncs with an attribute.
- **@event** — an event field that emits custom events.
- **render** — a method that returns the component template.
- **@component** — registers a custom element with the given selector.

---

**Best practice:**
- All props/state/providers/injects — only signals (`ReactiveSignal<T>`)
- All events — only through `EventEmitter<T>`
- Use attributes to pass props

### Lifecycle

**Available hooks:**
- `onInit`, `onBeforeRender`, `onAfterRender`, `onConnected`, `onDisconnected`, `onAttributeChanged`

**Example:**
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

### Events

**Type:**
```typescript
interface EventEmitter<T> {
  (value: T | ReactiveSignal<T>): void; // can pass a signal — event will emit reactively
  oldValue: null;
}
```

**Example:**
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
                    // one-time emit with value
                    this.onCountChange(this.count());
                    // or reactive emit: on subsequent count changes, event will emit automatically
                    // this.onCountChange(this.count);
                }
            }
        }, rs`Count: ${this.count()}`);
    }
}
export const CounterComp = useCustomComponent(Counter);
```

### Context (providers/injects)

**Example:**
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
    theme = this.inject<string>(ThemeContext); // Get context signal once outside render
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

### Class Components and Decorators

RWC supports declarative component declaration using classes and TypeScript decorators. This allows using a familiar OOP approach, strict typing, and autocomplete.

#### Main Decorators

- `@component('component-name')` — registers a custom element with the given selector.
- `@property()` — marks a class field as a reactive property (based on signal). Automatically syncs with the eponymous attribute (kebab-case).
- `@event()` — marks a class field as an event (EventEmitter). Allows convenient event emission outward.

#### Class Component Example

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

#### How It Works

- All fields with `@property()` must be signals (`signal<T>()`). Changing the signal value automatically updates DOM and attributes.
- All fields with `@event()` must be created via `newEventEmitter<T>()`. Calling such a field emits a custom DOM event.
- The `render()` method returns the component template.
- The class must extend `BaseElement`.

#### Features

- Class and functional components can be used together.
- All reactivity and typing benefits are preserved.
- Decorators are implemented in `@shared/utils/html-decorators/html-property.ts` and exported through `@shared/utils/html-decorators`.

### Functional Components

RWC supports creating functional components using `createComponent`. This is an alternative approach to class components that may be more convenient for simple cases.

#### createComponent

Creates a functional component that accepts props and returns an element configuration.

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

// Usage
const count = signal(0);
const MyButton = Button({
  text: 'Increment',
  onClick: () => count.set(count() + 1),
  disabled: false
});
```

**Advantages of functional components:**
- Simpler syntax for simple cases
- Automatic support for `classList` and `reactiveClassList` via props
- Better performance for stateless components
- Convenience for creating reusable UI elements

**When to use:**
- Simple components without complex logic
- UI elements that only accept props
- Reusable components (buttons, inputs, cards)

## Elements and Templates

### HTML Element Factory

To create HTML elements, use factory functions (`div`, `button`, `input`, etc.) from `@shared/utils/html-fabric/fabric`. This ensures strict typing, autocomplete, and consistent style.

```typescript
import { div, button, ul, li, input, slot } from '@shared/utils/html-fabric/fabric';

// Examples:
div('Hello, world!')
div({ classList: ['container'] },
  button({ listeners: { click: onClick } }, "Click me"),
  ul(
    li('Item 1'),
    li('Item 2')
  )
)
```
- First argument — config object or content directly.
- All standard HTML tags are available through corresponding factories.

#### Element Configuration: ComponentInitConfig

To set properties, attributes, classes, events, and effects for elements and components, a special config object type is used — `ComponentInitConfig<T>`. It supports both standard and shorthand notation.

**Typing:**
```typescript
export type ComponentInitConfig<T extends ExtraHTMLElement> = Partial<{
  classList: ConfigClassList;
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

#### Main Features

- **classList** — array of classes (strings or functions/signals)
- **style** — CSS styles object; supports both regular properties and CSS Custom Properties (`--var`), values can be functions/signals
- **attributes** — object with HTML attributes
- **customAttributes** — object with custom attributes
- **reactiveClassList** — array of reactive classes
- **children** — child elements/content
- **effects** — array of effects (functions called when element is created)
- **listeners** — object with DOM event handlers
- **customListeners** — object with custom event handlers (e.g., `route-change`)

##### Shorthand Notation

- `.attributeName` — quick attribute/property assignment
- `@eventName` — quick event handler assignment (DOM or custom)
- `$` — quick effect assignment

---

#### Usage Examples

**1. Standard config**
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
}, 'Content')
```

**2. Shorthand notation**
```typescript
div({
  '.id': 'main',
  '.tabIndex': 0,
  '.class': 'container',
  '@click': (e) => console.log('clicked', e),
  '$': (el) => console.log('created', el)
}, 'Content')
```

**2.1. Styles (static / reactive / custom properties)**
```typescript
const primaryColor = signal('#0d6efd');
div({
  style: {
    color: 'white',
    backgroundColor: () => primaryColor(),
    '--gap': '8px',                // CSS Custom Property
    marginTop: () => '12px'        // reactive value
  }
}, 'Styles via config.style')
```

**3. Usage with components**
```typescript
MyComponentComp({
  '.count': countSignal, // reactive prop
  '@onCountChange': (value) => console.log('count changed', value)
})
```

**3.1. Custom events via customListeners**
```typescript
div({
  customListeners: {
    'route-change': (e, self) => {
      console.log('Route change:', e.detail);
    }
  }
})
```

**4. Reactive classes via classList**
```typescript
div(
  classList`static-class ${() => isActive() ? 'active' : ''}`,
  'Content'
)
```

**5. Reactive classes via reactiveClassList**
```typescript
const isRed = signal(false);
const isBold = signal(true);
div({
  reactiveClassList: {
    'red': isRed,
    'bold': isBold
  }
}, 'Text with reactive classes');
```

**6. Child elements**
```typescript
div(
  { classList: ['container'] },
  span('Text'),
  button('Click me')
)
```

---

**Best practice:**  
Use shorthand notation for brevity, and standard notation for complex cases or IDE autocomplete.

### Custom Components: useCustomComponent

To create and use custom components, use the `useCustomComponent` function from `@shared/utils/html-fabric/custom-fabric`.

**Recommended style 1:** Using the `@component` decorator
1. Declare the component class with the `@component` decorator.
2. Call `useCustomComponent` below the class, assign the result to a constant, and export it (the class itself doesn't need to be exported).

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

**Recommended style 2:** Passing selector directly to `useCustomComponent`
1. Declare the component class **without** the `@component` decorator.
2. Call `useCustomComponent` with the component class and selector as the second argument.

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

In the second approach, the `@component` decorator is called inside `useCustomComponent` when a selector is passed. This simplifies the component code.

**Usage in other components:**
```typescript
div(
  MyComponentComp({ attributes: { someProp: 'value' } },
    'Nested content'
  )
)
```

### Slot Templates

`slotTemplate` is a powerful mechanism for passing custom templates into a component. It's an analog of "render props" or "scoped slots" from other frameworks. It allows a child component to receive templates from a parent component and render them with slot-specific context passed.

This is useful when a component should manage logic but delegate rendering of part of its content to external code.

#### How It Works

1.  **In the component (template provider):**
    -   Define a `slotTemplate` property using `defineSlotTemplate<T>()`.
    -   `T` is a type describing available templates. Keys are template names, values are functions that will render the template. Arguments of these functions are the context passed from the component.
    -   In the `render` method, the component calls these templates, passing context to them.

2.  **When using the component (template consumer):**
    -   Call the `.setSlotTemplate()` method on the component instance.
    -   Pass an object with template implementations to `.setSlotTemplate()`.

#### Example

Let's say we have a list component that renders items, but we want to allow users of this component to customize how each item looks.

**1. Creating the component (`example-list.ts`)**

```typescript
// src/components/example-list.ts
import { BaseElement, component, defineSlotTemplate, div, getList, property, signal, useCustomComponent } from "@shared/utils";
import { ComponentConfig } from "@shared/types";

@component('example-list')
export class ExampleListComponent extends BaseElement {
    // Define available templates and their context
    public slotTemplate = defineSlotTemplate<{
        // Template for list item, receives the item itself in context
        item: (slotCtx: { id: number, name: string }) => ComponentConfig<any> | null,
        // Template for index, receives the number in context
        indexTemplate: (slotCtx: number) => ComponentConfig<any>
    }>()

    @property()
    items = signal<{ id: number, name: string }[]>([])

    render() {
        // Use getList for efficient rendering
        return div(getList(
            this.items,
            (item) => item.id,
            (item, index) => div(
                // Render 'item' template if provided, otherwise - standard view
                this.slotTemplate.item?.(item) || div(item.name),
                // Render 'indexTemplate' template if provided
                this.slotTemplate.indexTemplate?.(index) || div()
            )
        ));
    }
}
export const ExampleList = useCustomComponent(ExampleListComponent);
```

**2. Using the component**

```typescript
// src/components/app.ts
import { ExampleList } from './example-list';

const allItems = [
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' },
    { id: 3, name: 'Third' },
];

@component('my-app')
export class App extends BaseElement {
    render() {
        return div(
            ExampleList({ '.items': allItems })
                // Pass custom templates
                .setSlotTemplate({
                    // Custom render for item
                    item: (itemCtx) => div(`Item: ${itemCtx.name} (id: ${itemCtx.id})`),
                    // Custom render for even indices
                    indexTemplate: indexCtx => indexCtx % 2 === 0 
                        ? div(`Even index: ${indexCtx}`) 
                        : null,
                })
        );
    }
}
```

#### Key Points:

-   `defineSlotTemplate` creates a typed object for templates.
-   The `.setSlotTemplate()` method allows passing template implementations to the component.
-   Context (`slotCtx`) is passed from the component to the template function, providing flexibility.
-   You can define fallback rendering if a template wasn't provided, using `||`.

### Function as Child Content (Dynamic Lists and Conditional Render)

Functions passed as child content to factories (`div`, `ul`, etc.) are automatically converted to reactive content.

**Example: dynamic list**
```typescript
const items = signal(['Item 1', 'Item 2']);
div(
  ul(
    () => items().map(item => li(item))
  )
)
// When items changes, the entire list will be re-rendered
items.set(['Item 1', 'Item 2', 'Item 3']);
```

### Efficient List Rendering with getList

For performance optimization when working with lists, it's recommended to use the `getList` function. It allows efficiently updating only changed list elements instead of re-rendering the entire list.

**Signature:**
```typescript
getList<I extends Record<string, any>, K extends keyof I>(
  items: ReactiveSignal<I[]>,
  keyFn: (item: I) => I[K] | string,
  cb: (item: I, index: number, items: I[]) => ComponentConfig<any>
): ComponentConfig<HTMLDivElement>
```

**Parameters:**
- `items` - reactive signal with array of elements
- `keyFn` - function returning a unique key for each element (supports `string` or element field `I[K]`)
- `cb` - element rendering function, accepting the element, its index, and the entire current `items` array

**Usage example:**
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
            // Regular list rendering (re-renders entire list)
            div(() => this.items().map(item => div(item.name))),
            
            // Efficient rendering with getList (updates only changed elements)
            div(getList(
                this.items,
                (item) => item.id,  // key — item id
                (item, index, items) => div(`${index + 1}. ${item.name}`)  // index and entire array available
            ))
        )
    }
}
```

**Advantages of using getList:**
1. Optimized performance — only changed elements are updated
2. Preserving list element state
3. Efficient work with large lists
4. Automatic updates when data changes

**Implementation details:**
- Uses `data-key` to bind DOM nodes to data elements (key comes from `keyFn`).
- Each key has its own signal stored; changing the signal value forces update of the corresponding DOM node.
- Element changes are determined by comparison: `JSON.stringify(currItem) !== JSON.stringify(oldItems[index])`.
- Nodes whose keys are missing from the new list are removed from DOM, and their cache (signals/components/effects) is cleared.
- DOM node order is synchronized with key order in the current data array.
- Render effects are created once per key and cached in `currRegisteredEffects`.
- Effect initialization is deferred via `Promise.resolve().then(...)` for correct DOM insertion at the right position.
- Keys are normalized to string for consistent matching.

**Best practices:**
- Keys should be unique and stable between re-renders.
- Avoid deep/large objects if performance-sensitive: comparison via `JSON.stringify` can be expensive.
- Ensure immutable element updates so changes are detected correctly.
- If a specific order is needed, form it at the data level before rendering (e.g., sort the array before passing to `getList`).

**Best practice:**
- Always use unique keys for list elements
- Use `getList` for dynamic lists, especially with frequent updates
- For simple static lists, you can use a regular map

### Complex Component Example

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

### Conditional Rendering with when

For conditional rendering, use the `when` function from the factory. It supports both static and reactive conditions.

```typescript
import { when } from '@shared/utils/html-fabric/fabric';
import { div, span } from '@shared/utils/html-fabric/fabric';
import { signal } from '@shared/utils/html-elements/signal';

// Static condition
const isVisible = true;
div(
  when(isVisible,
    () => span('Shown'),
    () => span('Hidden')
  )
)

// Reactive condition
const isVisibleSignal = signal(true);
div(
  when(isVisibleSignal,
    () => span('Shown'),
    () => span('Hidden')
  )
)

// Conditional rendering with function
const items = signal(['Item 1', 'Item 2']);
div(
  when(
    () => items().length > 0,
    () => ul(
      ...items().map(item => li(item))
    ),
    () => div('No items')
  )
)
```

- `when` automatically determines condition type (boolean, signal, or function)
- Supports optional elseContent
- Use for any conditional rendering instead of manual if/ternary or deprecated rxRenderIf/renderIf
- Accepts functions of type `CompFuncContent` as rendering arguments (functions returning `ComponentContent` or array `ComponentContent[]`)

### Conditional Display with show

To control element visibility without removing them from DOM, use the `show` function. Unlike `when`, which completely adds/removes elements, `show` controls display via CSS `display` property.

```typescript
// Static condition
const isVisible = true;
div(
  show(isVisible, () => span('Content'))
)

// Reactive condition
const isVisibleSignal = signal(true);
div(
  show(isVisibleSignal, () => span('Reactive content'))
)

// Condition via function
const itemCount = signal(5);
div(
  show(() => itemCount() > 0, () => span('Items exist'))
)
```

**Differences between `when` and `show`:**

- **`when`** — completely removes/adds elements from DOM. More efficient for heavy components that are rarely shown.
- **`show`** — hides/shows elements via `display: none/contents`. More efficient for frequent visibility toggling, preserves element state.

**When to use `show`:**
- For frequent visibility toggling (e.g., dropdown menus, modals)
- When you need to preserve element state when hidden
- For simple show/hide cases without alternative content

## Recommendations and Best Practices

### Architectural Principles

1. **Separation of Concerns**: Use class components for complex logic, functional — for simple UI elements
2. **Reactivity**: All states should be signals for automatic UI updates
3. **Typing**: Use strict typing for all props, events, and contexts
4. **Performance**: Apply `getList` for large lists, `show` for frequent visibility toggles

### Usage Patterns

#### Component Composition
```typescript
// Good: composition of simple components
const UserCard = createComponent<UserProps>((props) => 
  div({ classList: ['user-card'] },
    UserAvatar({ src: props.avatar }),
    UserInfo({ name: props.name, email: props.email })
  )
);

// Bad: one large component with all logic
const ComplexUserCard = createComponent<AllProps>((props) => {
  // 200+ lines of code
});
```

#### State Management
```typescript
// Good: local state in component
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

// Good: global state via context
const ThemeContext = 'theme';
class ThemeProvider extends BaseElement {
  providers = { [ThemeContext]: signal('dark') };
}
```

## Examples

#### Inserting Unsafe HTML (unsafeHtml)
```typescript
// Render string as HTML. Use only for trusted content!
const html = signal('<b>bold</b> and <i>italic</i>');
div(
  unsafeHtml(html)
)

// static string
div(unsafeHtml('<span style="color:red">red</span>'))
```

### Basic Component with props and event
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

#### Dynamic List via Function as Child Content
```typescript
const items = signal(['Item 1', 'Item 2']);
div(
  () => ul(
    ...items().map(item => li(item))
  )
)
// When items changes, the entire list will be re-rendered
items.set(['Item 1', 'Item 2', 'Item 3']);
```

#### Reactive Array Display
```typescript
const items = signal(['A', 'B', 'C']);
div(() => items().join(','));
```

#### Example: Tab Header
```typescript
div({ classList: ['tab-header'] }, rs`current tab: ${createSignal(() => this.activeTab() + 1)}`)
```

#### Example: Component with props
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

#### Example: Component with Logging
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

#### Example: Button with Signal
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

#### Example: Slot
```typescript
div(slot({ attributes: { name: 'tab-item' } }))
```

#### Example: Using Context
```typescript
class ThemeConsumer extends BaseElement {
  theme = this.inject<string>(ThemeContext); // Get context signal once outside render
  render() {
    return div(rs`Theme: ${this.theme}`);
  }
}
export const ThemeConsumerComp = useCustomComponent(ThemeConsumer);
```

#### Example: Nested Components
```typescript
div(
  ThemeProviderComp(
    ThemeConsumerComp()
  )
)
```

#### Example: Functional Component
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
  }, () => `Counter: ${count()}`);
});

// Usage
const MyCounter = Counter({
  initialValue: 10,
  step: 5
});
```

#### Example: Working with Signal Utilities
```typescript
import { bindReactiveSignals, forkJoin, combineLatest, signal } from '@shared/utils';

// Two-way binding
const inputValue = signal('');
const displayValue = signal('');
bindReactiveSignals(inputValue, displayValue);

// Combining signals with forkJoin (waits for all to update)
const name = signal('John');
const age = signal(25);
const userInfo = forkJoin(name, age);
// userInfo() returns ['John', 25] only when both signals update

// Combining signals with combineLatest (updates on any change)
const firstName = signal('John');
const lastName = signal('Doe');
const fullName = combineLatest(firstName, lastName);
// fullName() returns ['John', 'Doe'] and updates immediately when either signal changes
firstName.set('Jane'); // fullName() immediately becomes ['Jane', 'Doe']
```

#### Example: Event Handling
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

### Additional Utilities

#### Using the `classList` Function

For convenient assignment of dynamic and static classes in element config, you can use the `classList` function. It allows combining string values and functions (e.g., signals) that return a class string. This is especially useful for reactive class management.

**Signature:**
```typescript
classList(strings: TemplateStringsArray, ...args: (() => string)[]): { classList: (string | (() => string))[] }
```

**Example of static and dynamic classes:**
```typescript
const isActive = signal(false);
div(
  classList`my-static-class ${() => isActive() ? 'active' : ''}`,
  'Content'
)
// When isActive changes, the 'active' class will be added or removed automatically
```

**Additionally:**
- As a function inside `classList`, you can pass a **signal** that returns a class string:

```typescript
const dynamicClass = signal('my-dynamic-class');
div(
  classList`static-class ${dynamicClass}`,
  'Content'
)
// When dynamicClass changes, the class will automatically update
```

- You can also pass a **function that returns a signal**:

```typescript
const getClassSignal = () => someSignal;
div(
  classList`test-class ${getClassSignal}`,
  'Content'
)
// The class will reactively change when the signal value returned by the function changes
```


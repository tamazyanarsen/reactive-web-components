# Reactive Web Components: Reactivity Without a Framework

A couple of years ago, I faced a problem that's probably familiar to many: I needed to build a component system, but React seemed overkill, Vue required build setup, and vanilla JavaScript was starting to turn into an unreadable mess of addEventListener and innerHTML.

So I wrote my own library — **Reactive Web Components (RWC)**. Not because I wanted to reinvent the wheel, but because I needed a tool that provides reactivity without extra overhead while working with native Web Components. That means components can be used anywhere — in a React app, or in an old jQuery project.

## What It Is

RWC is not a framework. It's simply a set of utilities that add reactivity to regular web components. At its core is a signal system (similar to Solid.js or Preact Signals), but tailored for Web Components.

The idea is extremely simple: state is signals, components are classes with decorators, rendering is through factory functions. Everything is wrapped in TypeScript, so autocomplete works without any hassle.

## Why Signals Aren't Just a Trend

Everyone is talking about reactive signals these days. Solid.js, Qwik, even Vue 3 have moved to them. But why?

Imagine: you have a counter. In React you'd write:

```tsx
const [count, setCount] = useState(0);
```

When `count` changes, the entire component and all its children will re-render (unless you optimized with `useMemo` and `React.memo`). In RWC:

```typescript
const count = signal(0);
```

Changing `count` will update only those DOM nodes that directly depend on this signal. No virtual DOM, no diffing, no memoization. Just pure signals and their dependencies.

All reactivity is built on signals. A signal is a function that returns a value and remembers who called it. Sounds simple, but that's the whole magic.

```typescript
import { signal } from '@shared/utils';

const count = signal(0);
count();        // read: 0
count.set(10);  // set
count.update(v => v + 1); // or via function
```

When you call a signal inside an effect or component, the library automatically subscribes to changes. Update the signal — all subscribers recalculate. No manual subscriptions, no `useEffect` with dependencies you might forget to update.

In RWC, all state is signals. Component properties are signals. Context is signals. This creates a unified system where updates happen with surgical precision.

```typescript
import { signal, effect } from '@shared/utils';

const name = signal('John');
const surname = signal('Doe');

effect(() => {
  console.log(`Full name: ${name()} ${surname()}`);
});

name.set('Jane'); // automatically outputs "Full name: Jane Doe"
```

For computed values, there's `createSignal` — it tracks dependencies automatically:

```typescript
const price = signal(100);
const quantity = signal(2);
const total = createSignal(() => price() * quantity());
// total() is always up-to-date, updates automatically
```

And for strings — `rs` (reactive string), works like a template literal, but reactively:

```typescript
const user = signal('Anna');
const greeting = rs`Hello, ${user}!`;
// greeting() updates automatically
```

## Components: Two Approaches

RWC supports both approaches — class-based and functional. Different styles are convenient in different situations.

### Class-Based Approach — For Complex Logic

Components are regular classes extending `BaseElement`. Reactive properties and events are marked with decorators:

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
      }, rs`Count: ${this.count()}`)
    );
  }
}

export const CounterComp = useCustomComponent(Counter);
```

`@property()` makes a field reactive and syncs it with an HTML attribute. `@event()` creates a custom event. TypeScript types everything, so typos are caught at compile time.

### Functional Approach — For Simplicity

For simple presentational components, the functional style is more convenient:

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

Functional components are lighter, easier to test, and compose well. Ideal for UI elements without complex logic.

## Element Factory: Simplicity Without Compromises

Instead of `document.createElement` and manual attribute handling, factory functions are used. This is similar to Solid.js, but with an important difference: **no JSX**. Instead — factory functions (`div`, `button`) that provide strict typing and autocomplete without needing Babel or TypeScript transformations.

This is a deliberate choice. When working on large projects, typing attributes, events, and CSS classes saves hours of debugging. And the absence of a preprocessor simplifies build setup.

```typescript
import { div, button, input, signal } from '@shared/utils';

const count = signal(0);

// Create a derived signal
const doubled = count.pipe(v => v * 2);

// Rendering
div(
  button({ 
    '@click': () => count.update(v => v + 1) 
  }, 'Increment'),
  rs`Counter: ${count()} (doubled: ${doubled()})`
)
```

There's a shorthand notation: `.attribute` for properties, `@event` for handlers. Code becomes more compact without losing readability.

## Reactive Lists

For lists, there's `getList` — it updates only the elements that actually changed. Doesn't re-render the entire list, but updates the DOM precisely:

```typescript
import { getList } from '@shared/utils';

@component('item-list')
class ItemList extends BaseElement {
  items = signal([
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' }
  ]);

  render() {
    return div(
      getList(
        this.items,
        (item) => item.id, // key for tracking
        (item, index) => div(`${index + 1}. ${item.name}`)
      )
    );
  }
}
```

`getList` compares elements by key and touches only the changed ones. For large lists, this is critical — without it, the UI starts to lag.

Imagine a table with a thousand rows, where each cell reacts to changes. In traditional frameworks, this is an optimization nightmare. In RWC — a standard scenario. When prices change for several items, RWC will update only the corresponding DOM nodes. No re-render of the entire table.

## Conditional Rendering

There are two options: `when` and `show`. The first completely removes/adds elements from the DOM, the second simply hides via CSS:

```typescript
import { when, show } from '@shared/utils/html-fabric/fabric';

const isVisible = signal(true);

// Complete removal from DOM
div(
  when(isVisible, 
    () => div('Visible'),
    () => div('Hidden')
  )
);

// Simple hiding
div(
  show(isVisible, () => div('Content'))
);
```

`when` — for heavy components that are rarely shown (saves memory). `show` — for frequent toggles when you need to preserve state (e.g., a form with validation).

## Context and Providers

For passing data down the component tree — providers and injections. Works like Context API in React, but through signals, so everything is reactive:

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
    return div(rs`Theme: ${this.theme()}`);
  }
}
```

Change the theme in the provider — all consumers update automatically. No prop drilling, no extra code.

## Slot Templates

For flexible composition, there are slot templates — an analog of render props or scoped slots from Vue:

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

// Usage
DataListComp()
  .setSlotTemplate({
    item: (ctx) => div(`Item: ${ctx.name} (id: ${ctx.id})`)
  })
```

The component manages logic, while rendering is delegated outward. Convenient for library components where you need to give users control over appearance.

## Why This Isn't Just Another Flash-in-the-Pan Framework

I understand your skepticism. Over the past few years, dozens of "revolutionary" UI libraries have appeared. How is RWC different?

**1. Minimal API surface.** Everything is built around 3-4 basic primitives: `signal`, `createSignal`, `effect`, `pipe`. No dozens of hooks and magical rules.

**2. No virtual DOM.** RWC works directly with the DOM, updating only changed nodes. This provides predictable performance without slowdowns as the app grows.

**3. Standards compatibility.** Components are real Web Components. They can be used in any project, even without a build. Just `<my-component></my-component>` and it works.

**4. No runtime bundle overhead.** In production, the library weighs less than 15KB gzipped (for comparison: React + ReactDOM is about 45KB), because many utilities are dropped by TypeScript during compilation.

**React/Vue**: no virtual DOM, no runtime overhead. Components can be inserted into a jQuery project or a React application.

**Lit**: [Lit](https://lit.dev/docs/) — a popular library for web components, weighs about 5KB. In Lit, reactive properties (marked with `@state` or `@property`) automatically trigger re-renders when changed. The main difference between RWC and Lit is a unified signal system for all state.

In Lit, for computed values or complex logic, you either need to create getters or manually call `requestUpdate()`:
```typescript
// Lit
@state() private count = 0;
private doubled = 0;

increment() {
  this.count++;
  this.doubled = this.count * 2; // need to manually update
  this.requestUpdate(); // if doubled is not a reactive property
}
```

In RWC, computed values are simply signals that update automatically:
```typescript
// RWC
count = signal(0);
doubled = createSignal(() => this.count() * 2); // updates automatically

increment() {
  this.count.update(v => v + 1); // doubled will update automatically
}
```

Also, RWC uses factory functions instead of tagged template literals — this provides strict typing of attributes and events without needing preprocessors. In Lit, templates are written via `html\`...\``, in RWC — via `div(...)`, which provides IDE autocomplete and type checking at compile time.

**Stencil**: a compiler that generates web components. Has its own reactivity system, but requires compilation. RWC works without compilation, using runtime reactivity through signals.

## Debugging Without Magic

One of the most common questions: "How do you debug reactive dependencies?" In RWC, everything is transparent.

No hidden updates. In DevTools, you can see which signals affect which DOM nodes. No need to rack your brain about why changing one field re-renders half the page. Everything is explicit, everything can be tracked.

## Practical Example: Live Search

Let's put it all together. Here's a search component with debounce and loading:

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

  // Debounce for requests
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
    // Reactively track query changes
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
        '.placeholder': 'Search...'
      }),
      
      // Show loader
      when(() => this.isLoading(), () => div('Loading...')),
      
      // Results
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

Notice: no `useEffect`, `useState`, `useRef`. Just signals and their transformations. Error handling is built into the logic. Conditional logic is expressive without unnecessary nesting. Everything works reactively — change `query`, and search starts automatically.

## When to Use

RWC is suitable if you need:
- To create reusable components that work everywhere (even in legacy projects)
- Reactivity without a heavy framework
- Strict typing and autocomplete
- Control over performance (no virtual DOM, precise updates)

Not suitable if:
- You need a huge ecosystem of ready-made components (like React with Material-UI)
- The team doesn't know TypeScript (though you can use it without, you lose half the benefits)
- The project is already on another framework and there's no plan to rewrite (though components can be used there too)

## Why This Works

After working with large frameworks, you start to notice that half your time is spent fighting abstractions. Virtual DOM, complex lifecycle systems, compiler magic... RWC is an attempt to return to basics, but with modern capabilities.

Code becomes declarative, but without magic. Everything is transparent, everything can be debugged in DevTools. No hidden updates, no unexpected re-renders. Change a signal — only what depends on it updates.

And most importantly — components work everywhere Web Components are supported (which is almost everywhere). You can gradually migrate old projects, adding components one by one. Or use it in new projects from scratch.

## Conclusion

I'm not calling for everyone to abandon React/Lit and switch to RWC. Each tool has its own area of application. But if you're facing performance issues in complex interactive interfaces, if you're tired of fighting suboptimal re-renders — perhaps signals and fine-grained reactivity will give you what you've been missing.

RWC is not an attempt to reinvent everything. It's a careful combination of the best ideas from Solid.js (reactivity), Web Components (standards), and functional programming (pure transformations).

If you're interested in trying it — repository on GitHub, documentation in README. The library is actively developed, feedback is welcome. Especially interesting are use cases in real projects — write about how it works for you.

*P.S. If you find a bug — don't hesitate to open an issue.*


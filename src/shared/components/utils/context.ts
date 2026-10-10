import { derived, isSignal, signal, type MaybeSignal, type ReadonlySignal } from "../../signals";

const CONTEXT_KEY: unique symbol = Symbol("rwc.context");

/**
 * Ключ контекста. Тип значения живёт в ключе, поэтому provide и inject согласованы
 * на этапе компиляции, а имя нужно только для сообщений об ошибках.
 */
export type ContextKey<T> = {
  readonly [CONTEXT_KEY]: symbol;
  readonly name: string;
  readonly defaultValue: T;
};

/**
 * Объявляет ключ контекста:
 *
 *   export const ThemeKey = createContext<Theme>("theme", "light");
 *
 * Со значением по умолчанию inject всегда возвращает T. Без него в тип попадает
 * undefined — потребитель обязан этот случай обработать.
 */
export function createContext<T>(name: string, defaultValue: T): ContextKey<T>;
export function createContext<T>(name: string): ContextKey<T | undefined>;
export function createContext<T>(name: string, defaultValue?: T): ContextKey<T | undefined> {
  return { [CONTEXT_KEY]: Symbol(name), name, defaultValue };
}

/** Что раздаёт конкретный узел. WeakMap, чтобы не держать удалённые элементы. */
const providersOf = new WeakMap<Node, Map<symbol, ReadonlySignal<unknown>>>();

/**
 * Следующий узел вверх с учётом границы shadow: у теневого корня родителя нет,
 * подниматься надо к его хозяину — иначе контекст не пересекал бы компоненты.
 */
const parentOf = (node: Node): Node | null =>
  node instanceof ShadowRoot ? node.host : node.parentNode;

export const provideOn = <T>(node: Node, key: ContextKey<T>, value: MaybeSignal<T>) => {
  let provided = providersOf.get(node);
  if (!provided) {
    provided = new Map();
    providersOf.set(node, provided);
  }
  // Статику заворачиваем в сигнал: потребитель в любом случае получает источник,
  // и ему не нужно знать, меняется значение или нет.
  provided.set(key[CONTEXT_KEY], isSignal(value) ? value : signal(value));
};

const findProvider = <T>(node: Node, key: ContextKey<T>): ReadonlySignal<T> | null => {
  for (let current: Node | null = node; current; current = parentOf(current)) {
    const found = providersOf.get(current)?.get(key[CONTEXT_KEY]);
    if (found) return found as ReadonlySignal<T>;
  }
  return null;
};

/**
 * Ищет ближайшего провайдера вверх по дереву, начиная с самого узла.
 *
 * Поиск ленивый — на первом чтении, а не в момент inject(). Так контекст находится и
 * тогда, когда потребитель попал в DOM раньше, чем провайдер успел объявить значение.
 * Найденный сигнал запоминается: дальше связь работает напрямую, без обхода дерева.
 * Если компонент переедет к другому провайдеру, связь останется со старым.
 */
export const injectFrom = <T>(node: Node, key: ContextKey<T>): ReadonlySignal<T> => {
  let provider: ReadonlySignal<T> | null = null;
  let warned = false;

  return derived(() => {
    provider ??= findProvider(node, key);
    if (provider) return provider();

    if (!warned && key.defaultValue === undefined) {
      warned = true;
      console.warn(
        `[rwc] context "${key.name}" has no provider up the tree and no default value`,
        node,
      );
    }
    return key.defaultValue;
  });
};

import { ReactiveSignal, SignalUpdateFunc } from "../../types/signal";

// Хранит текущий активный эффект для автоматической подписки
let activeEffect: (() => void) | null = null;

export function signal<T = unknown>(initialValue: T): ReactiveSignal<T> {
  // Локальное состояние сигнала
  let value = initialValue;

  // Коллекция подписанных эффектов
  const subscribers = new Set<() => void>();

  // Основная функция сигнала (геттер)
  function result() {
    // Автоматическая подписка при чтении значения
    if (activeEffect) subscribers.add(activeEffect);
    return value;
  };

  // Сохранение предыдущего значения (для сравнений)
  result.oldValue = value;

  // Сеттер для обновления значения
  result.set = function (newValue: T) {
    // Оптимизация: пропуск одинаковых значений
    if (value === newValue) return;

    value = newValue;
    result.oldValue = value;

    // Триггеринг всех подписанных эффектов
    subscribers.forEach(fn => fn());
  }

  // Функциональное обновление
  result.update = function (cb: SignalUpdateFunc<T>) {
    result.set(cb(value))
  }

  return result;
};

export function effect(fn: () => void) {
  const oldEffect = activeEffect;
  // Обёртка для отслеживания зависимостей
  const execute = () => {
    // Установка текущего эффекта как активного
    activeEffect = execute;

    // Выполнение пользовательской логики
    fn();

    // Сброс активного эффекта
    activeEffect = oldEffect ?? null;
  };

  // Первичный запуск эффекта
  execute();
};


export const isReactiveSignal = <R extends ReactiveSignal<any>>(v: R | any): v is R => ['object', 'function'].includes(typeof v) && 'set' in v && 'oldValue' in v && 'update' in v

/**
 * Reactive String (rs). Создаёт зависимый string сигнал от источника.
 * @param strings
 * @param values
 * @returns
 *
 * @example
 * const source: ReactiveSignal<string> = signal('test')
 * const dependent: ReactiveSignal<string> = rs`abc-${source}`
 * console.log(dependent())
 * // log: "abc-test"
 */
export function rs<T extends ReactiveSignal<any> | any>(
  strings: TemplateStringsArray,
  ...values: T[]
): ReactiveSignal<string> {
  const newSignal = signal('');

  effect(() => {
    const newValues = values.map((v) =>
      isReactiveSignal(v) ? String(v()) : String(v)
    );
    const result = [strings[0]];
    newValues.forEach((value, i) => {
      result.push(value, strings[i + 1]);
    });
    newSignal.set(result.join(''));
  });
  return newSignal;
};

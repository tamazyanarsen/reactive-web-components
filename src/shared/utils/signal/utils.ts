import { effect, signal } from "./signal";
import { ReactiveSignal, UnwrapSignal } from "./signal.type";

/**
 * Универсальная функция для двустороннего связывания двух реактивных сигналов из rwc
 * @param signalA Первый сигнал
 * @param signalB Второй сигнал
 */
export function bindReactiveSignals<T>(
  signalA: ReactiveSignal<T>,
  signalB: ReactiveSignal<T>
): void {
  let prevA = signalA();
  let prevB = signalB();

  effect(() => {
    const valueA = signalA();
    const valueB = signalB();

    if (valueA !== valueB) {
      if (valueA !== prevA) {
        signalB.set(valueA);
      } else if (valueB !== prevB) {
        signalA.set(valueB);
      }
    }
    prevA = valueA;
    prevB = valueB;
  });
}

export function forkJoin<T extends readonly ReactiveSignal<unknown>[]>(
  ...signals: T
): ReactiveSignal<{ [K in keyof T]: UnwrapSignal<T[K]> }> {
  let newValues = signals.map((signal) => signal());
  const values = signal(newValues);

  signals.forEach((signal, index) => {
    effect(() => {
      const newValuesLength = (): number => newValues.filter((el) => el !== undefined).length;
      if (newValuesLength() === signals.length) {
        newValues = Array.from(newValues).fill(undefined);
      }
      newValues[index] = signal();
      if (newValuesLength() === signals.length) {
        values.set([...newValues]);
      }
    });
  });
  return values as ReactiveSignal<{ [K in keyof T]: UnwrapSignal<T[K]> }>;
}

export const combineLatest = <T extends readonly ReactiveSignal<any>[]>(
  ...signals: T
): ReactiveSignal<{ [K in keyof T]: UnwrapSignal<T[K]> }> => {
  const resSignal = signal<{ [K in keyof T]: UnwrapSignal<T[K]> }>([] as any);
  effect(() => {
    resSignal.set(signals.map(sig => sig()) as { [K in keyof T]: UnwrapSignal<T[K]> });
  })
  return resSignal
}
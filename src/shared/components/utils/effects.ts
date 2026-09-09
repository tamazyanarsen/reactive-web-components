import { batch, onCleanup, signal, type ReadonlySignal } from "../../signals";
import { hostEffect } from "./render-context";

/**
 * Вызывает cb на первое изменение источника — начальное значение пропускается,
 * после срабатывания эффект уничтожается.
 *
 *   firstUpdate(this.props.value, (value) => this.events.touched(value));
 *
 * Полезно, когда нужно отличить «пользователь что-то поменял» от «компонент только
 * что смонтировался со значением по умолчанию».
 */
export const firstUpdate = <T>(source: () => T, cb: (value: T) => void) => {
  let sawInitial = false;

  const effectCb = hostEffect(() => {
    const value = source();
    if (!sawInitial) {
      sawInitial = true;
      return;
    }
    // Уничтожаем до вызова cb: внутри cb может быть запись в тот же источник,
    // и повторно просыпаться уже незачем.
    effectCb.destroy();
    cb(value);
  });
};

export type Resource<T> = {
  /** Последний успешный ответ. undefined, пока первого ответа не было. */
  data: ReadonlySignal<T | undefined>;
  /** Причина отказа последнего запроса; сбрасывается при новом запросе. */
  error: ReadonlySignal<unknown>;
  /** Запрос выполняется прямо сейчас. */
  loading: ReadonlySignal<boolean>;
  /** Повторить запрос с теми же зависимостями. */
  refetch: () => void;
};

/**
 * Асинхронное значение с перезапросом по зависимостям:
 *
 *   const found = resource((abort) =>
 *     fetch(`/api?q=${query()}`, { signal: abort }).then((r) => r.json()),
 *   );
 *   // разметка: when(found.loading, ...), each(() => found.data() ?? [], ...)
 *
 * Сигналы, прочитанные внутри fetcher, становятся зависимостями: смена запроса
 * запускает новый запрос. Предыдущий при этом отменяется через AbortSignal, а его
 * ответ игнорируется — гонка «пришёл старый ответ поверх нового» исключена.
 *
 * Эффект принадлежит текущему компоненту: при отключении компонента запрос отменяется.
 */
export const resource = <T>(
  fetcher: (abort: AbortSignal) => T | Promise<T>,
  options?: { initialValue?: T },
): Resource<T> => {
  const data = signal<T | undefined>(options?.initialValue);
  const error = signal<unknown>(undefined);
  const loading = signal(false);
  /** Ручка для refetch: перезапускает эффект, не трогая зависимости fetcher. */
  const attempt = signal(0);

  hostEffect(() => {
    attempt();

    const controller = new AbortController();
    // Перезапуск эффекта и уничтожение компонента одинаково отменяют запрос.
    onCleanup(() => controller.abort());

    let result: T | Promise<T>;
    try {
      result = fetcher(controller.signal);
    } catch (reason) {
      batch(() => {
        error.set(reason);
        loading.set(false);
      });
      return;
    }

    // Синхронный fetcher — значит и ждать нечего: loading не мигает.
    if (!(result instanceof Promise)) {
      batch(() => {
        data.set(result as T);
        error.set(undefined);
        loading.set(false);
      });
      return;
    }

    batch(() => {
      loading.set(true);
      error.set(undefined);
    });

    result.then(
      (value) => {
        // Отменённый запрос мог успеть дойти до then — его ответ уже неактуален.
        if (controller.signal.aborted) return;
        batch(() => {
          data.set(value);
          loading.set(false);
        });
      },
      (reason) => {
        if (controller.signal.aborted) return;
        batch(() => {
          error.set(reason);
          loading.set(false);
        });
      },
    );
  });

  return {
    data,
    error,
    loading,
    refetch: () => attempt.update((n) => n + 1),
  };
};

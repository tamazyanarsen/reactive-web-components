import {
  batch,
  computed,
  signal,
  type AttrMap,
  type ElementOptions,
  type ReactiveSignal,
  type ReadonlySignal,
} from "@rwcjs/core";

/** Значения формы: плоский объект полей. */
export type FormValues = Record<string, unknown>;

/**
 * Проверка поля: строка — текст ошибки, null/undefined/"" — всё в порядке.
 * Вторым аргументом приходят все значения — для зависимых полей вроде «повторите пароль».
 */
export type Validator<V, T extends FormValues> = (value: V, values: T) => string | null | undefined;

export type FormOptions<T extends FormValues> = {
  /** Начальные значения. По ним выводятся имена и типы полей; к ним возвращает reset(). */
  initial: T;
  /** Проверки полей. Можно передать массив: показывается первая сработавшая ошибка. */
  validate?: { [K in keyof T]?: Validator<T[K], T> | Validator<T[K], T>[] };
  /**
   * Отправка. Вызывается, только если форма валидна. Пока промис не завершился,
   * submitting() — true, а повторная отправка игнорируется.
   */
  onSubmit?: (values: T) => void | Promise<void>;
};

export type Field<V> = {
  value: ReactiveSignal<V>;
  /** Ошибка проверки или выставленная через setErrors — независимо от того, трогали ли поле. */
  error: ReadonlySignal<string | null>;
  /**
   * Ошибка, которую уже пора показать: после ухода с поля или после попытки отправки.
   * Пока пользователь впервые вводит значение, ругаться на него рано.
   */
  visibleError: ReadonlySignal<string | null>;
  /** С поля уходили (blur) или пытались отправить форму. */
  touched: ReadonlySignal<boolean>;
  /** Значение отличается от начального. */
  dirty: ReadonlySignal<boolean>;
  /** Пометить поле тронутым вручную — например, для своего компонента без blur. */
  touch(): void;
};

/**
 * Конфиг связывания: значение, ввод, blur и атрибуты. Намеренно не привязан к типу
 * элемента — подходит и input, и textarea, и select.
 */
export type BindOptions = {
  ".value"?: () => string;
  ".checked"?: () => boolean;
  "@input"?: (event: Event) => void;
  "@change"?: (event: Event) => void;
  "@blur"?: (event: Event) => void;
  attrs?: AttrMap;
};

export type Form<T extends FormValues> = {
  field<K extends keyof T & string>(name: K): Field<T[K]>;
  /**
   * Связывает поле с элементом ввода:
   *
   *   input(form.bind("email", { attrs: { type: "email", placeholder: "почта" } }))
   *
   * Булево поле связывается через checked, число — через valueAsNumber, остальное — value.
   * Второй аргумент — ваш конфиг элемента: атрибуты сливаются, а обработчик того же
   * события вызывается вместе с обработчиком формы.
   */
  bind<K extends keyof T & string, X extends ElementOptions<HTMLElement> = {}>(name: K, extra?: X): BindOptions & X;
  values: ReadonlySignal<T>;
  errors: ReadonlySignal<Partial<Record<keyof T, string>>>;
  valid: ReadonlySignal<boolean>;
  dirty: ReadonlySignal<boolean>;
  submitting: ReadonlySignal<boolean>;
  /** Была ли попытка отправки — после неё ошибки видны у всех полей. */
  submitted: ReadonlySignal<boolean>;
  /**
   * Отправка: помечает все поля тронутыми, и если ошибок нет — вызывает onSubmit.
   * Принимает событие submit и отменяет его, так что годится прямо в "@submit".
   */
  submit(event?: Event): Promise<boolean>;
  /** Возврат к начальным значениям (или к новым, если передать). */
  reset(values?: Partial<T>): void;
  /** Ошибки от сервера. Ошибка поля держится, пока пользователь не изменит его значение. */
  setErrors(errors: Partial<Record<keyof T, string>>): void;
  /** Записать несколько значений разом. */
  setValues(values: Partial<T>): void;
};

/** Число из поля ввода; пустое поле — NaN, как у valueAsNumber. */
const readNumber = (element: HTMLInputElement) => {
  const parsed = element.valueAsNumber;
  if (!Number.isNaN(parsed)) return parsed;
  return element.value.trim() === "" ? Number.NaN : Number(element.value);
};

/** Сливает конфиг формы с пользовательским: attrs объединяются, обработчики — оба. */
const mergeOptions = <X extends ElementOptions<HTMLElement>>(own: BindOptions, extra: X | undefined): BindOptions & X => {
  if (!extra) return own as BindOptions & X;
  const merged: Record<string, unknown> = { ...own };
  for (const [key, value] of Object.entries(extra)) {
    const current = merged[key];
    if (key === "attrs" || key === "style") {
      merged[key] = { ...(current as object), ...(value as object) };
    } else if (key.startsWith("@") && typeof current === "function" && typeof value === "function") {
      merged[key] = (event: Event) => {
        (current as (event: Event) => void)(event);
        (value as (event: Event) => void)(event);
      };
    } else {
      merged[key] = value;
    }
  }
  return merged as BindOptions & X;
};

const toList = <F>(value: F | F[] | undefined): F[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

/**
 * Форма на сигналах:
 *
 *   const login = createForm({
 *     initial: { email: "", password: "", remember: false },
 *     validate: {
 *       email: (v) => (!v ? "укажите почту" : !v.includes("@") ? "нужен знак @" : null),
 *       password: (v) => (v.length < 8 ? "минимум 8 символов" : null),
 *     },
 *     onSubmit: (values) => api.login(values),
 *   });
 *
 *   form({ "@submit": login.submit },
 *     input(login.bind("email")),
 *     when(login.field("email").visibleError, () => span(login.field("email").visibleError)),
 *     input(login.bind("remember", { attrs: { type: "checkbox" } })),
 *     button({ ".disabled": login.submitting }, "Войти"),
 *   );
 *
 * Имена и типы полей выводятся из initial: login.bind("emial") — ошибка компиляции.
 */
export const createForm = <T extends FormValues>(options: FormOptions<T>): Form<T> => {
  let initial = { ...options.initial };
  const names = Object.keys(initial) as (keyof T & string)[];

  const values = Object.fromEntries(names.map((name) => [name, signal(initial[name])])) as {
    [K in keyof T]: ReactiveSignal<T[K]>;
  };
  const touched = Object.fromEntries(names.map((name) => [name, signal(false)])) as Record<
    keyof T,
    ReactiveSignal<boolean>
  >;
  const serverErrors = signal<Partial<Record<keyof T, string>>>({});
  const submitted = signal(false);
  const submitting = signal(false);

  const allValues = computed(
    () => Object.fromEntries(names.map((name) => [name, values[name]()])) as T,
  );

  const fieldError = (name: keyof T & string) =>
    computed(() => {
      const server = serverErrors()[name];
      if (server) return server;
      const current = allValues();
      for (const validator of toList(options.validate?.[name])) {
        const message = validator(current[name], current);
        if (message) return message;
      }
      return null;
    });

  const errorSignals = Object.fromEntries(names.map((name) => [name, fieldError(name)])) as Record<
    keyof T,
    ReadonlySignal<string | null>
  >;

  const errors = computed(() => {
    const result: Partial<Record<keyof T, string>> = {};
    for (const name of names) {
      const message = errorSignals[name]();
      if (message) result[name] = message;
    }
    return result;
  });

  const valid = computed(() => Object.keys(errors()).length === 0);
  const isDirty = (name: keyof T) => !Object.is(values[name](), initial[name]);
  const dirty = computed(() => names.some(isDirty));

  /** Ввод снимает серверную ошибку поля: пользователь её исправляет. */
  const write = <K extends keyof T>(name: K, value: T[K]) =>
    batch(() => {
      values[name].set(value);
      if (serverErrors.peek()[name]) {
        const { [name]: _removed, ...rest } = serverErrors.peek();
        serverErrors.set(rest as Partial<Record<keyof T, string>>);
      }
    });

  const fields = new Map<string, Field<unknown>>();

  const field = <K extends keyof T & string>(name: K): Field<T[K]> => {
    const cached = fields.get(name);
    if (cached) return cached as Field<T[K]>;
    if (!(name in values)) throw new Error(`[rwc/forms] unknown field "${name}"`);

    const isTouched = computed(() => touched[name]() || submitted());
    const created: Field<T[K]> = {
      value: values[name],
      error: errorSignals[name],
      visibleError: computed(() => (isTouched() ? errorSignals[name]() : null)),
      touched: isTouched,
      dirty: computed(() => isDirty(name)),
      touch: () => touched[name].set(true),
    };
    fields.set(name, created as Field<unknown>);
    return created;
  };

  const bind = <K extends keyof T & string, X extends ElementOptions<HTMLElement> = {}>(name: K, extra?: X): BindOptions & X =>
    mergeOptions(bindOwn(name), extra);

  const bindOwn = <K extends keyof T & string>(name: K): BindOptions => {
    const current = values[name];
    const kind = typeof initial[name];
    const own = field(name);
    const common = {
      "@blur": () => own.touch(),
      attrs: {
        name,
        "aria-invalid": () => (own.visibleError() ? "true" : null),
      },
    };

    if (kind === "boolean") {
      return {
        ...common,
        ".checked": () => current() as boolean,
        "@change": (event: Event) => write(name, (event.currentTarget as HTMLInputElement).checked as T[K]),
      } as BindOptions;
    }

    if (kind === "number") {
      return {
        ...common,
        ".value": () => {
          const value = current() as number;
          return Number.isNaN(value) ? "" : String(value);
        },
        "@input": (event: Event) => write(name, readNumber(event.currentTarget as HTMLInputElement) as T[K]),
      } as BindOptions;
    }

    return {
      ...common,
      ".value": () => String(current() ?? ""),
      "@input": (event: Event) => write(name, (event.currentTarget as HTMLInputElement).value as T[K]),
    } as BindOptions;
  };

  const submit = async (event?: Event) => {
    event?.preventDefault();
    if (submitting.peek()) return false;
    submitted.set(true);
    if (!valid.peek()) return false;
    if (!options.onSubmit) return true;

    submitting.set(true);
    try {
      await options.onSubmit(allValues.peek());
      return true;
    } finally {
      submitting.set(false);
    }
  };

  const reset = (next?: Partial<T>) => {
    if (next) initial = { ...initial, ...next };
    batch(() => {
      for (const name of names) {
        values[name].set(initial[name]);
        touched[name].set(false);
      }
      serverErrors.set({});
      submitted.set(false);
    });
  };

  const setValues = (next: Partial<T>) =>
    batch(() => {
      for (const [name, value] of Object.entries(next)) {
        if (name in values) write(name as keyof T, value as T[keyof T]);
      }
    });

  return {
    field,
    bind,
    values: allValues,
    errors,
    valid,
    dirty,
    submitting,
    submitted,
    submit,
    reset,
    setErrors: (next) => serverErrors.set({ ...next }),
    setValues,
  };
};

/** Готовые проверки для частых случаев. Сообщения передаются явно — язык выбирает приложение. */
export const validators = {
  required:
    (message: string) =>
    (value: unknown): string | null =>
      value === "" || value === null || value === undefined || value === false ? message : null,
  minLength:
    (length: number, message: string) =>
    (value: string): string | null =>
      value.length < length ? message : null,
  maxLength:
    (length: number, message: string) =>
    (value: string): string | null =>
      value.length > length ? message : null,
  pattern:
    (regexp: RegExp, message: string) =>
    (value: string): string | null =>
      value === "" || regexp.test(value) ? null : message,
  email: (message: string) => (value: string): string | null =>
    value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message,
  /** Совпадает с другим полем — «повторите пароль». */
  sameAs:
    <T extends FormValues>(other: keyof T, message: string) =>
    (value: unknown, values: T): string | null =>
      value === values[other] ? null : message,
};

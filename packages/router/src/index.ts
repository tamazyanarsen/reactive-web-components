import {
  a,
  computed,
  dynamic,
  hostEffect,
  signal,
  untracked,
  type ElementChild,
  type ElementOptions,
  type FlowContent,
  type ReadonlySignal,
} from "@rwcjs/core";

/**
 * Параметры из шаблона пути: "/users/:id/posts/:postId?" → { id: string; postId?: string }.
 * Хвост "*" попадает в параметр rest.
 */
export type ParamsOf<Path extends string> = Path extends `${infer Head}/${infer Tail}`
  ? SegmentParam<Head> & ParamsOf<Tail>
  : SegmentParam<Path>;

type SegmentParam<Segment extends string> = Segment extends `:${infer Name}?`
  ? { [K in Name]?: string }
  : Segment extends `:${infer Name}`
    ? { [K in Name]: string }
    : Segment extends "*"
      ? { rest: string }
      : {};

type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Что получает страница: параметры и строка запроса — сигналы, они меняются без пересоздания. */
export type RouteContext<Path extends string> = {
  params: ReadonlySignal<Simplify<ParamsOf<Path>>>;
  query: ReadonlySignal<URLSearchParams>;
};

export type RouteRender<Path extends string> = (context: RouteContext<Path>) => FlowContent;

export type Routes<R> = { [Path in keyof R & string]: RouteRender<Path> };

export type RouterOptions = {
  /**
   * "history" (по умолчанию) — обычные пути через History API;
   * "hash" — путь живёт после # и не требует настройки сервера.
   */
  mode?: "history" | "hash";
  /** Префикс приложения: "/app" — тогда маршрут "/users" живёт по адресу "/app/users". */
  base?: string;
  /** Начальный URL, когда window нет (серверный рендер) или он не нужен (тесты). */
  url?: string;
};

export type NavigateOptions = {
  /** Заменить запись истории вместо новой — для редиректов. */
  replace?: boolean;
};

export type LinkOptions = ElementOptions<HTMLAnchorElement> & {
  /** Путь внутри приложения, без base. */
  to: string;
  /** Класс, пока ссылка ведёт на текущий путь. По умолчанию "active". */
  activeClass?: string;
  /** Активна только при точном совпадении пути, а не при совпадении префикса. */
  exact?: boolean;
};

export type Router = {
  /** Текущий путь без base и без строки запроса. */
  path: ReadonlySignal<string>;
  query: ReadonlySignal<URLSearchParams>;
  /** Шаблон сработавшего маршрута ("/users/:id") или null. */
  route: ReadonlySignal<string | null>;
  /** Параметры сработавшего маршрута. */
  params: ReadonlySignal<Record<string, string>>;
  /** Переход внутри приложения: "/users/1?tab=posts". */
  navigate(to: string, options?: NavigateOptions): void;
  /** Место, где рендерится текущая страница. */
  view(): DocumentFragment;
  /** <a>, который переходит без перезагрузки и знает, активен ли он. */
  link(options: LinkOptions, ...children: ElementChild[]): HTMLAnchorElement;
  /** Снимает слушатели истории. Нужно только тестам и микрофронтендам. */
  dispose(): void;
};

type CompiledRoute = {
  pattern: string;
  /** Маршрут с хвостом "*" — запасной: проигрывает любому маршруту без него. */
  wildcard: boolean;
  /** Вес сегментов по порядку: статичный 3, параметр 2, необязательный 1, хвост 0. */
  ranks: number[];
  match(segments: string[]): Record<string, string> | null;
};

const splitPath = (path: string) => path.split("/").filter(Boolean);

/**
 * Порядок проверки: сначала маршруты без хвоста, затем посегментно — у кого раньше
 * сегмент сильнее, тот специфичнее (/users/new раньше /users/:id), при равенстве
 * длиннее раньше. Так "/" побеждает "*" на главной, а "/files/:id" — "/files/*".
 */
const compareRoutes = (left: CompiledRoute, right: CompiledRoute) => {
  if (left.wildcard !== right.wildcard) return left.wildcard ? 1 : -1;
  const length = Math.max(left.ranks.length, right.ranks.length);
  for (let i = 0; i < length; i++) {
    const diff = (right.ranks[i] ?? -1) - (left.ranks[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
};

const compileRoute = (pattern: string): CompiledRoute => {
  const parts = splitPath(pattern);
  const ranks = parts.map((part) =>
    part === "*" ? 0 : part.startsWith(":") ? (part.endsWith("?") ? 1 : 2) : 3,
  );

  return {
    pattern,
    wildcard: parts.includes("*"),
    ranks,
    match: (segments) => {
      const params: Record<string, string> = {};
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!;
        const segment = segments[i];

        if (part === "*") {
          params.rest = segments.slice(i).join("/");
          return params;
        }
        if (part.startsWith(":")) {
          const optional = part.endsWith("?");
          const name = part.slice(1, optional ? -1 : undefined);
          if (segment === undefined) {
            if (optional) continue;
            return null;
          }
          params[name] = decodeURIComponent(segment);
          continue;
        }
        if (segment !== part) return null;
      }
      return segments.length <= parts.length ? params : null;
    },
  };
};

const normalizeBase = (base = "") => {
  const trimmed = base.replace(/\/+$/, "");
  return trimmed && !trimmed.startsWith("/") ? `/${trimmed}` : trimmed;
};

const sameParams = (prev: Record<string, string>, next: Record<string, string>) => {
  const keys = Object.keys(prev);
  if (keys.length !== Object.keys(next).length) return false;
  return keys.every((key) => prev[key] === next[key]);
};

/**
 * Роутер на сигналах:
 *
 *   const router = createRouter({
 *     "/": () => home(),
 *     "/users/:id": ({ params }) => userPage({ ".id": () => params().id }),
 *     "*": () => notFound(),
 *   });
 *
 *   createRoot(() => document.body.append(div(nav(router.link({ to: "/" }, "Главная")), router.view())));
 *
 * Типы параметров выводятся из строки пути. Переход между /users/1 и /users/2 не
 * пересоздаёт страницу: сработал тот же маршрут, меняется только сигнал params.
 * Порядок маршрутов не важен — побеждает самый специфичный.
 */
export const createRouter = <R extends Record<string, unknown>>(
  routes: R & Routes<R>,
  options: RouterOptions = {},
): Router => {
  const mode = options.mode ?? "history";
  const base = normalizeBase(options.base);
  const hasWindow = typeof window !== "undefined" && options.url === undefined;

  const compiled = Object.keys(routes)
    .map(compileRoute)
    .sort(compareRoutes);

  /** Адрес внутри приложения: путь + строка запроса, без base. */
  const readLocation = (): string => {
    if (!hasWindow) return options.url ?? "/";
    if (mode === "hash") return window.location.hash.slice(1) || "/";
    const { pathname, search } = window.location;
    const inside = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
    return (inside || "/") + search;
  };

  const location = signal(readLocation());

  const path = computed(() => location().split("?")[0] || "/");
  const query = computed(() => new URLSearchParams(location().split("?")[1] ?? ""));

  const matched = computed(() => {
    const segments = splitPath(path());
    for (const route of compiled) {
      const params = route.match(segments);
      if (params) return { pattern: route.pattern, params };
    }
    return null;
  });

  const route = computed(() => matched()?.pattern ?? null);
  const params = computed(() => matched()?.params ?? {}, { equals: sameParams });

  const href = (to: string) => (mode === "hash" ? `#${to}` : `${base}${to}`);

  const navigate = (to: string, navigateOptions: NavigateOptions = {}) => {
    if (hasWindow) {
      const url = href(to);
      if (navigateOptions.replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    }
    location.set(to);
  };

  const onPopState = () => location.set(readLocation());
  if (hasWindow) {
    window.addEventListener("popstate", onPopState);
    if (mode === "hash") window.addEventListener("hashchange", onPopState);
  }

  const context: RouteContext<string> = { params, query } as RouteContext<string>;

  const view = () =>
    // Перестраиваемся только при смене маршрута; params и query страница читает сама.
    dynamic(() => {
      const pattern = route();
      if (pattern === null) return null;
      const render = (routes as Record<string, RouteRender<string>>)[pattern]!;
      return untracked(() => render(context));
    });

  const link = ({ to, activeClass = "active", exact = false, ...rest }: LinkOptions, ...children: ElementChild[]) => {
    const isActive = () => {
      const current = path();
      const target = to.split("?")[0] || "/";
      return exact || target === "/" ? current === target : current === target || current.startsWith(`${target}/`);
    };

    const userClick = rest["@click"] as ((event: MouseEvent) => void) | undefined;

    const element = a(
      {
        ...rest,
        attrs: { ...(rest.attrs ?? {}), href: href(to) },
        "@click": (event: MouseEvent) => {
          userClick?.(event);
          // Новая вкладка, скачивание и прочее, что пользователь просил явно, — браузеру.
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            (element.target && element.target !== "_self") ||
            element.hasAttribute("download")
          ) {
            return;
          }
          event.preventDefault();
          navigate(to);
        },
      } as ElementOptions<HTMLAnchorElement>,
      ...children,
    );

    // Класс активности отдельным эффектом, чтобы не спорить с class из rest.
    // Эффект принадлежит тому, кто вызвал link, — компоненту или createRoot.
    const tokens = activeClass.split(/\s+/).filter(Boolean);
    hostEffect(() => {
      const active = isActive();
      for (const token of tokens) element.classList.toggle(token, active);
      if (active) element.setAttribute("aria-current", "page");
      else element.removeAttribute("aria-current");
    });

    return element;
  };

  return {
    path,
    query,
    route,
    params,
    navigate,
    view,
    link,
    dispose: () => {
      if (!hasWindow) return;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onPopState);
    },
  };
};

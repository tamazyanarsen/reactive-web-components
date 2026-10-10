import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createRoot, div, span } from "@rwcjs/core";
import { createRouter, type ParamsOf, type Router } from "./index";

const routers: Router[] = [];
const containers: HTMLElement[] = [];

/** Монтирует view роутера в документ, как это сделало бы приложение. */
const mount = (router: Router, ...rest: Node[]) => {
  const container = createRoot(() => div(router.view(), ...rest));
  document.body.append(container);
  routers.push(router);
  containers.push(container);
  return container;
};

// У happy-dom по умолчанию about:blank — History API там не работает.
beforeAll(() => {
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL("http://localhost/");
});

afterEach(() => {
  for (const router of routers) router.dispose();
  for (const container of containers) container.remove();
  routers.length = 0;
  containers.length = 0;
  window.history.replaceState(null, "", "/");
});

describe("сопоставление", () => {
  test("статичный путь, параметры и хвост", () => {
    const router = createRouter(
      {
        "/": () => span("главная"),
        "/users/:id": ({ params }) => span(() => `пользователь ${params().id}`),
        "/files/*": ({ params }) => span(() => `файл ${params().rest}`),
      },
      { url: "/users/42" },
    );
    const container = mount(router);
    expect(container.textContent).toBe("пользователь 42");

    router.navigate("/files/a/b.txt");
    expect(container.textContent).toBe("файл a/b.txt");

    router.navigate("/");
    expect(container.textContent).toBe("главная");
  });

  test("побеждает самый специфичный маршрут, а не первый объявленный", () => {
    const router = createRouter(
      {
        "*": () => span("404"),
        "/users/:id": () => span("профиль"),
        "/users/new": () => span("новый"),
      },
      { url: "/users/new" },
    );
    expect(mount(router).textContent).toBe("новый");
    expect(router.route()).toBe("/users/new");
  });

  test("главная не уступает маршруту-заглушке *", () => {
    const router = createRouter({ "*": () => span("404"), "/": () => span("главная") }, { url: "/" });
    expect(mount(router).textContent).toBe("главная");
    router.navigate("/missing");
    expect(router.route()).toBe("*");
  });

  test("параметр сильнее хвоста, статичный сегмент — параметра", () => {
    const router = createRouter(
      { "/files/*": () => span("хвост"), "/files/:id": () => span("файл"), "/files/readme": () => span("readme") },
      { url: "/files/42" },
    );
    const container = mount(router);
    expect(container.textContent).toBe("файл");
    router.navigate("/files/readme");
    expect(container.textContent).toBe("readme");
    router.navigate("/files/a/b");
    expect(container.textContent).toBe("хвост");
  });

  test("необязательный параметр", () => {
    const router = createRouter(
      { "/posts/:page?": ({ params }) => span(() => params().page ?? "первая") },
      { url: "/posts" },
    );
    const container = mount(router);
    expect(container.textContent).toBe("первая");
    router.navigate("/posts/3");
    expect(container.textContent).toBe("3");
  });

  test("без совпадений ничего не рендерится", () => {
    const router = createRouter({ "/": () => span("главная") }, { url: "/nope" });
    expect(mount(router).textContent).toBe("");
    expect(router.route()).toBeNull();
  });

  test("параметры декодируются", () => {
    const router = createRouter({ "/tags/:tag": () => span() }, { url: "/tags/%D0%BA%D0%BE%D1%82" });
    mount(router);
    expect(router.params()).toEqual({ tag: "кот" });
  });

  test("строка запроса доступна отдельно от пути", () => {
    const router = createRouter({ "/search": ({ query }) => span(() => query().get("q") ?? "") }, { url: "/search?q=signals" });
    const container = mount(router);
    expect(router.path()).toBe("/search");
    expect(container.textContent).toBe("signals");
  });
});

describe("жизненный цикл страницы", () => {
  test("смена параметров не пересоздаёт страницу", () => {
    let renders = 0;
    const router = createRouter(
      {
        "/users/:id": ({ params }) => {
          renders++;
          return span(() => params().id);
        },
      },
      { url: "/users/1" },
    );
    const container = mount(router);
    const page = container.querySelector("span");

    router.navigate("/users/2");
    expect(renders).toBe(1);
    expect(container.querySelector("span")).toBe(page);
    expect(container.textContent).toBe("2");
  });

  test("смена маршрута пересоздаёт страницу", () => {
    let renders = 0;
    const router = createRouter(
      {
        "/a": () => {
          renders++;
          return span("a");
        },
        "/b": () => span("b"),
      },
      { url: "/a" },
    );
    const container = mount(router);
    router.navigate("/b");
    router.navigate("/a");
    expect(renders).toBe(2);
    expect(container.textContent).toBe("a");
  });
});

describe("история браузера", () => {
  test("navigate пишет в history, popstate возвращает назад", () => {
    const router = createRouter({ "/": () => span("главная"), "/about": () => span("о нас") });
    const container = mount(router);

    router.navigate("/about");
    expect(window.location.pathname).toBe("/about");
    expect(container.textContent).toBe("о нас");

    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(container.textContent).toBe("главная");
  });

  test("base: маршруты внутри префикса приложения", () => {
    window.history.replaceState(null, "", "/app/settings");
    const router = createRouter({ "/settings": () => span("настройки") }, { base: "/app" });
    expect(mount(router).textContent).toBe("настройки");

    router.navigate("/settings?tab=a");
    expect(window.location.pathname + window.location.search).toBe("/app/settings?tab=a");
  });

  test("hash-режим", () => {
    window.history.replaceState(null, "", "/#/inbox");
    const router = createRouter({ "/inbox": () => span("входящие"), "/sent": () => span("отправленные") }, { mode: "hash" });
    const container = mount(router);
    expect(container.textContent).toBe("входящие");

    router.navigate("/sent");
    expect(window.location.hash).toBe("#/sent");
    expect(container.textContent).toBe("отправленные");
  });
});

describe("link", () => {
  test("клик переходит без перезагрузки и подсвечивает активную ссылку", () => {
    const router = createRouter({ "/": () => span("главная"), "/docs": () => span("доки"), "/docs/:page": () => span("страница") }, { url: "/" });
    let home!: HTMLAnchorElement;
    let docs!: HTMLAnchorElement;
    const container = createRoot(() => {
      home = router.link({ to: "/" }, "Главная");
      docs = router.link({ to: "/docs" }, "Доки");
      return div(home, docs, router.view());
    });
    document.body.append(container);
    containers.push(container);

    expect(home.classList.contains("active")).toBe(true);
    expect(docs.getAttribute("href")).toBe("/docs");

    docs.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(router.path()).toBe("/docs");
    expect(docs.classList.contains("active")).toBe(true);
    expect(docs.getAttribute("aria-current")).toBe("page");
    // "/" активен только на самой главной.
    expect(home.classList.contains("active")).toBe(false);

    // Префикс: /docs остаётся активным на вложенной странице.
    router.navigate("/docs/intro");
    expect(docs.classList.contains("active")).toBe(true);
  });

  test("клик с модификатором отдаётся браузеру", () => {
    const router = createRouter({ "/": () => span(), "/x": () => span() }, { url: "/" });
    const link = createRoot(() => router.link({ to: "/x" }, "x"));
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(router.path()).toBe("/");
  });
});

// Проверки типов: компилируются — значит выводятся правильно.
type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export type TypeChecks = [
  Expect<Equal<ParamsOf<"/users/:id">, {} & { id: string }>>,
  Expect<Equal<keyof ParamsOf<"/a/:x/b/:y?">, "x" | "y">>,
  Expect<Equal<ParamsOf<"/files/*">["rest"], string>>,
];

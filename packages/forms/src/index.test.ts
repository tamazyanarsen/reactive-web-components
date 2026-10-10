import { afterEach, describe, expect, test } from "bun:test";
import { createRoot, input } from "@rwcjs/core";
import { createForm, validators } from "./index";

const mounted: HTMLElement[] = [];
const mount = <E extends HTMLElement>(build: () => E) => {
  const element = createRoot(build);
  document.body.append(element);
  mounted.push(element);
  return element;
};

afterEach(() => {
  for (const element of mounted) element.remove();
  mounted.length = 0;
});

const type = (element: HTMLInputElement, value: string) => {
  element.value = value;
  element.dispatchEvent(new Event("input"));
};

const loginForm = (onSubmit?: (values: { email: string; password: string; remember: boolean }) => void | Promise<void>) =>
  createForm({
    initial: { email: "", password: "", remember: false },
    validate: {
      email: [validators.required("укажите почту"), validators.email("нужна почта")],
      password: validators.minLength(8, "минимум 8 символов"),
    },
    onSubmit,
  });

describe("значения и проверки", () => {
  test("ошибки считаются по текущим значениям", () => {
    const form = loginForm();
    expect(form.errors()).toEqual({ email: "укажите почту", password: "минимум 8 символов" });
    expect(form.valid()).toBe(false);

    form.setValues({ email: "a@b.co", password: "12345678" });
    expect(form.errors()).toEqual({});
    expect(form.valid()).toBe(true);
  });

  test("первая сработавшая проверка из списка побеждает", () => {
    const form = loginForm();
    form.setValues({ email: "nope" });
    expect(form.field("email").error()).toBe("нужна почта");
  });

  test("ошибка видна только после ухода с поля или попытки отправки", async () => {
    const form = loginForm();
    const email = form.field("email");
    expect(email.error()).toBe("укажите почту");
    expect(email.visibleError()).toBeNull();

    email.touch();
    expect(email.visibleError()).toBe("укажите почту");

    const password = form.field("password");
    expect(password.visibleError()).toBeNull();
    await form.submit();
    expect(password.visibleError()).toBe("минимум 8 символов");
  });

  test("зависимое поле видит все значения", () => {
    const form = createForm({
      initial: { password: "", repeat: "" },
      validate: { repeat: validators.sameAs("password", "пароли не совпадают") },
    });
    form.setValues({ password: "secret", repeat: "secre" });
    expect(form.field("repeat").error()).toBe("пароли не совпадают");
    form.setValues({ repeat: "secret" });
    expect(form.field("repeat").error()).toBeNull();
  });

  test("dirty сравнивает с начальными значениями", () => {
    const form = loginForm();
    expect(form.dirty()).toBe(false);
    form.setValues({ email: "x" });
    expect(form.dirty()).toBe(true);
    expect(form.field("email").dirty()).toBe(true);
    expect(form.field("password").dirty()).toBe(false);
    form.setValues({ email: "" });
    expect(form.dirty()).toBe(false);
  });
});

describe("bind", () => {
  test("текстовое поле: значение в обе стороны, blur, aria-invalid", () => {
    const form = loginForm();
    const element = mount(() => input(form.bind("email")));

    expect(element.name).toBe("email");
    type(element, "ann@example.com");
    expect(form.values().email).toBe("ann@example.com");

    form.setValues({ email: "bob" });
    expect(element.value).toBe("bob");

    expect(element.hasAttribute("aria-invalid")).toBe(false);
    element.dispatchEvent(new Event("blur"));
    expect(element.getAttribute("aria-invalid")).toBe("true");
  });

  test("булево поле связывается через checked", () => {
    const form = loginForm();
    const element = mount(() => input(form.bind("remember", { attrs: { type: "checkbox" } })));

    element.checked = true;
    element.dispatchEvent(new Event("change"));
    expect(form.values().remember).toBe(true);

    form.reset();
    expect(element.checked).toBe(false);
  });

  test("числовое поле получает число", () => {
    const form = createForm({ initial: { age: 0 } });
    const element = mount(() => input(form.bind("age", { attrs: { type: "number" } })));
    type(element, "42");
    expect(form.values().age).toBe(42);
  });
});

test("bind сливает пользовательский конфиг", () => {
  const form = loginForm();
  let blurs = 0;
  const element = mount(() =>
    input(form.bind("email", { attrs: { placeholder: "почта" }, "@blur": () => blurs++ })),
  );
  expect(element.getAttribute("placeholder")).toBe("почта");
  expect(element.name).toBe("email");
  element.dispatchEvent(new Event("blur"));
  expect(blurs).toBe(1);
  expect(form.field("email").touched()).toBe(true);
});

describe("отправка", () => {
  test("невалидная форма не отправляется", async () => {
    let calls = 0;
    const form = loginForm(() => {
      calls++;
    });
    expect(await form.submit()).toBe(false);
    expect(calls).toBe(0);
    expect(form.submitted()).toBe(true);
  });

  test("submitting держится, пока идёт onSubmit, повторный вызов игнорируется", async () => {
    let release!: () => void;
    let calls = 0;
    const form = loginForm(() => {
      calls++;
      return new Promise<void>((resolve) => (release = resolve));
    });
    form.setValues({ email: "a@b.co", password: "12345678" });

    const first = form.submit();
    expect(form.submitting()).toBe(true);
    expect(await form.submit()).toBe(false);

    release();
    expect(await first).toBe(true);
    expect(form.submitting()).toBe(false);
    expect(calls).toBe(1);
  });

  test("submit отменяет событие формы", async () => {
    const form = loginForm();
    const event = new Event("submit", { cancelable: true });
    await form.submit(event);
    expect(event.defaultPrevented).toBe(true);
  });

  test("ошибка сервера держится, пока поле не изменят", () => {
    const form = loginForm();
    form.setValues({ email: "a@b.co", password: "12345678" });
    form.setErrors({ email: "почта уже занята" });
    expect(form.field("email").error()).toBe("почта уже занята");
    expect(form.valid()).toBe(false);

    form.setValues({ email: "c@d.co" });
    expect(form.field("email").error()).toBeNull();
  });

  test("reset возвращает значения, касания и попытку отправки", async () => {
    const form = loginForm();
    form.setValues({ email: "x" });
    await form.submit();
    form.reset();
    expect(form.values()).toEqual({ email: "", password: "", remember: false });
    expect(form.submitted()).toBe(false);
    expect(form.field("email").visibleError()).toBeNull();

    form.reset({ email: "new@default.io" });
    expect(form.values().email).toBe("new@default.io");
    expect(form.dirty()).toBe(false);
  });
});

describe("типы", () => {
  test("имя поля проверяется при компиляции", () => {
    const form = loginForm();
    // @ts-expect-error такого поля нет
    expect(() => form.field("emial")).toThrow(/unknown field/);
  });
});

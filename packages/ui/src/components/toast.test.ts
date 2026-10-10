import { afterEach, describe, expect, test } from "bun:test";
import { click, mount, registerFresh, shadow, tick } from "../test-utils";
import { dismissToast, registerToast, rwcToast, rwcToaster, toast, Toaster, type Toast } from "./toast";

// Тесты запускаются после загрузки модуля, то есть уже после регистрации, — поэтому
// поведение до неё снимаем здесь, прямо перед registerFresh.
const beforeRegister = (() => {
  try {
    toast("Привет");
    return null;
  } catch (error) {
    return error as Error;
  }
})();

const tag = registerFresh(registerToast);

test("toast() без регистрации бросает понятную ошибку", () => {
  expect(beforeRegister?.message).toContain("[rwc/ui]");
});

const toasters = () => [...document.querySelectorAll(Toaster.renderTagName!)] as Toaster[];
const toastsIn = (toaster: Toaster) => [...shadow(toaster).querySelectorAll(tag)] as Toast[];
const inner = (element: Toast) => shadow(element).querySelector(".toast") as HTMLElement;

afterEach(async () => {
  dismissToast();
  for (const toaster of toasters()) toaster.remove();
  await tick();
});

describe("rwc-toast", () => {
  test("роль зависит от варианта, заголовок и описание рендерятся", () => {
    const element = mount(rwcToast({ ".title": "Сохранено", ".description": "Файл на месте", ".duration": 0 }));
    expect(inner(element).getAttribute("role")).toBe("status");
    expect(shadow(element).querySelector(".title")!.textContent).toBe("Сохранено");
    expect(shadow(element).querySelector(".description")!.textContent).toBe("Файл на месте");

    element.variant = "danger";
    expect(inner(element).getAttribute("role")).toBe("alert");
    element.variant = "success";
    expect(inner(element).getAttribute("role")).toBe("status");
    element.variant = "warning";
    expect(inner(element).getAttribute("role")).toBe("alert");
  });

  test("dismiss по таймеру, а с duration=0 — никогда", async () => {
    let dismissed = 0;
    mount(rwcToast({ ".title": "a", ".duration": 20, "@dismiss": () => dismissed++ }));
    mount(rwcToast({ ".title": "b", ".duration": 0, "@dismiss": () => dismissed++ }));
    await tick(40);
    expect(dismissed).toBe(1);
  });

  test("наведение ставит таймер на паузу", async () => {
    let dismissed = 0;
    const element = mount(rwcToast({ ".title": "a", ".duration": 30, "@dismiss": () => dismissed++ }));
    inner(element).dispatchEvent(new MouseEvent("mouseenter"));
    await tick(50);
    expect(dismissed).toBe(0);

    inner(element).dispatchEvent(new MouseEvent("mouseleave"));
    await tick(50);
    expect(dismissed).toBe(1);
  });

  test("фокус внутри тоже держит паузу", async () => {
    let dismissed = 0;
    const element = mount(rwcToast({ ".title": "a", ".duration": 20, "@dismiss": () => dismissed++ }));
    inner(element).dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await tick(40);
    expect(dismissed).toBe(0);
    inner(element).dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await tick(40);
    expect(dismissed).toBe(1);
  });

  test("отключённое уведомление таймер не досчитывает", async () => {
    let dismissed = 0;
    const element = mount(rwcToast({ ".title": "a", ".duration": 20, "@dismiss": () => dismissed++ }));
    element.remove();
    await tick(40);
    expect(dismissed).toBe(0);
  });

  test("кнопка закрытия и действие отправляют dismiss", () => {
    let dismissed = 0;
    let acted = 0;
    const element = mount(
      rwcToast({
        ".title": "Удалено",
        ".duration": 0,
        ".action": { label: "Отменить", onClick: () => acted++ },
        "@dismiss": () => dismissed++,
      }),
    );
    const close = shadow(element).querySelector(".close")!;
    expect(close.getAttribute("aria-label")).toBe("Close");
    click(close);
    expect(dismissed).toBe(1);

    const action = shadow(element).querySelector(".action")!;
    expect(action.textContent).toBe("Отменить");
    click(action);
    expect(acted).toBe(1);
    expect(dismissed).toBe(2);
  });
});

describe("toast()", () => {
  test("без тостера на странице создаёт его в body под зарегистрированным тегом", () => {
    expect(toasters()).toHaveLength(0);
    toast("Привет");
    const [toaster] = toasters();
    expect(toaster).toBeDefined();
    expect(toaster!.parentElement).toBe(document.body);
    expect(toaster!.localName).toBe(Toaster.renderTagName!);

    const region = shadow(toaster!).querySelector('[role="region"]')!;
    expect(region.getAttribute("aria-label")).toBe("Notifications");
    expect(shadow(toaster!).querySelector('[aria-live="polite"]')).not.toBeNull();

    const [item] = toastsIn(toaster!);
    expect(shadow(item!).querySelector(".title")!.textContent).toBe("Привет");

    toast("Ещё");
    expect(toasters()).toHaveLength(1);
    expect(toastsIn(toaster!)).toHaveLength(2);
  });

  test("использует уже подключённый тостер с его placement", () => {
    const toaster = mount(rwcToaster({ ".placement": "top-center" }));
    expect(toaster.getAttribute("placement")).toBe("top-center");
    toast({ title: "Готово", variant: "success" });
    expect(toasters()).toHaveLength(1);
    const [item] = toastsIn(toaster);
    expect(item!.variant).toBe("success");
  });

  test("возвращает id, dismissToast(id) закрывает только его", () => {
    const toaster = mount(rwcToaster());
    const first = toast({ title: "1", duration: 0 });
    const second = toast({ title: "2", duration: 0 });
    expect(first).not.toBe(second);
    expect(toastsIn(toaster)).toHaveLength(2);

    dismissToast(first);
    const left = toastsIn(toaster);
    expect(left).toHaveLength(1);
    expect(shadow(left[0]!).querySelector(".title")!.textContent).toBe("2");
  });

  test("закрывается сам по истечении duration", async () => {
    const toaster = mount(rwcToaster());
    toast({ title: "Быстро", duration: 20 });
    toast({ title: "Навсегда", duration: 0 });
    expect(toastsIn(toaster)).toHaveLength(2);
    await tick(40);
    const left = toastsIn(toaster);
    expect(left).toHaveLength(1);
    expect(shadow(left[0]!).querySelector(".title")!.textContent).toBe("Навсегда");
  });

  test("кнопка закрытия убирает уведомление из тостера", () => {
    const toaster = mount(rwcToaster());
    toast({ title: "Закрой меня", duration: 0 });
    const [item] = toastsIn(toaster);
    click(shadow(item!).querySelector(".close")!);
    expect(toastsIn(toaster)).toHaveLength(0);
  });

  test("тот же id обновляет уведомление на месте", () => {
    const toaster = mount(rwcToaster());
    const id = toast({ title: "Загрузка…", duration: 0 });
    const [item] = toastsIn(toaster);
    toast({ id, title: "Загружено", variant: "success" });
    const after = toastsIn(toaster);
    expect(after).toHaveLength(1);
    expect(after[0]).toBe(item!);
    expect(shadow(item!).querySelector(".title")!.textContent).toBe("Загружено");
    expect(item!.getAttribute("variant")).toBe("success");
  });
});

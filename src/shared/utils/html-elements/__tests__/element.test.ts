import { jest } from "@jest/globals";
import { ComponentInitConfig } from "../../../types/element";
import { createEl, createElement, el, getSignalContent } from "../element";
import { signal } from "../../signal";

describe("createElement", () => {
  it("should create a basic HTML element", () => {
    const element = createElement("div");
    expect(element.hostElement).toBeInstanceOf(HTMLDivElement);
  });

  it("should create element with initial config", () => {
    const config: ComponentInitConfig<HTMLDivElement> = {
      classList: ["test-class"],
      attributes: {
        id: "test-id",
      },
    };

    const element = createElement("div", config);
    expect(element.hostElement.classList.contains("test-class")).toBe(true);
    expect(element.hostElement.id).toBe("test-id");
  });

  it("should create element with custom attributes", () => {
    const config: ComponentInitConfig<HTMLDivElement> = {
      customAttributes: {
        "data-custom": "custom-value",
      },
    };

    const element = createElement("div", config);
    expect(element.hostElement.getAttribute("data-custom")).toBe(
      "custom-value",
    );
  });

  it("should create element with reactive class list", () => {
    const mockSignal = signal(true);

    const config: ComponentInitConfig<HTMLDivElement> = {
      reactiveClassList: {
        active: mockSignal,
      },
    };

    const element = createElement("div", config);
    expect(element.hostElement.classList.contains("active")).toBe(true);
  });

  it("should update reactive class list when signal changes", () => {
    const mockSignal = signal(true);

    const config: ComponentInitConfig<HTMLDivElement> = {
      reactiveClassList: {
        active: mockSignal,
      },
    };

    const element = createElement("div", config);
    expect(element.hostElement.classList.contains("active")).toBe(true);

    mockSignal.set(false);
    expect(element.hostElement.classList.contains("active")).toBe(false);

    mockSignal.set(true);
    expect(element.hostElement.classList.contains("active")).toBe(true);
  });

  it("should handle multiple reactive classes", () => {
    const activeSignal = signal(true);
    const disabledSignal = signal(false);

    const config: ComponentInitConfig<HTMLDivElement> = {
      reactiveClassList: {
        active: activeSignal,
        disabled: disabledSignal,
      },
    };

    const element = createElement("div", config);
    expect(element.hostElement.classList.contains("active")).toBe(true);
    expect(element.hostElement.classList.contains("disabled")).toBe(false);

    activeSignal.set(false);
    disabledSignal.set(true);

    expect(element.hostElement.classList.contains("active")).toBe(false);
    expect(element.hostElement.classList.contains("disabled")).toBe(true);
  });

  it("should create element with event listeners", () => {
    const clickHandler = jest.fn();
    const config: ComponentInitConfig<HTMLButtonElement> = {
      listeners: {
        click: clickHandler,
      },
    };

    const element = createElement("button", config);
    element.hostElement.click();
    expect(clickHandler).toHaveBeenCalled();
  });

  it("should create element with children", () => {
    const childElement = createElement("span");
    const config: ComponentInitConfig<HTMLDivElement> = {
      children: [childElement],
    };

    const element = createElement("div", config);
    expect(element.hostElement.contains(childElement.hostElement)).toBe(true);
  });

  it("should create element with different tag names", () => {
    const divElement = createElement("div");
    const spanElement = createElement("span");
    const buttonElement = createElement("button");

    expect(divElement.hostElement).toBeInstanceOf(HTMLDivElement);
    expect(spanElement.hostElement).toBeInstanceOf(HTMLSpanElement);
    expect(buttonElement.hostElement).toBeInstanceOf(HTMLButtonElement);
  });

  it("should return ComponentConfig with all required methods", () => {
    const element = createElement("div");

    expect(element).toHaveProperty("append");
    expect(element).toHaveProperty("set");
    expect(element).toHaveProperty("removeChild");
    expect(element).toHaveProperty("addHtmlContent");
    expect(element).toHaveProperty("setHtmlContent");
    expect(element).toHaveProperty("addStyle");
    expect(element).toHaveProperty("addEventlistener");
    expect(element).toHaveProperty("setAttribute");
    expect(element).toHaveProperty("setCustomAttribute");
    expect(element).toHaveProperty("setReactiveAttribute");
    expect(element).toHaveProperty("setReactiveCustomAttribute");
    expect(element).toHaveProperty("removeAttribute");
    expect(element).toHaveProperty("handleSlotContext");
    expect(element).toHaveProperty("addClass");
    expect(element).toHaveProperty("setClass");
    expect(element).toHaveProperty("addReactiveClass");
    expect(element).toHaveProperty("removeClass");
    expect(element).toHaveProperty("replaceClass");
    expect(element).toHaveProperty("addEffect");
    expect(element).toHaveProperty("addReactiveContent");
    expect(element).toHaveProperty("setReactiveContent");
    expect(element).toHaveProperty("clear");
  });

  it("should handle empty config", () => {
    const element = createElement("div", {});
    expect(element.hostElement).toBeInstanceOf(HTMLDivElement);
  });

  it("should handle null config", () => {
    const element = createElement("div", null as any);
    expect(element.hostElement).toBeInstanceOf(HTMLDivElement);
  });

  it("should handle undefined config", () => {
    const element = createElement("div", undefined);
    expect(element.hostElement).toBeInstanceOf(HTMLDivElement);
  });
});

describe("createEl", () => {
  it("should create element with class names from tag string", () => {
    const element = createEl("div test-class another-class")();
    expect(element.hostElement.classList.contains("test-class")).toBe(true);
    expect(element.hostElement.classList.contains("another-class")).toBe(true);
  });

  it("should create element with config and class names", () => {
    const config: ComponentInitConfig<HTMLDivElement> = {
      attributes: {
        id: "test-id",
      },
    };
    const element = createEl("div test-class", config)();
    expect(element.hostElement.classList.contains("test-class")).toBe(true);
    expect(element.hostElement.id).toBe("test-id");
  });

  it("should append content to the element", () => {
    const element = createEl("div")("Hello", " World");
    expect(element.hostElement.textContent).toBe("Hello World");
  });

  it("should handle empty content", () => {
    const element = createEl("div")();
    expect(element.hostElement.childNodes.length).toBe(0);
  });
});

describe("el", () => {
  it("should create and return element with class names", () => {
    const element = el("div test-class");
    expect(element.hostElement.classList.contains("test-class")).toBe(true);
  });

  it("should create element with config and class names", () => {
    const config: ComponentInitConfig<HTMLDivElement> = {
      attributes: {
        id: "test-id",
      },
    };
    const element = el("div test-class", config);
    expect(element.hostElement.classList.contains("test-class")).toBe(true);
    expect(element.hostElement.id).toBe("test-id");
  });

  it("should return the same element when called multiple times", () => {
    const element1 = el("div");
    const element2 = element1();
    expect(element1).toBe(element2);
  });
});

describe("getSignalContent", () => {
  it("should create element with reactive content", () => {
    const mockSignal = signal("Hello");
    const element = getSignalContent(() => mockSignal());

    expect(element.hostElement.textContent).toBe("Hello");
  });

  it("should update content when signal changes", () => {
    const mockSignal = signal("Hello");
    const element = getSignalContent(() => mockSignal());

    expect(element.hostElement.textContent).toBe("Hello");

    mockSignal.set("World");
    expect(element.hostElement.textContent).toBe("World");
  });

  it("should handle array content", () => {
    const mockSignal = signal(["Hello", " World"]);
    const element = getSignalContent(() => mockSignal());

    expect(element.hostElement.textContent).toBe("Hello World");
  });

  it("should clear previous content when signal changes", () => {
    const mockSignal = signal("Hello");
    const element = getSignalContent(() => mockSignal());

    expect(element.hostElement.textContent).toBe("Hello");

    mockSignal.set("World");
    expect(element.hostElement.textContent).toBe("World");
    expect(element.hostElement.childNodes.length).toBe(1);
  });

  it("should handle multiple signals in callback", () => {
    const nameSignal = signal("John");
    const ageSignal = signal(25);
    const element = getSignalContent(() => `${nameSignal()} (${ageSignal()})`);

    expect(element.hostElement.textContent).toBe("John (25)");

    nameSignal.set("Jane");
    ageSignal.set(30);
    expect(element.hostElement.textContent).toBe("Jane (30)");
  });

  it("should handle conditional content", () => {
    const isVisible = signal(true);
    const element = getSignalContent(() => (isVisible() ? "Visible" : ""));

    expect(element.hostElement.textContent).toBe("Visible");

    isVisible.set(false);
    expect(element.hostElement.textContent).toBe("");
  });
});


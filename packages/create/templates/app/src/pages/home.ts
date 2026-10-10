import { computed, h1, p, section, signal } from "@rwcjs/core";
import { counter } from "../counter";

export const homePage = () => {
  const total = signal(1);
  const doubled = computed(() => total() * 2);

  return section(
    h1("Hello, rwc"),
    p("A web component with props, an event and its own styles:"),
    counter({ ".value": total, "@change": (event) => total.set(event.detail) }),
    p(() => `Twice the value: ${doubled()}`),
  );
};

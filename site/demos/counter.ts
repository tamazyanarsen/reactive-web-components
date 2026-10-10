import { button, css, defineComponent, div, p, payload, span, useCustomComponent, signal } from "@rwcjs/core";

class DemoCounter extends defineComponent({
  props: { value: 0, step: 1 },
  events: { change: payload<number>() },
  styles: css`
    :host { display: inline-flex; align-items: center; gap: 8px; font: inherit; }
    button { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--rwc-border); background: var(--rwc-surface); color: var(--rwc-text); cursor: pointer; font-size: 18px; }
    span { min-width: 3ch; text-align: center; font-variant-numeric: tabular-nums; }
  `,
}) {
  render() {
    const { value, step } = this.props;
    const shift = (direction: number) => {
      value.update((n) => n + direction * step());
      this.events.change(value.peek());
    };
    return [button({ "@click": () => shift(-1) }, "−"), span(value), button({ "@click": () => shift(1) }, "+")];
  }
}

const counter = useCustomComponent(DemoCounter, "demo-counter");

export default () => {
  const total = signal(3);
  return div(
    counter({ ".value": total, ".step": 1, "@change": (event) => total.set(event.detail) }),
    p(() => `Twice the value: ${total() * 2}`),
  );
};

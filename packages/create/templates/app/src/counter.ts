import { button, css, defineComponent, payload, span, useCustomComponent } from "@rwcjs/core";

/** A component with props, an event and its own styles: <x-counter value="3" step="2">. */
class Counter extends defineComponent({
  props: { value: 0, step: 1 },
  events: { change: payload<number>() },
  reflect: ["value"],
  styles: css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    button {
      width: 32px;
      height: 32px;
      font-size: 18px;
      cursor: pointer;
    }
    span {
      min-width: 3ch;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
  `,
}) {
  render() {
    const { value, step } = this.props;
    const shift = (direction: number) => {
      value.update((current) => current + direction * step());
      this.events.change(value.peek());
    };

    return [
      button({ "@click": () => shift(-1) }, "−"),
      span(value),
      button({ "@click": () => shift(1) }, "+"),
    ];
  }
}

export const counter = useCustomComponent(Counter, "x-counter");

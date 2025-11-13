import {
  BaseElement,
  button,
  classList,
  createSignal,
  div,
  event,
  input,
  newEventEmitter,
  property,
  rs,
  signal,
  useCustomComponent,
} from "@shared/utils";

class Counter extends BaseElement {
  @property()
  countState = signal(0);

  @event()
  countChange = newEventEmitter<number>();

  testProperty = createSignal(() => this.countState() * 10);

  position = signal<"top" | "bottom">("top");

  rootStyle = import("./counter.scss?inline");

  render() {
    this.countChange(this.countState);

    return div(
      classList`container ${() => "position-" + this.position()}, ${this.position}`,
      div(this.testProperty),
      div(this.countState),
      () => "test count: " + this.countState(),
      rs`test count: ${this.countState}`,
      () => button(this.countState().toString()),
      button(
        {
          "@click": () => {
            this.countState.update((e) => e + 1);
          },
        },
        "increment",
      ),
      button(
        { "@click": () => this.countState.update((e) => e - 1) },
        "decrement",
      ),
    );
  }
}

export const CounterComponent = useCustomComponent(Counter, "counter-element");

class TestInput extends BaseElement {
  @event()
  changeValue = newEventEmitter<string>();

  render() {
    return input({
      "@input": (_e, _self, host) => this.changeValue(host.value),
    });
  }
}
const InputComponent = useCustomComponent(TestInput, "test-input");

class TestCounter extends BaseElement {
  render() {
    return div(
      CounterComponent({
        ".countState": 100,
        "@countChange": console.log,
      }),
      InputComponent({
        "@changeValue": console.log,
      }),
    );
  }
}

export const TestComponent = useCustomComponent(TestCounter, "test-counter");

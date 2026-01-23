import {
  BaseElement,
  div,
  property,
  signal,
  useCustomComponent,
} from "@shared/utils";
import "./style.css";

// import { runAllBatchingTests } from "./test-components/test-batching";

// runAllBatchingTests();

export class TestComponent extends BaseElement {
  @property()
  testProperty = signal(true);

  render() {
    return div("test-component", () => this.testProperty() + "");
  }
}
const Test = useCustomComponent(TestComponent, "test-component");

useCustomComponent(
  class extends BaseElement {
    testSignal = signal(true);

    render() {
      setTimeout(() => {
        console.log("testSignal set to false");
        this.testSignal.set(false);
      }, 3000);
      return div(
        "wrapper",
        Test({
          ".testProperty": this.testSignal,
        }),
      );
    }
  },
  "test2-comp",
);

document.body.appendChild(document.createElement("test2-comp"));

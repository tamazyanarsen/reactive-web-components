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
    return div("test-component", this.testProperty() + "");
  }
}
const Test = useCustomComponent(TestComponent, "test-component");

useCustomComponent(
  class extends BaseElement {
    render() {
      return div(
        "wrapper",
        Test({
          ".testProperty": false,
        }),
      );
    }
  },
  "test2-comp",
);

document.body.appendChild(document.createElement("test2-comp"));

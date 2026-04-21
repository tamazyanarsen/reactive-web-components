import {
  BaseElement,
  cls,
  div,
  property,
  signal,
  slot,
  useCustomComponent,
} from "@shared/utils";
import "./style.css";

// import { runAllBatchingTests } from "./test-components/test-batching";

// runAllBatchingTests();

export class TestComponent extends BaseElement {
  @property()
  testProperty = signal(true);

  notProperty = signal(12);

  render() {
    return div(
      "test-component",
      // () => this.testProperty() + "",
      slot(),
    );
  }
}
const Test = useCustomComponent(TestComponent, "test-component");

const testSignal = signal(0);
setInterval(() => {
  testSignal.update((prev) => prev + 1);
}, 1000);

useCustomComponent(
  class extends BaseElement {
    testSignalInternal = signal(true);

    render() {
      setTimeout(() => {
        console.log("testSignal set to false");
        this.testSignalInternal.set(false);
      }, 3000);
      return div(
        "wrapper",
        Test({
          // ".testProperty": this.testSignalInternal,
        }).addEffect(() => console.log(testSignal())),
      );
    }
  },
  "test2-comp",
);

document.body.appendChild(document.createElement("test2-comp"));

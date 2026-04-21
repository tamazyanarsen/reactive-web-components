import {
  event,
  property,
} from "../../shared/utils/html-decorators/html-property";
import { BaseElement } from "../../shared/utils/html-elements/base-element";
import { classList } from "../../shared/utils/html-elements/element-helper";
import { signal } from "../../shared/utils/signal";
import { useCustomComponent } from "../../shared/utils/html-fabric/custom-fabric";
import { button, div, p } from "../../shared/utils/html-fabric/fabric";

// Example 1: Basic custom component
class CounterComponent extends BaseElement {
  @property()
  count = signal(0);

  @event()
  onCountChange = new Event("count-change");

  increment() {
    this.count.set(this.count() + 1);
    this.dispatchEvent(this.onCountChange);
  }

  render() {
    this.componentEffect(() => {});
    return div(
      classList`counter`,
      p(`Count: ${this.count()}`),
      button({ "@click": () => this.increment() }, "Increment"),
    );
  }
}

// Create a custom component instance with selector
export const Counter = useCustomComponent(CounterComponent, "example-counter");

// Example 2: Custom component with selector
class UserCardComponent extends BaseElement {
  @property()
  name = signal("");

  @property()
  age = signal(0);

  render() {
    return div(
      classList`user-card`,
      p(`Name: ${this.name()}`),
      p(`Age: ${this.age()}`),
    );
  }
}

// Create a custom component with a specific selector
export const UserCard = useCustomComponent(
  UserCardComponent,
  "custom-user-card",
);

// Example 3: Custom component with message
class SecretComponent extends BaseElement {
  @property()
  message = signal("");

  render() {
    return div(classList`secret`, p(`Secret message: ${this.message()}`));
  }
}

// Create a custom component
export const Secret = useCustomComponent(SecretComponent, "custom-secret");

// Example 4: Usage examples
export const Examples = () => {
  return div(
    // Basic counter usage
    Counter(classList`counter-wrapper`, p("This is a counter component")),

    // User card with properties
    UserCard(
      {
        ".name": "John Doe",
        ".age": 25,
      },
      p("This is a user card component"),
    ),

    // Secret component
    Secret(
      {
        ".message": "This is a secret message",
      },
      p("This is a secret component"),
    ),
  );
};

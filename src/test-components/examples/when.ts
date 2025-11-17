import { signal } from "../../shared";
import { when } from "../../shared/utils/html-elements/element";
import { button, div, h1, p } from "../../shared/utils/html-fabric/fabric";

// Example 1: Basic usage with static boolean
export const StaticWhenExample = () => {
  const isVisible = true;

  return div(
    h1("Static When Example"),
    ...when(
      isVisible,
      () => p("This content is visible because isVisible is true"),
      () => p("This content would be shown if isVisible was false"),
    ),
  );
};

// Example 2: Using with reactive signal
export const ReactiveWhenExample = () => {
  const isVisible = signal(false);

  const toggleVisibility = () => {
    isVisible.set(!isVisible());
  };

  return div(
    h1("Reactive When Example"),
    button({ "@click": toggleVisibility }, "Toggle Visibility"),
    ...when(
      isVisible,
      () => p("This content is visible because isVisible signal is true"),
      () => p("This content is shown when isVisible signal is false"),
    ),
  );
};

// Example 3: Using with function condition
export const FunctionWhenExample = () => {
  const count = signal(0);

  const increment = () => {
    count.set(count() + 1);
  };

  return div(
    h1("Function When Example"),
    p(`Current count: ${count()}`),
    button({ listeners: { click: increment } }, "Increment"),
    ...when(
      () => count() > 5,
      () => p("Count is greater than 5!"),
      () => p("Count is 5 or less"),
    ),
  );
};

// Example 4: Nested when conditions
export const NestedWhenExample = () => {
  const isLoggedIn = signal(false);
  const isAdmin = signal(false);

  const toggleLogin = () => {
    isLoggedIn.set(!isLoggedIn());
  };

  const toggleAdmin = () => {
    isAdmin.set(!isAdmin());
  };

  return div(
    h1("Nested When Example"),
    button({ listeners: { click: toggleLogin } }, "Toggle Login"),
    button({ listeners: { click: toggleAdmin } }, "Toggle Admin"),
    ...when(
      isLoggedIn,
      () =>
        when(
          isAdmin,
          () => p("Welcome, Admin!"),
          () => p("Welcome, User!"),
        ),
      () => p("Please log in"),
    ),
  );
};

// Example 5: Single ComponentContent return
export const SingleContentWhenExample = () => {
  const showContent = signal(true);

  const toggleContent = () => {
    showContent.set(!showContent());
  };

  return div(
    h1("Single Content When Example"),
    button({ "@click": toggleContent }, "Toggle Content"),
    ...when(
      showContent,
      () => p("This is a single component content"), // Returns single ComponentContent
      () => p("Alternative single component content"),
    ),
  );
};

// Example 6: Array of ComponentContent return
export const ArrayContentWhenExample = () => {
  const showContent = signal(true);

  const toggleContent = () => {
    showContent.set(!showContent());
  };

  return div(
    h1("Array Content When Example"),
    button({ "@click": toggleContent }, "Toggle Content"),
    ...when(
      showContent,
      () => [
        // Returns array of ComponentContent
        p("First paragraph in array"),
        p("Second paragraph in array"),
        div(p("Nested content in array")),
      ],
      () => [
        p("Alternative first paragraph"),
        p("Alternative second paragraph"),
      ],
    ),
  );
};

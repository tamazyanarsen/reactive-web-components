# @rwcjs/forms

Forms on signals for [`@rwcjs/core`](https://github.com/tamazyanarsen/reactive-web-components#readme).

- **Typed fields from the initial values.** `createForm({ initial: { email: "" } })`
  makes `form.bind("emial")` a compile error.
- **Errors appear at the right time.** A field's error becomes visible after the user
  leaves the field or tries to submit, not while they are still typing.
- **One-line input binding.** `input(form.bind("email"))` wires the value, input and
  blur events, `name` and `aria-invalid`. Booleans bind through `checked`, numbers
  through `valueAsNumber`.
- **Submit state and server errors.** `submitting()`, a guard against double submit,
  and `setErrors()` for errors from the server that clear when the user edits the field.

```bash
npm install @rwcjs/core @rwcjs/forms
```

## Usage

```ts
import { button, defineComponent, form, input, label, span, useCustomComponent, when } from "@rwcjs/core";
import { createForm, validators } from "@rwcjs/forms";

class SignUp extends defineComponent({ props: {} }) {
  render() {
    const signUp = createForm({
      initial: { email: "", password: "", repeat: "", terms: false },
      validate: {
        email: [validators.required("Enter your email"), validators.email("Not an email")],
        password: validators.minLength(8, "At least 8 characters"),
        repeat: validators.sameAs("password", "Passwords differ"),
        terms: validators.required("Accept the terms"),
      },
      onSubmit: async (values) => {
        const response = await fetch("/api/sign-up", { method: "POST", body: JSON.stringify(values) });
        if (response.status === 409) signUp.setErrors({ email: "Already registered" });
      },
    });

    const error = (name: "email" | "password" | "repeat" | "terms") => {
      const { visibleError } = signUp.field(name);
      return when(visibleError, () => span({ class: "error" }, visibleError));
    };

    return form(
      { "@submit": signUp.submit },
      label("Email", input(signUp.bind("email", { attrs: { type: "email" } }))),
      error("email"),
      label("Password", input(signUp.bind("password", { attrs: { type: "password" } }))),
      error("password"),
      label("Repeat", input(signUp.bind("repeat", { attrs: { type: "password" } }))),
      error("repeat"),
      label(input(signUp.bind("terms", { attrs: { type: "checkbox" } })), "I accept the terms"),
      error("terms"),
      button({ ".disabled": signUp.submitting, attrs: { type: "submit" } }, "Sign up"),
    );
  }
}

export const signUpForm = useCustomComponent(SignUp, "x-sign-up");
```

## API

### `createForm({ initial, validate?, onSubmit? })`

- `initial`: the starting values. Field names and types come from it, and `reset()`
  returns to it.
- `validate`: a validator or a list of validators per field. A validator receives the
  field value and all values, and returns an error message or `null`. In a list, the
  first error wins.
- `onSubmit(values)`: called only when the form is valid. While its promise is pending,
  `submitting()` is `true` and further submits are ignored.

### The form

| Member | What it is |
| --- | --- |
| `bind(name, extra?)` | Element config for `input`, `textarea` or `select`. `extra` is merged in: `attrs` are combined, and a handler for the same event runs together with the form's handler. |
| `field(name)` | `{ value, error, visibleError, touched, dirty, touch() }`. All are signals except `touch`. |
| `values()` | All values as one object. |
| `errors()` | `{ field: message }` for fields with errors. |
| `valid()`, `dirty()` | Whether there are no errors, and whether anything differs from `initial`. |
| `submitting()`, `submitted()` | Submit in progress, and whether a submit was attempted. |
| `submit(event?)` | Marks every field touched, validates, calls `onSubmit`. Prevents the event's default action, so it fits `"@submit"` directly. Resolves to whether `onSubmit` ran and succeeded. |
| `reset(values?)` | Back to `initial`, or to new defaults merged into it. Clears touched state, server errors and the submit attempt. |
| `setValues(values)` | Write several values at once. |
| `setErrors(errors)` | Errors from the server. Each one holds until its field changes. |

### `validators`

`required(message)`, `minLength(n, message)`, `maxLength(n, message)`,
`pattern(regexp, message)`, `email(message)`, `sameAs(otherField, message)`.
Messages are always passed explicitly, so the application picks the language.
`pattern` and `email` accept an empty value; combine them with `required` when the
field is mandatory.

## Notes

- `createForm` holds no effects, only signals and lazy `computed`, so it can live
  anywhere: in `render()`, in a module, or in a store shared by several components.
- For a custom field component, write to `field(name).value` and call `touch()` on blur.
  To take part in a native `<form>`, declare the component with `form: true` in
  `@rwcjs/core`.

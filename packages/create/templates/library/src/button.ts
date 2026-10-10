import { button, configCustomComponent, css, defineComponent, payload, slot } from "@rwcjs/core";

type Variant = "primary" | "secondary";

export class Button extends defineComponent({
  props: {
    /** Visual style. */
    variant: "secondary" as Variant,
    /** Disables the button. */
    disabled: false,
  },
  events: {
    /** Fired on click when the button is enabled. */
    press: payload<MouseEvent>(),
  },
  // Reflected props become host attributes, so :host([variant="primary"]) works.
  reflect: ["variant", "disabled"],
  styles: css`
    :host {
      display: inline-block;
    }
    button {
      font: inherit;
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #c7c7d1;
      background: white;
      color: #1f1f2e;
      cursor: pointer;
    }
    :host([variant="primary"]) button {
      background: #4f46e5;
      border-color: #4f46e5;
      color: white;
    }
    :host([disabled]) button {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
}) {
  render() {
    return button(
      {
        ".disabled": this.props.disabled,
        "@click": (event) => {
          if (!this.props.disabled()) this.events.press(event);
        },
      },
      slot(),
    );
  }
}

/**
 * The library declares components but does not register them: the app picks the moment
 * and, if needed, a postfix so two versions of the library can coexist on one page.
 */
export const [uiButton, registerButton] = configCustomComponent(Button, "ui-button");

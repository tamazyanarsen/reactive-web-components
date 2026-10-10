import { registerButton } from "./button";

export { Button, registerButton, uiButton } from "./button";

/** Registers every component of the library. Pass a postfix to run two versions side by side. */
export const registerAll = (options?: { postfix?: string }) => {
  registerButton(options);
};

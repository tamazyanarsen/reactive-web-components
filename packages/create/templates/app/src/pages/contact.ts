import { button, div, form, h1, input, label, p, section, span, textarea, when } from "@rwcjs/core";
import { createForm, validators } from "@rwcjs/forms";

export const contactPage = () => {
  const contact = createForm({
    initial: { email: "", message: "" },
    validate: {
      email: [validators.required("Enter your email"), validators.email("This is not an email")],
      message: validators.minLength(10, "At least 10 characters"),
    },
    onSubmit: async (values) => {
      // Call your API here.
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("sent", values);
      sent.textContent = `Thanks! We will reply to ${values.email}.`;
      contact.reset();
    },
  });

  const error = (name: "email" | "message") => {
    const { visibleError } = contact.field(name);
    return when(visibleError, () => span({ class: "error" }, visibleError));
  };

  const sent = p();

  return section(
    h1("Contact"),
    form(
      { "@submit": contact.submit },
      div({ class: "field" }, label("Email"), input(contact.bind("email", { attrs: { type: "email" } })), error("email")),
      div({ class: "field" }, label("Message"), textarea(contact.bind("message")), error("message")),
      button({ ".disabled": contact.submitting, attrs: { type: "submit" } }, () =>
        contact.submitting() ? "Sending…" : "Send",
      ),
    ),
    sent,
  );
};

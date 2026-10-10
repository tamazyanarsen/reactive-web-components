import { a, h1, p, section } from "@rwcjs/core";

export const aboutPage = () =>
  section(
    h1("About"),
    p(
      "Built with ",
      a({ attrs: { href: "https://github.com/tamazyanarsen/reactive-web-components" } }, "rwc"),
      ": reactive web components on signals, with typed tag factories instead of templates.",
    ),
  );

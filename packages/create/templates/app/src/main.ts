import { createRoot, div, nav } from "@rwcjs/core";
import { createRouter } from "@rwcjs/router";
import { aboutPage } from "./pages/about";
import { contactPage } from "./pages/contact";
import { homePage } from "./pages/home";

const router = createRouter({
  "/": () => homePage(),
  "/about": () => aboutPage(),
  "/contact": () => contactPage(),
  "*": () => div("Page not found"),
});

// createRoot owns the effects of the app: links, the view and everything inside.
const app = createRoot(() =>
  div(
    { class: "layout" },
    nav(
      router.link({ to: "/", exact: true }, "Home"),
      router.link({ to: "/about" }, "About"),
      router.link({ to: "/contact" }, "Contact"),
    ),
    router.view(),
  ),
);

document.getElementById("app")!.append(app);

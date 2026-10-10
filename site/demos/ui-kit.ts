// Витрина @rwcjs/ui: по примеру каждого компонента. Используется на странице кита
// и как ручная проверка в настоящем браузере — happy-dom не умеет showModal, Popover API
// и раскладку.
import { div, h3, p, section, signal, span } from "@rwcjs/core";
import {
  registerAll,
  rwcAccordion,
  rwcAccordionItem,
  rwcAlert,
  rwcAvatar,
  rwcBadge,
  rwcButton,
  rwcCard,
  rwcCheckbox,
  rwcDialog,
  rwcDivider,
  rwcDropdownMenu,
  rwcInput,
  rwcPopover,
  rwcProgress,
  rwcRadioGroup,
  rwcSelect,
  rwcSkeleton,
  rwcSpinner,
  rwcSwitch,
  rwcTab,
  rwcTabPanel,
  rwcTabs,
  rwcTextarea,
  rwcTooltip,
  toast,
} from "@rwcjs/ui";

registerAll();

const row = (...children: Node[]) =>
  div({ style: { display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" } }, ...children);

const group = (title: string, ...children: Node[]) =>
  section({ style: { display: "grid", gap: "12px", marginBottom: "28px" } }, h3({ style: { margin: "0" } }, title), ...children);

export default () => {
  const dialogOpen = signal(false);
  const lastAction = signal("—");
  const progress = signal(40);

  return div(
    { attrs: { "data-demo": "ui-kit" } },

    group(
      "Buttons",
      row(
        rwcButton({ ".variant": "primary" }, "Primary"),
        rwcButton("Secondary"),
        rwcButton({ ".variant": "ghost" }, "Ghost"),
        rwcButton({ ".variant": "danger" }, "Danger"),
        rwcButton({ ".loading": true }, "Loading"),
        rwcButton({ ".disabled": true }, "Disabled"),
      ),
    ),

    group(
      "Form controls",
      row(
        rwcInput({ ".placeholder": "Email", ".type": "email", ".required": true, attrs: { name: "email" } }),
        rwcSelect({
          ".placeholder": "Choose a plan",
          ".options": [
            { value: "free", label: "Free" },
            { value: "pro", label: "Pro" },
            { value: "team", label: "Team", disabled: true },
          ],
        }),
      ),
      rwcTextarea({ ".placeholder": "Message", ".rows": 3 }),
      row(
        rwcCheckbox("Accept the terms"),
        rwcCheckbox({ ".indeterminate": true }, "Partially selected"),
        rwcSwitch("Notifications"),
      ),
      rwcRadioGroup(
        {
          ".orientation": "horizontal",
          ".value": "md",
          ".options": [
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
          ],
        },
        "Size",
      ),
    ),

    group(
      "Overlays",
      row(
        rwcButton({ ".variant": "primary", "@press": () => dialogOpen.set(true) }, "Open dialog"),
        rwcDialog(
          {
            ".open": dialogOpen,
            ".label": "Delete file?",
            "@close": (event) => {
              dialogOpen.set(false);
              lastAction.set(`dialog closed: ${event.detail}`);
            },
          },
          span({ attrs: { slot: "header" } }, "Delete file?"),
          p("This cannot be undone."),
          div(
            { attrs: { slot: "footer" }, style: { display: "flex", gap: "8px", justifyContent: "flex-end" } },
            rwcButton({ "@press": () => dialogOpen.set(false) }, "Cancel"),
            rwcButton({ ".variant": "danger", "@press": () => dialogOpen.set(false) }, "Delete"),
          ),
        ),
        rwcTooltip({ ".content": "Saved 2 minutes ago" }, rwcButton("Hover me")),
        rwcPopover(
          rwcButton({ attrs: { slot: "trigger" } }, "Filters"),
          div({ style: { padding: "12px", display: "grid", gap: "8px" } }, rwcCheckbox("Only unread"), rwcCheckbox("With attachments")),
        ),
        rwcDropdownMenu(
          {
            ".items": [
              { value: "edit", label: "Edit" },
              { value: "duplicate", label: "Duplicate" },
              { separator: true },
              { value: "delete", label: "Delete" },
            ],
            "@select": (event) => lastAction.set(`menu: ${event.detail}`),
          },
          rwcButton({ attrs: { slot: "trigger" } }, "Actions"),
        ),
        rwcButton({ "@press": () => toast({ title: "Saved", description: "Your changes are live.", variant: "success" }) }, "Show toast"),
      ),
      p(() => `Last action: ${lastAction()}`),
    ),

    group(
      "Structure",
      rwcTabs(
        { ".value": "account" },
        rwcTab({ ".value": "account" }, "Account"),
        rwcTab({ ".value": "billing" }, "Billing"),
        rwcTab({ ".value": "team" }, "Team"),
        rwcTabPanel({ ".value": "account" }, p("Account settings.")),
        rwcTabPanel({ ".value": "billing" }, p("Billing settings.")),
        rwcTabPanel({ ".value": "team" }, p("Team settings.")),
      ),
      rwcAccordion(
        rwcAccordionItem({ ".value": "shipping", ".heading": "Shipping" }, p("Ships in 2–3 days.")),
        rwcAccordionItem({ ".value": "returns", ".heading": "Returns" }, p("30 days, no questions asked.")),
      ),
      row(
        rwcCard(
          { ".variant": "elevated", style: { width: "260px" } },
          span({ attrs: { slot: "header" } }, "Card"),
          p("Header, body and footer slots."),
          div({ attrs: { slot: "footer" } }, rwcButton({ ".size": "sm" }, "Action")),
        ),
        div(
          { style: { display: "grid", gap: "12px" } },
          row(
            rwcAvatar({ ".name": "Ann Lee" }),
            rwcAvatar({ ".name": "Bob", ".shape": "square" }),
            rwcBadge("Neutral"),
            rwcBadge({ ".variant": "accent" }, "Accent"),
            rwcBadge({ ".variant": "success" }, "Success"),
            rwcBadge({ ".variant": "danger" }, "Danger"),
          ),
          rwcDivider("or"),
        ),
      ),
    ),

    group(
      "Feedback",
      rwcAlert({ ".variant": "info", ".heading": "Heads up" }, "Something you should know."),
      rwcAlert({ ".variant": "danger", ".heading": "Payment failed", ".dismissible": true }, "Check your card details."),
      row(
        rwcSpinner(),
        div(
          { style: { flex: "1", minWidth: "200px" } },
          rwcProgress({ ".value": progress, ".label": "Upload" }),
        ),
        rwcButton({ ".size": "sm", "@press": () => progress.update((n) => (n >= 100 ? 0 : n + 20)) }, "+20%"),
      ),
      rwcSkeleton({ ".shape": "text", ".lines": 3 }),
    ),
  );
};

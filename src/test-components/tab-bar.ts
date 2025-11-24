import {
  classList,
  colorLog,
  newEventEmitter,
  projectLog,
  rs,
  signal,
} from "@shared/utils";
import { createSignal, effect } from "../shared/utils";
import {
  component,
  event,
  property,
} from "../shared/utils/html-decorators/html-property";
import { BaseElement, when } from "../shared/utils/html-elements";
import { useCustomComponent } from "../shared/utils/html-fabric/custom-fabric";
import { button, div, input, slot } from "../shared/utils/html-fabric/fabric";

// import tabStyle from './tab-bar.scss?raw';

@component("tab-bar")
export class TabBar extends BaseElement {
  rootStyle = [import("./tab-bar.scss?inline")];

  // static styles = tabStyle

  @property()
  activeTab = signal(0);

  @event()
  testEvent = newEventEmitter<number>();

  testInject = this.inject<string>("testProvider");

  connectedCallback() {
    this.shadow
      ?.querySelector('slot[name="tab-item"]')
      ?.addEventListener("slotchange", (e) => {
        colorLog("slotchange", e, e.target);
        colorLog("target", (e.target as HTMLSlotElement).assignedElements());
      });
  }

  render() {
    effect(() => {
      projectLog("testInject", this.testInject());
    });
    return div(
      { classList: ["container"] },
      div(
        { classList: ["tab-header"] },
        rs`current tab: ${createSignal(() => this.activeTab() + 1)}`,
      ),
      div(slot({ ".name": "tab-item" })),
    ).onConnected((self, host) => {
      colorLog("@ronConnected tab-bar", self, host);
    });
  }
}
export const TabBarComp = useCustomComponent(TabBar);

@component("tab-bar-test-item")
export class TabBarTestItem extends BaseElement {
  render() {
    const testClass = signal("test-class-2");
    setTimeout(() => {
      testClass.set("test-class-3");
    }, 2000);
    return div(
      classList`test-class ${() => testClass()}`,
      "tab-bar-test-item 3",
      input(),
    );
  }
}
export const TabBarTestItemComp = useCustomComponent(TabBarTestItem);

@component("tab-bar-test")
export class TabBarTest extends BaseElement {
  activeTabNumber = signal(0);
  items = signal<string[]>(["test1", "test2", "test3"]);
  public providers = {
    testProvider: signal("test value or provider"),
  };
  render() {
    const isHidden = signal(false);
    return div(
      this.items,
      () => {
        return this.items().map((e) => div(e));
      },
      () => {
        return when(signal(true), () => button("test-when-signal"));
      },
      when(signal(true), () => button("test-when-signal")),
      div(
        { classList: [() => (isHidden() ? "test1" : "test2")] },
        "!!!test classList!!!",
      ),
      TabBarComp(
        {
          classList: ["test-class", "test-class-2"],
          attributes: { activeTab: this.activeTabNumber },
          ".activeTab": this.activeTabNumber,
          "@testEvent": (e, self, host) => {
            colorLog("@testEvent", e, self, host);
          },
        },
        div({ attributes: { slot: "tab-item" } }, "test1"),
        div({ attributes: { slot: "tab-item" } }, "test2"),
        div(
          { attributes: { slot: "tab-item" } },
          TabBarTestItemComp().onConnected((self, host) => {
            colorLog("@ronConnected tab-bar-test", self, host);
          }),
        ),
        div(
          div(
            div().onConnected(() => {
              colorLog("@ronConnected !!!!!!!!!!!!!!!!! tab-bar-test");
            }),
          ),
        ),
        div(
          TabBarTestItemComp().onConnected((self, host) => {
            colorLog("@ronConnected tab-bar-test", self, host);
          }),
        ),
        TabBarTestItemComp().onConnected((self, host) => {
          colorLog("@ronConnected tab-bar-test", self, host);
        }),
      ),
    );
  }
}
export const TabBarTestComp = useCustomComponent(TabBarTest);

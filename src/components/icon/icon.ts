import { ComponentConfig } from "@shared/types";
import {
  BaseElement,
  component,
  createElement,
  property,
  signal,
} from "@shared/utils";

@component("rx-icon")
export class IconComponent extends BaseElement {
  protected rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
    "./icon.scss?raw"
  );

  @property()
  svgPath = signal("");

  render(): ComponentConfig {
    if (!this.svgPath() || this.svgPath() === "") {
      console.error("require attribute", "svg-path");
      return createElement("div");
    }
    const svgComp = createElement("div");
    import(`../../${this.svgPath()}.svg?raw`).then(({ default: svgString }) => {
      svgComp.setHtmlContent(svgString);
    });
    return svgComp;
  }
}

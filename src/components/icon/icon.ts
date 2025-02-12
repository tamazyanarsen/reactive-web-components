import { ComponentConfig } from "@shared/types";
import {
  BaseElement,
  component,
  createElement,
  property,
  signal,
} from "@shared/utils";

let iconRootPath = "/public/";

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
    import(`${iconRootPath}${this.svgPath()}.svg?raw`).then(
      ({ default: svgString }) => {
        svgComp.setHtmlContent(svgString);
      },
    );
    return svgComp;
  }
}

export const setIconRootPath = (iconPath: string) => {
  iconRootPath = iconPath;
};

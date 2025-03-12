import { BaseElement, component, createEl, property, signal } from "@shared/utils";

let iconRootPath = "@/assets/";

@component("rx-icon")
export class IconComponent extends BaseElement {
  protected rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
    "./icon.scss?raw"
  );

  @property()
  svgPath = signal("");

  @property()
  url = signal('')

  iconComp = signal('')


  async getIconRaw(svgPath: string) { return import(`@/assets/${svgPath}.svg?raw`).then(({ default: svgString }: { default: string }) => svgString) }

  render() {
    if (this.svgPath()) {
      this.getIconRaw(this.svgPath()).then(e => this.iconComp.set(e))
      return createEl('div')(
        this.iconComp
      )
    }
    return createEl('img', {
      attributes: {
        'src': this.url() ? this.url : `${iconRootPath}${this.svgPath()}.svg`
      }
    })().addEventlistener('click', () => { this.click() })
  }
}

export const setIconRootPath = (iconPath: string) => {
  iconRootPath = iconPath;
};

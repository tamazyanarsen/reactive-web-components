import {ComponentConfig} from "@shared/types";
import {BaseElement, component, createElement, property, signal,} from "@shared/utils";

let iconRootPath = "/src/assets/";

@component("rx-icon")
export class IconComponent extends BaseElement {
    protected rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
        "./icon.scss?raw"
        );

    @property()
    svgPath = signal("");

    render(): ComponentConfig {
        if (!this.svgPath() || this.svgPath() === '') {
            console.error("require attribute", "svg-path");
            return createElement("div");
        }
        // import(`${iconRootPath}${this.svgPath()}.svg?raw`).then(
        //     ({default: svgString}) => {
        //         svgComp.setHtmlContent(svgString).set(createElement('img').setAttribute('src', `${iconRootPath}${this.svgPath()}.svg`));
        //     },
        // ).catch(err => console.error('не смог загрузить иконку', this.svgPath(), err));
        return createElement("div")
            .set(createElement('img').setAttribute('src', `${iconRootPath}${this.svgPath()}.svg`));
    }
}

export const setIconRootPath = (iconPath: string) => {
    iconRootPath = iconPath;
};

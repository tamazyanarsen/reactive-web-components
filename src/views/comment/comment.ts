import {ComponentConfig} from "@shared/types";
import {
    BaseElement,
    component,
    createCustomElement,
    createElement,
} from "@shared/utils";
import {ButtonComponent, IconComponent, SwitchComponent} from "components";

@component("comment-widget")
export class CommentWidget extends BaseElement {
    protected rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
        "./comment.scss?raw"
        );

    render(): ComponentConfig {
        return createElement("div")
            .addClass("container")
            .set(
                createCustomElement<SwitchComponent>("rx-switch").setAttribute(
                    "label",
                    "Виден только рекрутерам",
                ),
                createElement("div")
                    .addClass("text-block")
                    .set(
                        createElement("textarea").setAttribute(
                            "placeholder",
                            "какая-то подсказка",
                        ),
                        createCustomElement<ButtonComponent>("rx-button").set(
                            createCustomElement<IconComponent>('rx-icon').setAttribute('svgPath', 'button-send')
                        )
                    ),
            );
    }
}

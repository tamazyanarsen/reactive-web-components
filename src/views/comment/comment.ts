import { BaseElement, component, createCustomElement, createElement } from "@shared/utils";
import { createTemplate } from "@shared/utils/html-elements/component";
import { ButtonComponent, IconComponent, SwitchComponent } from "../../components";

@component("comment-widget")
export class CommentWidget extends BaseElement {
  protected rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
    "./comment.scss?raw"
  );

  render() {
    createTemplate('div flex')().setAttribute('namespaceURI', 'sdf')
    createTemplate('rx-icon flex')().setAttribute('url', 'sdf')
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
            createCustomElement<ButtonComponent>("rx-button")
              .addEventlistener('change', (e) => { console.log(e) })
              .setAttribute('type', 'secondary')
              .set(
                createCustomElement<IconComponent>('rx-icon')
                  .setAttribute('svgPath', 'button-send')
              )
          ),
      );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "rx-button": ButtonComponent;
    "rx-icon": IconComponent;
  }
}
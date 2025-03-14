import { BaseElement, component, createCustomElement, createElement, getElementFromTemplate } from "@shared/utils";
import { ButtonComponent, IconComponent, SwitchComponent } from "../../components";

@component("comment-widget")
export class CommentWidget extends BaseElement {
  protected rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
    "./comment.scss?raw"
  );

  render() {
    console.log(
      getElementFromTemplate`div flex flex-col`,
      getElementFromTemplate`${ButtonComponent} flex flex-col`,
      getElementFromTemplate`${IconComponent} flex flex-col`,
    )
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

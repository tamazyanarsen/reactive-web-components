import { BaseElement, component, createCustom, createCustomElement, createEl, createElement } from "@shared/utils";
import { ButtonComponent, IconComponent, SwitchComponent } from "../../components";

@component("comment-widget")
export class CommentWidget extends BaseElement {
  protected rootStyle?: Promise<typeof import("*?raw")> | undefined = import(
    "./comment.scss?raw"
  );

  render() {
    createEl('div container')(
      createCustom(SwitchComponent, { 'attributes': { 'label': 'Виден только рекрутерам', } })(),
      createEl('div text-block')(
        createEl('textarea', { attributes: { 'placeholder': 'подсказка для ввода' } })(),
        createCustom(ButtonComponent, { attributes: { type: 'secondary' } })(
          createCustom(IconComponent, { attributes: { svgPath: 'button-send' } })()
        ).addEventlistener('change', console.log)
      )
    )
    return createElement("div")
      .addClass("container")
      .set(
        createCustom(SwitchComponent)().setAttribute(
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

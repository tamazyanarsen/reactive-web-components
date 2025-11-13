import { ChildrenContent } from "@shared/types";
import { button, component, div, slot, useCustomComponent } from "@shared/utils";
import { BaseElement, cls } from "@shared/utils/html-elements";
import buttonStyles from './button.css?raw';

@component('button-component')
export class Button extends BaseElement {
    static styles = buttonStyles

    // rootStyle = import('./button.css?inline');

    render() {
        return button(cls`primary`, slot());
    }
}

export const ButtonComp = useCustomComponent(Button);

export const buttonCompTest = (...content: ChildrenContent<HTMLElement>[]) => button(cls`primary`, ...content);

@component('button-test', true)
export class ButtonTest extends BaseElement {
    static styles = buttonStyles

    // rootStyle = import('./button.css?inline');

    render() {
        return div(
            cls`container`,
            // ...Array(1200).fill(0).map(() => ButtonComp('button-component', ButtonComp('child-button'))),
            ...Array(1200).fill(0).map(() => buttonCompTest('button-component', buttonCompTest('child-button')))
        )
    }
}
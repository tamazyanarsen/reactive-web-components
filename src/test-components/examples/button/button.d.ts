import { ChildrenContent } from "@shared/types";
import { BaseElement } from "@shared/utils/html-elements";
export declare class Button extends BaseElement {
    static styles: string;
    render(): import("@shared/types").ComponentConfig<HTMLButtonElement>;
}
export declare const ButtonComp: (config?: ChildrenContent<Button> | import("@shared/types").ComponentInitConfig<Button> | undefined, ...content: ChildrenContent<Button>[]) => import("@shared/types").CustomComponentConfig<Button>;
export declare const buttonCompTest: (...content: ChildrenContent<HTMLElement>[]) => import("@shared/types").ComponentConfig<HTMLButtonElement>;
export declare class ButtonTest extends BaseElement {
    static styles: string;
    render(): import("@shared/types").ComponentConfig<HTMLDivElement>;
}

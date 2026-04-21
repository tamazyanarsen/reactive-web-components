import { BaseElement } from "@shared/utils";
import "./style.css";
export declare class TestComponent extends BaseElement {
    testProperty: import("@shared/utils").ReactiveSignal<boolean>;
    render(): import("./shared").ComponentConfig<HTMLDivElement>;
}

import { BaseElement } from "@shared/utils";
export declare class DynamicItemsTestComponent extends BaseElement {
    items: import("@shared/utils").ReactiveSignal<{
        id: number;
        name: string;
    }[]>;
    test: import("@shared/utils").ReactiveSignal<number>;
    render(): import("../../../shared").ComponentConfig<HTMLDivElement>;
}
export declare const DynamicItemsTest: (config?: import("../../../shared").ChildrenContent<DynamicItemsTestComponent> | import("../../../shared").ComponentInitConfig<DynamicItemsTestComponent> | undefined, ...content: import("../../../shared").ChildrenContent<DynamicItemsTestComponent>[]) => import("../../../shared").CustomComponentConfig<DynamicItemsTestComponent>;
export declare class DynamicTestDemo extends BaseElement {
    items: import("@shared/utils").ReactiveSignal<{
        id: number;
        name: string;
    }[]>;
    render(): import("../../../shared").ComponentConfig<HTMLDivElement>;
}

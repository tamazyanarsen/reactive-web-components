import { BaseElement } from "@shared/utils";
declare class Counter extends BaseElement {
    countState: import("@shared/utils").ReactiveSignal<number>;
    countChange: import("../../shared").EventEmitter<number>;
    testProperty: import("@shared/utils").ReactiveSignal<number>;
    position: import("@shared/utils").ReactiveSignal<"bottom" | "top">;
    rootStyle: Promise<typeof import("*?inline")>;
    render(): import("../../shared").ComponentConfig<HTMLDivElement>;
}
export declare const CounterComponent: (config?: import("../../shared").ChildrenContent<Counter> | import("../../shared").ComponentInitConfig<Counter> | undefined, ...content: import("../../shared").ChildrenContent<Counter>[]) => import("../../shared").CustomComponentConfig<Counter>;
declare class TestCounter extends BaseElement {
    render(): import("../../shared").ComponentConfig<HTMLDivElement>;
}
export declare const TestComponent: (config?: import("../../shared").ChildrenContent<TestCounter> | import("../../shared").ComponentInitConfig<TestCounter> | undefined, ...content: import("../../shared").ChildrenContent<TestCounter>[]) => import("../../shared").CustomComponentConfig<TestCounter>;
export {};

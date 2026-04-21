import { BaseElement } from "../shared/utils/html-elements";
export declare class TabBar extends BaseElement {
    rootStyle: Promise<typeof import("*?inline")>[];
    activeTab: import("@shared/utils").ReactiveSignal<number>;
    testEvent: import("../shared").EventEmitter<number>;
    testInject: import("@shared/utils").ReactiveSignal<string | null>;
    connectedCallback(): void;
    render(): import("../shared").ComponentConfig<HTMLDivElement>;
}
export declare const TabBarComp: (config?: import("../shared").ChildrenContent<TabBar> | import("../shared").ComponentInitConfig<TabBar> | undefined, ...content: import("../shared").ChildrenContent<TabBar>[]) => import("../shared").CustomComponentConfig<TabBar>;
export declare class TabBarTestItem extends BaseElement {
    render(): import("../shared").ComponentConfig<HTMLDivElement>;
}
export declare const TabBarTestItemComp: (config?: import("../shared").ChildrenContent<TabBarTestItem> | import("../shared").ComponentInitConfig<TabBarTestItem> | undefined, ...content: import("../shared").ChildrenContent<TabBarTestItem>[]) => import("../shared").CustomComponentConfig<TabBarTestItem>;
export declare class TabBarTest extends BaseElement {
    activeTabNumber: import("@shared/utils").ReactiveSignal<number>;
    items: import("@shared/utils").ReactiveSignal<string[]>;
    providers: {
        testProvider: import("@shared/utils").ReactiveSignal<string>;
    };
    render(): import("../shared").ComponentConfig<HTMLDivElement>;
}
export declare const TabBarTestComp: (config?: import("../shared").ChildrenContent<TabBarTest> | import("../shared").ComponentInitConfig<TabBarTest> | undefined, ...content: import("../shared").ChildrenContent<TabBarTest>[]) => import("../shared").CustomComponentConfig<TabBarTest>;

import { ComponentConfig } from "@shared/types";
import { BaseElement } from "@shared/utils";
export declare class ExampleListComponent extends BaseElement {
    slotContext: {
        item: import("@shared/utils").ReactiveSignal<{
            id: number;
            name: string;
        } | null>;
    };
    slotTemplate: Partial<{
        item: (slotCtx: {
            id: number;
            name: string;
        }) => ComponentConfig<any> | null;
        indexTemplate: (slotCtx: number) => ComponentConfig<any>;
    }>;
    items: import("@shared/utils").ReactiveSignal<{
        id: number;
        name: string;
    }[]>;
    testEvent: import("@shared/types").EventEmitter<void>;
    render(): ComponentConfig<HTMLDivElement>;
}
export declare class ExampleListTest extends BaseElement {
    render(): ComponentConfig<HTMLDivElement>;
}

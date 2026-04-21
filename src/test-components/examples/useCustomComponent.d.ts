import { BaseElement } from "../../shared/utils/html-elements/base-element";
declare class CounterComponent extends BaseElement {
    count: import("../../shared").ReactiveSignal<number>;
    onCountChange: Event;
    increment(): void;
    render(): import("../../shared").ComponentConfig<HTMLDivElement>;
}
export declare const Counter: (config?: import("../../shared").ChildrenContent<CounterComponent> | import("../../shared").ComponentInitConfig<CounterComponent> | undefined, ...content: import("../../shared").ChildrenContent<CounterComponent>[]) => import("../../shared").CustomComponentConfig<CounterComponent>;
declare class UserCardComponent extends BaseElement {
    name: import("../../shared").ReactiveSignal<string>;
    age: import("../../shared").ReactiveSignal<number>;
    render(): import("../../shared").ComponentConfig<HTMLDivElement>;
}
export declare const UserCard: (config?: import("../../shared").ChildrenContent<UserCardComponent> | import("../../shared").ComponentInitConfig<UserCardComponent> | undefined, ...content: import("../../shared").ChildrenContent<UserCardComponent>[]) => import("../../shared").CustomComponentConfig<UserCardComponent>;
declare class SecretComponent extends BaseElement {
    message: import("../../shared").ReactiveSignal<string>;
    render(): import("../../shared").ComponentConfig<HTMLDivElement>;
}
export declare const Secret: (config?: import("../../shared").ChildrenContent<SecretComponent> | import("../../shared").ComponentInitConfig<SecretComponent> | undefined, ...content: import("../../shared").ChildrenContent<SecretComponent>[]) => import("../../shared").CustomComponentConfig<SecretComponent>;
export declare const Examples: () => import("../../shared").ComponentConfig<HTMLDivElement>;
export {};

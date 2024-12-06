import { ComponentConfig } from "../../types/element";
import { elementHelpers } from "./element-helper";

export const createCustomElement = <T extends HTMLElement>(tagName: string): ComponentConfig<T> => {
    const wrapper = document.createElement(tagName) as T
    return {
        ...elementHelpers(wrapper)
    }
}
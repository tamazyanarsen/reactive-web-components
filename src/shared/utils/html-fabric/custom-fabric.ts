import { ChildrenContent, ComponentInitConfig, isComponentInitConfig } from "@shared/types";
import { component } from "../html-decorators";
import { BaseElementConstructor, customEl } from "../html-elements";

export const useCustomComponent = <B extends BaseElementConstructor>(comp: B, selector?: `${string}-${string}`, isClosed?: boolean) => {
  const newClassComponent = selector ? component(selector, isClosed)(comp) : comp;
  return (
    config?: ComponentInitConfig<InstanceType<B>> | ChildrenContent<InstanceType<B>>,
    ...content: ChildrenContent<InstanceType<B>>[]
  ) => {
    const resultContent = [...content];
    if (config && !isComponentInitConfig(config)) {
      resultContent.unshift(config as ChildrenContent<InstanceType<B>>);
    }
    return customEl(newClassComponent, isComponentInitConfig(config) ? config : {})(...resultContent)
  }
}

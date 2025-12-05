import { ChildrenContent, ComponentInitConfig, isComponentInitConfig } from "@shared/types";
import { component } from "../html-decorators";
import { BaseElementConstructor, createCustom } from "../html-elements";

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
    return createCustom(newClassComponent, isComponentInitConfig(config) ? config : {})(...resultContent)
  }
}

export const configCustomComponent = <B extends BaseElementConstructor>(comp: B) => {
  return [
    (
      config?: ComponentInitConfig<InstanceType<B>> | ChildrenContent<InstanceType<B>>,
      ...content: ChildrenContent<InstanceType<B>>[]
    ) => {
      const resultContent = [...content];
      if (config && !isComponentInitConfig(config)) {
        resultContent.unshift(config as ChildrenContent<InstanceType<B>>);
      }
      return createCustom(comp, isComponentInitConfig(config) ? config : {})(...resultContent)
    },
    (selector: `${string}-${string}`, isClosed?: boolean) => {
      return component(selector, isClosed)(comp)
    }
  ]
}
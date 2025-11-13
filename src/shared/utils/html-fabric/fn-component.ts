import { ComponentConfig, ConfigClassList, ConfigReactiveClassList } from "../../types/element";

export const createComponent =
  <Props, R extends ComponentConfig<HTMLElement>>(cb: (props: Props) => R) =>
  (
    props: Props & { classList?: ConfigClassList, reactiveClassList?: ConfigReactiveClassList }
  ): ReturnType<typeof cb> =>
    cb(props).addClass(...(props.classList ?? [])).addReactiveClass(props.reactiveClassList ?? {}) as R;
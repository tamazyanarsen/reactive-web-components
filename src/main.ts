import { CompFuncContent, ComponentConfig } from "@shared/types";
import "./style.css";

import { button, createEl, div, getReactiveTemplate, ReactiveSignal, signal, span, when } from "@shared/utils";

const testSignal = signal(false)

document.body.append(
  div(
    { '.id': 'main container div' },
    when(testSignal, () => div('true')),
    when(testSignal, () => div('true')),
  ).hostElement
)

getReactiveTemplate(() => [div('true')])

type ContentType<T> = T extends CompFuncContent
  ? ReturnType<T>
  : ComponentConfig<HTMLDivElement>;

export function newrenderIf<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: boolean,
  content: Content,
  elseContent: ElseContent,
): ReturnType<Content>
  | ReturnType<ElseContent>;

export function newrenderIf<Content extends CompFuncContent>(
  condition: boolean,
  content: Content
): ReturnType<Content> | ComponentConfig<HTMLDivElement>;

export function newrenderIf<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: boolean,
  content: Content,
  elseContent?: ElseContent,
): ReturnType<Content>
  | ContentType<typeof elseContent> {
  return condition
    ? getReactiveTemplate(content) as ReturnType<Content>
    : elseContent
      ? getReactiveTemplate(elseContent) as ContentType<typeof elseContent>
      : createEl('div')().setAttribute("id", "empty_div_renderIf").addStyle({ display: "none" }) as ComponentConfig<HTMLDivElement>;
}

newrenderIf(true, () => span('true'))
newrenderIf(true, () => button('true'))
newrenderIf(true, () => div('true'), () => div('false'))

export function newrxRenderIf<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: ReactiveSignal<any> | (() => boolean),
  content: Content,
  elseContent: ElseContent,
): ReturnType<Content> | ReturnType<ElseContent>

export function newrxRenderIf<Content extends CompFuncContent>(
  condition: ReactiveSignal<any> | (() => boolean),
  content: Content,
): ReturnType<Content> | ComponentConfig<HTMLDivElement>

export function newrxRenderIf<Content extends CompFuncContent, ElseContent extends CompFuncContent>(
  condition: ReactiveSignal<any> | (() => boolean),
  content: Content,
  elseContent?: ElseContent,
): ReturnType<Content> | ContentType<typeof elseContent> {
  return getReactiveTemplate(() => elseContent
    ? newrenderIf(Boolean(condition()), content, elseContent) as ReturnType<Content> | ContentType<typeof elseContent>
    : newrenderIf(Boolean(condition()), content) as ReturnType<Content> | ComponentConfig<HTMLDivElement>
  );
}

newrxRenderIf(signal(true), () => span('true'))
newrxRenderIf(signal(true), () => button('true'), () => span('false'))


/**
 * 
export const renderIf = (
  condition: boolean,
  content: CompFuncContent,
  elseContent?: CompFuncContent,
) =>
  condition
    ? getSignalContent(content)
    : elseContent
      ? getSignalContent(elseContent)
      : createEl('div')().setAttribute("id", "empty_div_renderIf").addStyle({ display: "none" });

export const rxRenderIf = (
  condition: ReactiveSignal<any> | (() => boolean),
  content: CompFuncContent,
  elseContent?: CompFuncContent,
) =>
  getSignalContent(() => renderIf(Boolean(condition()), content, elseContent));
 */
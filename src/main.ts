import { renderIf, rxRenderIf, when } from "@shared/utils/html-elements/element";

import "./style.css";

import { ComponentConfig } from "@shared/types";
import { button, div, getSignalContent, signal, span } from "@shared/utils";

const testSignal = signal(false)

document.body.append(
  div(
    { '.id': 'main container div' },
    when(testSignal, () => div('true')),
    when(testSignal, () => div('true')),
  ).hostElement
)

getSignalContent(() => [div('true')])

const addToBody = (element: ComponentConfig<HTMLElement> | ComponentConfig<HTMLElement>[]) =>
  document.body.append(...[element].flat().map(e => e.hostElement))

addToBody(renderIf(false, () => span('true')))
addToBody(renderIf(true, () => button('true')))
addToBody(renderIf(false, () => div('true'), () => div('false')))

addToBody(rxRenderIf(signal(true), () => span('true')))
addToBody(rxRenderIf(signal(true), () => button('true'), () => span('false')))

addToBody(when(signal(false), () => span('true')))
addToBody(when(signal(false), () => [button('true')], () => `span('false')`))
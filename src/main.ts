import { renderIf, rxRenderIf, when } from "@shared/utils/html-elements/element";

import "./style.css";

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

renderIf(true, () => span('true'))
renderIf(true, () => button('true'))
renderIf(true, () => div('true'), () => div('false'))

rxRenderIf(signal(true), () => span('true'))
rxRenderIf(signal(true), () => button('true'), () => span('false'))

when(signal(true), () => span('true'))
when(signal(true), () => [button('true')], () => `span('false')`)
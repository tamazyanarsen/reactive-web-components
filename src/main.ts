import "./style.css";

import { combineLatest, div, signal, when } from "@shared/utils";

const testSignal = signal(false)

document.body.append(
  div(
    { '.id': 'main container div' },
    when(testSignal, () => div('true')),
    when(testSignal, () => div('true')),
  ).hostElement
);

combineLatest(signal(1), signal('123123')).pipe(data => data)
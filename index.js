import {run} from '@cycle/core';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {restart, restartable} from 'cycle-restart';
import isolate from '@cycle/isolate';
import queryString from 'query-string';
import {Observable} from 'rx';

var app = require('./src/app').default;

function redirectDriver (sink$) {
  return sink$.subscribe(path => {
    location.href = path;
  });
}

function paramsDriver () {
  return Observable.just(queryString.parse(location.search));
}

const drivers = {
  DOM: restartable(makeDOMDriver('.app'), {pauseSinksWhileReplaying: false}),
  HTTP: restartable(makeHTTPDriver()),
  Redirect: restartable(redirectDriver),
  Params: restartable(paramsDriver)
};

const {sinks, sources} = run(app, drivers);

if (module.hot) {
  module.hot.accept('./src/app', () => {
    app = require('./src/app').default;

    restart(app, drivers, {sinks, sources}, isolate);
  });
}

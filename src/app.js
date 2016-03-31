import {div, button, a} from '@cycle/dom';

import {Observable} from 'rx';
import _ from 'lodash';

const CLIENT_ID = '031ef56073f64d1a7126';

function linkify (repoName, page = '/') {
  return a({href: `http://github.com/Widdershin/${repoName}${page}`}, repoName);
}

function sortByIssues (repos) {
  return _.sortBy(repos, repo => -repo.open_issues);
}

function hideZeroIssueProjects (repos) {
  return repos.filter(repo => repo.open_issues > 0);
}

function totalOpenIssueCount (repos) {
  return _.sum(repos.map(repo => repo.open_issues));
}

function issueView (issue) {
  return (
    div('.issue', [
      JSON.stringify(issue)
    ])
  )
}

function repoView (repo) {
  return (
    div('.repo', [
      div('.name', linkify(repo.name, '/issues')),
      div('.open-issues', `${repo.open_issues} open issue(s)`)
    ])
  );
}

function view (repos, issues) {
  return (
    div('.dashboard', [
      div('.splash', [
        div('.total', `${totalOpenIssueCount(repos)} issues open total`)
      ]),

      div('.content', [
        div('.repos', hideZeroIssueProjects(sortByIssues(repos)).map(repoView)),
        div('.issues', issues.map(issueView))
      ])
    ])
  );
}

const githubApi = 'https://api.github.com';

function user (username) {
  return `${githubApi}/users/${username}`;
}

function repos (username, page) {
  let pageQueryParam = '';

  if (page) {
    pageQueryParam = `&page=${page}`;
  }

  return `${user(username)}/repos?type=owner&per_page=100${pageQueryParam}`;
}

function Dashboard ({DOM, HTTP}) {
  const repoResponse$ = HTTP
    .filter(response => _.includes(response.request.url, repos('Widdershin')))
    .mergeAll()
    .map(response => response.body);

  const repos$ = repoResponse$
    .startWith([])
    .scan((currentRepos, newRepos) => _.uniqBy(currentRepos.concat(newRepos), 'name'));

  const repoRequest$ = repoResponse$
    .takeWhile(response => response.length > 0)
    .startWith(1)
    .scan((page, _) => page + 1)
    .map(page => repos('Widdershin', page));

  const issues$ = Observable.just(['wow']);

  const request$ = Observable.merge(
    repoRequest$
  );

  return {
    DOM: Observable.combineLatest(
      repos$,
      issues$,
      view
    ),
    HTTP: request$
  };
}

function loginView (authCode, githubAuthCode) {
  if (!authCode && !githubAuthCode) {
    return (
      button('.sign-in', 'Sign into Github!')
    );
  }

  if (authCode && !githubAuthCode) {
    return (
      div('Signing in...')
    );
  }

  return (
    div(`Signed in: ${githubAuthCode}`)
  );
}

function authWithGateKeeper (authCode) {
  return `https://widdershin-gatekeeper.herokuapp.com/authenticate/${authCode}`;
}

export default function App ({DOM, HTTP, Params}) {
  const redirectToGithub$ = DOM
    .select('.sign-in')
    .events('click')
    .map(() => `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=http://localhost:8000`);

  const authCode$ = Params
    .pluck('code')
    .take(1);

  const githubAuthCode$ = HTTP
    .mergeAll()
    .map(response => response.body)
    .pluck('token');

  return {
    DOM: Observable.combineLatest(authCode$, githubAuthCode$, loginView),
    Redirect: redirectToGithub$,
    HTTP: authCode$.map(authWithGateKeeper)
  };
}

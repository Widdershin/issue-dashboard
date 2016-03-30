import {div, button, a} from '@cycle/dom';

import {Observable} from 'rx';
import _ from 'lodash';

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

function repoView (repo) {
  return (
    div('.repo', [
      div('.name', linkify(repo.name, '/issues')),
      div('.open-issues', `${repo.open_issues} open issues`)
    ])
  );
}

function view (repos) {
  return (
    div('.dashboard', [
      div('.splash', [
        div('.total', `${totalOpenIssueCount(repos)} issues open total`)
      ]),
      div('.repos', hideZeroIssueProjects(sortByIssues(repos)).map(repoView))
    ])
  );
}

const githubApi = 'https://api.github.com';

function user (username) {
  return `${githubApi}/users/${username}`;
}

function repos (username, page = 1) {
  return `${user(username)}/repos?type=owner&per_page=100&page=${page}`;
}

export default function App ({DOM, HTTP}) {
  const response$ = HTTP
    .mergeAll()
    .map(response => response.body);

  const repos$ = response$
    .startWith([])
    .scan((currentRepos, newRepos) => _.uniqBy(currentRepos.concat(newRepos), 'name'));

  const request$ = response$
    .takeWhile(response => response.length > 0)
    .startWith(1)
    .scan((page, _) => page + 1)
    .map(page => repos('Widdershin', page));

  return {
    DOM: repos$.map(view),
    HTTP: request$
  };
}

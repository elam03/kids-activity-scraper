import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubRemote,
  formatBeadFromGitHubIssue,
  buildCloseoutCommitMessage,
} from './github-issues-utils';

test('parseGitHubRemote extracts owner and repo from SSH and HTTPS URLs', () => {
  assert.deepEqual(
    parseGitHubRemote('git@github.com:elam03/kids-activity-scraper.git'),
    { owner: 'elam03', repo: 'kids-activity-scraper' }
  );

  assert.deepEqual(
    parseGitHubRemote('https://github.com/elam03/kids-activity-scraper.git'),
    { owner: 'elam03', repo: 'kids-activity-scraper' }
  );

  assert.deepEqual(
    parseGitHubRemote('https://github.com/owner/my-cool-project'),
    { owner: 'owner', repo: 'my-cool-project' }
  );

  assert.deepEqual(
    parseGitHubRemote('ssh://git@github.com/org/repo-name.git'),
    { owner: 'org', repo: 'repo-name' }
  );

  assert.equal(parseGitHubRemote('https://gitlab.com/owner/repo.git'), null);
  assert.equal(parseGitHubRemote('invalid-remote'), null);
});

test('buildCloseoutCommitMessage includes Fixes #{number}', () => {
  const msg = buildCloseoutCommitMessage(2, 'remove carto api key requirement');
  assert.equal(msg, 'feat: remove carto api key requirement (Fixes #2)');
});

test('formatBeadFromGitHubIssue generates implementation and closeout bead definitions', () => {
  const issue = {
    number: 2,
    title: 'Remove Carto API key requirement',
    body: 'Add key parameter or switch to keyless tile layer',
    html_url: 'https://github.com/elam03/kids-activity-scraper/issues/2',
    labels: [{ name: 'enhancement' }],
  };

  const { implementationBead, closeoutBead } = formatBeadFromGitHubIssue(issue);

  // Implementation bead checks
  assert.equal(implementationBead.title, 'GitHub #2: Remove Carto API key requirement');
  assert.ok(implementationBead.description.includes('https://github.com/elam03/kids-activity-scraper/issues/2'));
  assert.ok(implementationBead.description.includes('Add key parameter or switch to keyless tile layer'));
  assert.equal(implementationBead.type, 'feature');

  // Closeout bead checks
  assert.equal(closeoutBead.title, 'Close GitHub #2: Remove Carto API key requirement');
  assert.ok(closeoutBead.description.includes('Fixes #2'));
  assert.ok(closeoutBead.description.includes('bd dolt push'));
  assert.equal(closeoutBead.type, 'task');
});

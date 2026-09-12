#!/usr/bin/env node

/**
 * Helper script to fetch GitHub issues for the current git repository.
 * Zero external dependencies — uses built-in node modules (child_process, https).
 */

const { execSync } = require('child_process');
const https = require('https');

function getRepoInfo() {
  try {
    const remote = execSync('git remote get-url origin 2>/dev/null || git config --get remote.origin.url', {
      encoding: 'utf8',
      timeout: 5000,
    }).trim();

    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) {
      throw new Error(`Could not parse GitHub owner/repo from git remote: "${remote}"`);
    }
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  } catch (err) {
    console.error(`Error detecting git remote: ${err.message}`);
    process.exit(1);
  }
}

function fetchApi(path) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const headers = {
      'User-Agent': 'github-to-beads-skill',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: 'api.github.com',
      path,
      headers,
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON response: ${e.message}`));
          }
        } else {
          reject(new Error(`GitHub API error HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  
  let targetIssue = null;
  let state = 'open';

  for (const arg of args) {
    if (arg.startsWith('--issue=')) {
      targetIssue = arg.split('=')[1];
    } else if (/^\d+$/.test(arg)) {
      targetIssue = arg;
    } else if (arg.startsWith('--state=')) {
      state = arg.split('=')[1];
    } else if (arg === '--all') {
      state = 'all';
    }
  }

  const { owner, repo } = getRepoInfo();

  try {
    if (targetIssue) {
      const issue = await fetchApi(`/repos/${owner}/${repo}/issues/${targetIssue}`);
      if (jsonOutput) {
        console.log(JSON.stringify(issue, null, 2));
      } else {
        console.log(`\n### GitHub Issue #${issue.number}: ${issue.title} [${issue.state}]`);
        console.log(`URL: ${issue.html_url}`);
        console.log(`Author: @${issue.user?.login || 'unknown'}`);
        if (issue.labels && issue.labels.length > 0) {
          console.log(`Labels: ${issue.labels.map(l => l.name).join(', ')}`);
        }
        console.log(`\nDescription:\n${issue.body || '(No description provided)'}\n`);
      }
      return;
    }

    const issues = await fetchApi(`/repos/${owner}/${repo}/issues?state=${state}&per_page=30`);
    const realIssues = Array.isArray(issues) ? issues.filter(i => !i.pull_request) : [];

    if (jsonOutput) {
      console.log(JSON.stringify(realIssues, null, 2));
      return;
    }

    console.log(`\nRepository: ${owner}/${repo} (${state} issues)`);
    console.log('='.repeat(60));

    if (realIssues.length === 0) {
      console.log(`No ${state} issues found.`);
      return;
    }

    for (const issue of realIssues) {
      const labelStr = issue.labels && issue.labels.length > 0
        ? ` [${issue.labels.map(l => l.name).join(', ')}]`
        : '';
      console.log(`\n#${issue.number} [${issue.state}] - ${issue.title}${labelStr}`);
      console.log(`  URL: ${issue.html_url}`);
      console.log(`  Author: @${issue.user?.login || 'unknown'}`);
      if (issue.body) {
        const firstLine = issue.body.trim().split('\n')[0].slice(0, 100);
        console.log(`  Preview: ${firstLine}...`);
      }
    }
    console.log('\n' + '='.repeat(60));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();

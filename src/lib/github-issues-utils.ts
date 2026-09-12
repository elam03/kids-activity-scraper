/**
 * Utilities for parsing GitHub remotes and formatting Beads tasks from GitHub issues.
 */

export interface GitHubIssueSummary {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  labels?: Array<{ name: string }>;
}

export interface BeadDefinition {
  title: string;
  description: string;
  type: 'feature' | 'task' | 'bug';
  priority: number;
}

/**
 * Parses GitHub owner and repo from an origin remote URL (SSH or HTTPS).
 */
export function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const match = url.trim().match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}

/**
 * Builds a Git commit message following the GitHub issue auto-close convention.
 */
export function buildCloseoutCommitMessage(issueNumber: number, summary: string): string {
  return `feat: ${summary.trim()} (Fixes #${issueNumber})`;
}

/**
 * Formats both the primary implementation Bead and the closing verification Bead
 * from a GitHub issue.
 */
export function formatBeadFromGitHubIssue(issue: GitHubIssueSummary): {
  implementationBead: BeadDefinition;
  closeoutBead: BeadDefinition;
} {
  const implementationBead: BeadDefinition = {
    title: `GitHub #${issue.number}: ${issue.title}`,
    description: `From ${issue.html_url}\n\n${issue.body || '(No description provided)'}`,
    type: 'feature',
    priority: 1,
  };

  const closeoutBead: BeadDefinition = {
    title: `Close GitHub #${issue.number}: ${issue.title}`,
    description: `Verify and mark GitHub #${issue.number} as resolved upon completion:
1. Verify implementation and test gates pass.
2. Commit changes using Git resolution convention: git commit -m '... (Fixes #${issue.number})'
3. Push to origin branch: git push origin main.
4. Verify GitHub issue #${issue.number} is marked closed on GitHub.
5. Synchronize local Beads tracking: bd dolt push.`,
    type: 'task',
    priority: 1,
  };

  return { implementationBead, closeoutBead };
}

// Business logic — uses services to build responses

const gitlabApi = require('../services/gitlabApi');

// Parses git-subtree squash commit messages to find the base SHA
function extractSubtreeSha(message) {
  if (!message) return null;
  let m = message.match(/Squashed '.*?' changes from [0-9a-f]+\.\.([0-9a-f]+)/i);
  if (m) return m[1];
  m = message.match(/Squashed '.*?' content from commit ([0-9a-f]+)/i);
  if (m) return m[1];
  return null;
}

async function findSquashCommitViaSearch(gitlabUrl, token, mainProjectId, mainRef, subtreePath) {
  let hits;
  try {
    hits = await gitlabApi.searchCommits(gitlabUrl, token, mainProjectId, 'Squashed');
  } catch (e) {
    return null;
  }
  if (!Array.isArray(hits) || hits.length === 0) return null;

  const prefixNoSlash = subtreePath.replace(/\/+$/, '');
  let candidates = hits.filter((c) => c.message && c.message.includes(prefixNoSlash));
  if (candidates.length === 0) candidates = hits;

  candidates.sort((a, b) => new Date(b.committed_date) - new Date(a.committed_date));
  for (const c of candidates) {
    const sha = extractSubtreeSha(c.message);
    if (sha) return { sha, commit: c };
  }
  return null;
}

async function findSquashCommitViaPathScan(gitlabUrl, token, mainProjectId, mainRef, subtreePath) {
  let page = 1;
  const perPage = 100;
  const maxPages = 5;
  while (page <= maxPages) {
    const commits = await gitlabApi.getCommitsByPath(gitlabUrl, token, mainProjectId, mainRef, subtreePath, page, perPage);
    if (!commits.length) break;
    for (const c of commits) {
      const sha = extractSubtreeSha(c.message);
      if (sha) return { sha, commit: c };
    }
    if (commits.length < perPage) break;
    page += 1;
  }
  return null;
}

async function getSubtreeStatus(gitlabUrl, token, mainProjectId, mainRef, subtreePath, baseProjectPath, basePackageJsonPath) {
  const baseProject = await gitlabApi.getProjectInfo(gitlabUrl, token, baseProjectPath);
  const baseLatest = await gitlabApi.getLatestCommit(gitlabUrl, token, baseProject.id, baseProject.default_branch);

  const subtreePkgPath = subtreePath.replace(/\/+$/, '') + '/package.json';
  const pulledVersion = await gitlabApi.getPackageVersion(gitlabUrl, token, mainProjectId, mainRef, subtreePkgPath);
  const baseLatestVersion = await gitlabApi.getPackageVersion(
    gitlabUrl, token, baseProject.id, baseProject.default_branch, basePackageJsonPath || 'package.json'
  );

  const result = {
    pulledVersion,
    baseProjectPath,
    baseDefaultBranch: baseProject.default_branch,
    baseLatestSha: baseLatest ? baseLatest.id : null,
    baseLatestVersion,
    baseLatestDate: baseLatest ? baseLatest.committed_date : null,
  };

  if (pulledVersion && baseLatestVersion) {
    result.upToDate = pulledVersion === baseLatestVersion;
  } else {
    result.upToDate = null;
  }

  let found = await findSquashCommitViaSearch(gitlabUrl, token, mainProjectId, mainRef, subtreePath);
  if (!found) {
    found = await findSquashCommitViaPathScan(gitlabUrl, token, mainProjectId, mainRef, subtreePath);
  }

  if (found) {
    result.pulledSha = found.sha;
    result.pulledAt = found.commit.committed_date;
    result.pulledCommitTitle = found.commit.title;

    const shaUpToDate = baseLatest && (baseLatest.id === found.sha || baseLatest.id.startsWith(found.sha) || found.sha.startsWith(baseLatest.short_id));
    if (!shaUpToDate) {
      try {
        const compare = await gitlabApi.compareCommits(gitlabUrl, token, baseProject.id, found.sha, baseProject.default_branch);
        const commitsBehind = compare.commits || [];
        result.behindCount = commitsBehind.length;
        result.behindCommits = commitsBehind.slice(-50).reverse().map(c => ({
          sha: c.short_id,
          title: c.title,
          date: c.committed_date,
          author: c.author_name,
        }));
      } catch (e) {
        result.behindCountError = e.message;
      }
    }
  } else {
    result.squashCommitNote = 'Could not locate the git-subtree squash commit, so an exact commit-by-commit diff isn\'t available - ' +
      'but the version comparison above is still accurate since it reads package.json directly.';
  }

  return result;
}

// --- Controller functions (called by routes) ---

async function testConnection(req, res) {
  const { gitlabUrl, token } = req.body;
  try {
    const user = await gitlabApi.getCurrentUser(gitlabUrl, token);
    res.json({ ok: true, user: { username: user.username, name: user.name } });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
}

async function checkAll(req, res) {
  const { gitlabUrl, token, projects, packageJsonPath } = req.body;
  if (!gitlabUrl || !token || !Array.isArray(projects)) {
    return res.status(400).json({ error: 'gitlabUrl, token, and projects[] are required' });
  }

  const pkgPath = packageJsonPath || 'package.json';

  const results = await Promise.all(projects.map(async (p) => {
    const base = { key: p.path, label: p.name || p.path, type: p.type || 'normal' };
    try {
      const info = await gitlabApi.getProjectInfo(gitlabUrl, token, p.path);
      const ref = p.ref || info.default_branch;

      const [commit, tag, pkgVersion] = await Promise.all([
        gitlabApi.getLatestCommit(gitlabUrl, token, info.id, ref),
        gitlabApi.getLatestTag(gitlabUrl, token, info.id).catch(() => null),
        gitlabApi.getPackageVersion(gitlabUrl, token, info.id, ref, pkgPath),
      ]);

      const out = {
        ...base,
        ok: true,
        gitlabProjectId: info.id,
        webUrl: info.web_url,
        defaultBranch: ref,
        commitSha: commit ? commit.short_id : null,
        commitFullSha: commit ? commit.id : null,
        commitDate: commit ? commit.committed_date : null,
        commitAuthor: commit ? commit.author_name : null,
        commitTitle: commit ? commit.title : null,
        latestTag: tag ? tag.name : null,
        tagDate: tag ? (tag.commit && tag.commit.committed_date) : null,
        packageVersion: pkgVersion,
      };

      if (p.type === 'subtree' && p.subtreePath && p.basePath) {
        try {
          out.subtree = await getSubtreeStatus(gitlabUrl, token, info.id, ref, p.subtreePath, p.basePath, pkgPath);
        } catch (e) {
          out.subtree = { error: e.message };
        }
      }

      return out;
    } catch (e) {
      return { ...base, ok: false, error: e.message };
    }
  }));

  res.json({ results });
}

async function listProjects(req, res) {
  const { gitlabUrl, token, search } = req.body;
  try {
    const projects = await gitlabApi.listProjects(gitlabUrl, token, search);
    res.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name_with_owner || p.name || 'Unknown',
        path: p.path_with_namespace || p.path || '',
        webUrl: p.web_url || '',
        description: p.description || '',
        visibility: p.visibility || 'private',
        stars: p.star_count || 0,
        lastActivity: p.last_activity_at,
      })),
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getProjectMergeRequests(req, res) {
  const { gitlabUrl, token, projectPath, state } = req.body;
  try {
    const info = await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath);
    const mrs = await gitlabApi.getMergeRequests(gitlabUrl, token, info.id, state || 'opened');
    res.json({
      mergeRequests: mrs.map((mr) => ({
        id: mr.iid,
        title: mr.title,
        state: mr.state,
        author: mr.author?.name || 'Unknown',
        authorAvatar: mr.author?.avatar_url || '',
        createdAt: mr.created_at,
        updatedAt: mr.updated_at,
        webUrl: mr.web_url,
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
        labels: mr.labels || [],
        reviews: mr.reviews_state || '',
      })),
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getProjectIssues(req, res) {
  const { gitlabUrl, token, projectPath, state } = req.body;
  try {
    const info = await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath);
    const issues = await gitlabApi.getIssues(gitlabUrl, token, info.id, state || 'opened');
    res.json({
      issues: issues.map((issue) => ({
        id: issue.iid,
        title: issue.title,
        state: issue.state,
        author: issue.author?.name || 'Unknown',
        authorAvatar: issue.author?.avatar_url || '',
        assignees: (issue.assignees || []).map((a) => a.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        webUrl: issue.web_url,
        labels: issue.labels || [],
        priority: issue.priority || null,
        severity: issue.severity || null,
      })),
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

module.exports = { testConnection, checkAll, listProjects, getProjectMergeRequests, getProjectIssues };
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
    subtreePath,
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

async function getMonorepoStatus(gitlabUrl, token, projectId, ref) {
  // 1. Fetch root package.json and tags
  const [rootPkgRaw, projectTags] = await Promise.all([
    gitlabApi.getRawFileContent(gitlabUrl, token, projectId, 'package.json', ref),
    gitlabApi.getTags(gitlabUrl, token, projectId, 1, 100).catch(() => []),
  ]);

  let rootPkg = {};
  try {
    rootPkg = JSON.parse(rootPkgRaw);
  } catch (err) {
    throw new Error(`Failed to parse root package.json: ${err.message}`);
  }

  const ignoredWorkspaceNames = ['nucleus', 'xp-services', 'xp-service'];
  const isIgnoredWorkspace = (str) => {
    if (!str) return false;
    const clean = str.toLowerCase().replace(/^@[^/]+\//, '').replace(/^\.\//, '').replace(/\/+$/, '');
    const base = clean.split('/').pop();
    return ignoredWorkspaceNames.includes(clean) || ignoredWorkspaceNames.includes(base);
  };

  const rawWorkspaces = rootPkg.workspaces || [];
  let workspacePaths = Array.isArray(rawWorkspaces)
    ? rawWorkspaces
    : (rawWorkspaces.packages || []);

  workspacePaths = workspacePaths.filter((ws) => !isIgnoredWorkspace(ws));

  if (!workspacePaths || workspacePaths.length === 0) {
    return {
      workspaces: [],
      error: 'No bank workspaces found in root package.json',
    };
  }

  // 2. Fetch data for each workspace in parallel
  const workspaceDetails = await Promise.all(
    workspacePaths.map(async (wsPath) => {
      // Remove leading ./ and trailing slashes
      const cleanPath = wsPath.replace(/^\.\//, '').replace(/\/+$/, '');
      if (isIgnoredWorkspace(cleanPath)) return null;
      const possiblePkgPaths = cleanPath.includes('stimulus')
        ? [
            `${cleanPath}/src/packages/package.json`,
            `${cleanPath}/packages/package.json`,
            `${cleanPath}/package.json`,
          ]
        : [
            `${cleanPath}/package.json`,
            `${cleanPath}/src/packages/package.json`,
            `${cleanPath}/packages/package.json`,
          ];

      try {
        let pkgText = null;
        for (const cf of possiblePkgPaths) {
          pkgText = await gitlabApi.getRawFileContent(gitlabUrl, token, projectId, cf, ref).catch(() => null);
          if (pkgText) break;
        }
        const pathCommits = await gitlabApi.getCommitsByPath(gitlabUrl, token, projectId, ref, cleanPath, 1, 1).catch(() => []);

        if (!pkgText) {
          // If no package.json in this workspace folder, still show commit if folder exists
          const latestCommit = pathCommits && pathCommits[0] ? pathCommits[0] : null;
          return {
            path: cleanPath,
            name: cleanPath,
            version: null,
            latestCommit: latestCommit
              ? {
                  sha: latestCommit.short_id,
                  fullSha: latestCommit.id,
                  title: latestCommit.title,
                  date: latestCommit.committed_date,
                  author: latestCommit.author_name,
                  webUrl: latestCommit.web_url,
                }
              : null,
            latestTag: null,
          };
        }

        let pkg = {};
        try {
          pkg = JSON.parse(pkgText);
        } catch (e) {
          pkg = { name: cleanPath, version: 'parse error' };
        }

        if (pkg.name && isIgnoredWorkspace(pkg.name)) {
          return null;
        }

        const latestCommit = pathCommits && pathCommits[0] ? pathCommits[0] : null;

        // Match bank-specific tag (e.g. laxmi-v1.0.4, laxmi-1.0.4, v1.0.4-laxmi, base-v2.4.0)
        const folderBasename = cleanPath.split('/').pop().toLowerCase();
        const pkgShortName = (pkg.name || '').replace(/^@[^/]+\//, '').toLowerCase();

        const matchingTag = (projectTags || []).find((t) => {
          if (!t || !t.name) return false;
          const tName = t.name.toLowerCase();
          return (
            tName.startsWith(`${folderBasename}-`) ||
            tName.startsWith(`${folderBasename}/`) ||
            tName.includes(folderBasename) ||
            (pkgShortName && (tName.startsWith(`${pkgShortName}-`) || tName.includes(pkgShortName)))
          );
        }) || null;

        return {
          path: cleanPath,
          name: pkg.name || cleanPath,
          version: pkg.version || '0.0.0',
          description: pkg.description || '',
          latestCommit: latestCommit
            ? {
                sha: latestCommit.short_id,
                fullSha: latestCommit.id,
                title: latestCommit.title,
                date: latestCommit.committed_date,
                author: latestCommit.author_name,
                webUrl: latestCommit.web_url,
              }
            : null,
          latestTag: matchingTag
            ? {
                name: matchingTag.name,
                date: matchingTag.commit ? matchingTag.commit.committed_date : null,
              }
            : null,
        };
      } catch (e) {
        return {
          path: cleanPath,
          name: cleanPath,
          error: e.message,
        };
      }
    })
  );

  return {
    workspaces: workspaceDetails.filter(Boolean),
    totalWorkspaces: workspaceDetails.filter(Boolean).length,
  };
}

async function findStimulusVersion(gitlabUrl, token, projectId, ref, customPath) {
  const candidatePaths = [
    customPath,
    'stimulus/src/packages/package.json',
    'stimulus/src/packages/packagejson',
    'packages/stimulus/package.json',
    'src/packages/stimulus/package.json',
    'stimulus/package.json',
    'packages/stimulus/src/package.json',
    'src/packages/package.json',
    'packages/package.json',
  ].filter(Boolean);

  for (const p of candidatePaths) {
    try {
      const ver = await gitlabApi.getPackageVersion(gitlabUrl, token, projectId, ref, p);
      if (ver) return { path: p, version: ver };
    } catch {}
  }
  return null;
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

      const [commit, tag, pkgVersion, pipeline, stimulusInfo] = await Promise.all([
        gitlabApi.getLatestCommit(gitlabUrl, token, info.id, ref),
        gitlabApi.getLatestTag(gitlabUrl, token, info.id).catch(() => null),
        gitlabApi.getPackageVersion(gitlabUrl, token, info.id, ref, pkgPath),
        gitlabApi.getLatestPipeline(gitlabUrl, token, info.id, ref).catch(() => null),
        findStimulusVersion(gitlabUrl, token, info.id, ref, p.stimulusPath),
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
        stimulusVersion: stimulusInfo ? stimulusInfo.version : null,
        stimulusPath: stimulusInfo ? stimulusInfo.path : null,
        pipeline: pipeline ? { id: pipeline.id, status: pipeline.status, webUrl: pipeline.web_url } : null,
      };

      if (p.type === 'subtree' && p.subtreePath && p.basePath) {
        try {
          out.subtree = await getSubtreeStatus(gitlabUrl, token, info.id, ref, p.subtreePath, p.basePath, pkgPath);
        } catch (e) {
          out.subtree = { error: e.message };
        }
      }

      if (p.type === 'monorepo') {
        try {
          out.monorepo = await getMonorepoStatus(gitlabUrl, token, info.id, ref);
        } catch (e) {
          out.monorepo = { error: e.message, workspaces: [] };
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
  const { gitlabUrl, token, projectPath, projectId, state } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const mrs = await gitlabApi.getMergeRequests(gitlabUrl, token, pId, state || 'opened');
    res.json({
      mergeRequests: mrs.map((mr) => ({
        id: mr.iid,
        title: mr.title,
        state: mr.state,
        author: mr.author?.name || 'Unknown',
        authorAvatar: mr.author?.avatar_url || '',
        assignee: mr.assignee ? { id: mr.assignee.id, name: mr.assignee.name, username: mr.assignee.username, avatarUrl: mr.assignee.avatar_url } : null,
        assignees: (mr.assignees || []).map((a) => ({ id: a.id, name: a.name, username: a.username, avatarUrl: a.avatar_url })),
        reviewers: (mr.reviewers || []).map((r) => ({ id: r.id, name: r.name, username: r.username, avatarUrl: r.avatar_url })),
        createdAt: mr.created_at,
        updatedAt: mr.updated_at,
        webUrl: mr.web_url,
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
        labels: mr.labels || [],
        reviews: mr.reviews_state || '',
        hasConflicts: mr.has_conflicts,
        detailedMergeStatus: mr.detailed_merge_status,
        mergeStatus: mr.merge_status,
        draft: mr.draft || mr.work_in_progress,
      })),
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getMergeRequestDetails(req, res) {
  const { gitlabUrl, token, projectPath, projectId, mrIid } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const mr = await gitlabApi.getMergeRequestDetails(gitlabUrl, token, pId, mrIid);
    res.json({
      mergeRequest: {
        id: mr.iid,
        title: mr.title,
        description: mr.description || '',
        state: mr.state,
        author: mr.author?.name || 'Unknown',
        authorUsername: mr.author?.username || '',
        authorAvatar: mr.author?.avatar_url || '',
        assignee: mr.assignee ? { id: mr.assignee.id, name: mr.assignee.name, username: mr.assignee.username, avatarUrl: mr.assignee.avatar_url } : null,
        assignees: (mr.assignees || []).map((a) => ({ id: a.id, name: a.name, username: a.username, avatarUrl: a.avatar_url })),
        reviewers: (mr.reviewers || []).map((r) => ({ id: r.id, name: r.name, username: r.username, avatarUrl: r.avatar_url })),
        createdAt: mr.created_at,
        updatedAt: mr.updated_at,
        mergedAt: mr.merged_at,
        mergedBy: mr.merged_by?.name || null,
        closedAt: mr.closed_at,
        webUrl: mr.web_url,
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
        labels: mr.labels || [],
        hasConflicts: mr.has_conflicts,
        detailedMergeStatus: mr.detailed_merge_status,
        mergeStatus: mr.merge_status,
        mergeError: mr.merge_error,
        shouldRemoveSourceBranch: mr.should_remove_source_branch,
        forceRemoveSourceBranch: mr.force_remove_source_branch,
        squash: mr.squash,
        draft: mr.draft || mr.work_in_progress,
        divergedCommitsCount: mr.diverged_commits_count,
        changesCount: mr.changes_count,
        userCanMerge: mr.user?.can_merge !== false,
      },
    });
  } catch (e) {
    console.error('getMergeRequestDetails error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getMergeRequestChanges(req, res) {
  const { gitlabUrl, token, projectPath, projectId, mrIid } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const [mrWithChanges, commits] = await Promise.all([
      gitlabApi.getMergeRequestChanges(gitlabUrl, token, pId, mrIid),
      gitlabApi.getMergeRequestCommits(gitlabUrl, token, pId, mrIid).catch(() => []),
    ]);

    const changes = (mrWithChanges.changes || []).map((c) => ({
      oldPath: c.old_path,
      newPath: c.new_path,
      aMode: c.a_mode,
      bMode: c.b_mode,
      newFile: Boolean(c.new_file),
      renamedFile: Boolean(c.renamed_file),
      deletedFile: Boolean(c.deleted_file),
      diff: c.diff || '',
    }));

    res.json({
      changesCount: mrWithChanges.changes_count || changes.length || 0,
      changes: changes,
      commits: (commits || []).map((c) => ({
        id: c.id,
        shortId: c.short_id,
        title: c.title,
        author: c.author_name,
        date: c.committed_date,
      })),
    });
  } catch (e) {
    console.error('getMergeRequestChanges error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getProjectMembers(req, res) {
  const { gitlabUrl, token, projectPath, projectId } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    let [members, currentUser] = await Promise.all([
      gitlabApi.getProjectMembers(gitlabUrl, token, pId).catch(() => []),
      gitlabApi.getCurrentUser(gitlabUrl, token).catch(() => null),
    ]);

    // Ensure member list is deduplicated and formatted
    const memberMap = new Map();
    (members || []).forEach((m) => {
      if (m && m.id && !memberMap.has(m.id)) {
        memberMap.set(m.id, {
          id: m.id,
          name: m.name || m.username,
          username: m.username,
          avatarUrl: m.avatar_url || '',
          state: m.state || 'active',
        });
      }
    });

    // If currentUser is valid and not yet in list, also make sure we include them
    if (currentUser && currentUser.id && !memberMap.has(currentUser.id)) {
      memberMap.set(currentUser.id, {
        id: currentUser.id,
        name: currentUser.name || currentUser.username,
        username: currentUser.username,
        avatarUrl: currentUser.avatar_url || '',
        state: currentUser.state || 'active',
      });
    }

    res.json({
      members: Array.from(memberMap.values()),
      currentUser: currentUser ? {
        id: currentUser.id,
        name: currentUser.name || currentUser.username,
        username: currentUser.username,
        avatarUrl: currentUser.avatar_url || '',
      } : null,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function createProjectMergeRequest(req, res) {
  const {
    gitlabUrl,
    token,
    projectPath,
    projectId,
    sourceBranch,
    targetBranch,
    title,
    description,
    labels,
    assigneeId,
    reviewerIds,
    removeSourceBranch,
    squash,
  } = req.body;

  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const payload = {
      source_branch: sourceBranch,
      target_branch: targetBranch,
      title,
      description: description || '',
      labels: Array.isArray(labels) ? labels.join(',') : labels || '',
      remove_source_branch: removeSourceBranch || false,
      squash: squash || false,
    };
    if (assigneeId) payload.assignee_id = assigneeId;
    if (reviewerIds && reviewerIds.length > 0) payload.reviewer_ids = reviewerIds;

    const mr = await gitlabApi.createMergeRequest(gitlabUrl, token, pId, payload);

    res.json({
      success: true,
      mergeRequest: {
        id: mr.iid,
        title: mr.title,
        state: mr.state,
        webUrl: mr.web_url,
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
      },
    });
  } catch (e) {
    console.error('createProjectMergeRequest error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function mergeProjectMergeRequest(req, res) {
  const {
    gitlabUrl,
    token,
    projectPath,
    projectId,
    mrIid,
    commitMessage,
    squash,
    shouldRemoveSourceBranch,
  } = req.body;

  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const mr = await gitlabApi.acceptMergeRequest(gitlabUrl, token, pId, mrIid, {
      merge_commit_message: commitMessage || undefined,
      squash: squash != null ? squash : undefined,
      should_remove_source_branch: shouldRemoveSourceBranch != null ? shouldRemoveSourceBranch : undefined,
    });

    res.json({
      success: true,
      mergeRequest: {
        id: mr.iid,
        title: mr.title,
        state: mr.state,
        webUrl: mr.web_url,
      },
    });
  } catch (e) {
    console.error('mergeProjectMergeRequest error:', e.message);
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

async function getProjectBranches(req, res) {
  const { gitlabUrl, token, projectPath, projectId } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const branches = await gitlabApi.getBranches(gitlabUrl, token, pId);
    res.json({
      branches: (branches || []).map((b) => ({
        name: b.name,
        default: b.default,
        merged: b.merged,
        protected: b.protected,
        webUrl: b.web_url,
        commit: b.commit ? {
          id: b.commit.id,
          shortId: b.commit.short_id,
          title: b.commit.title,
          author: b.commit.author_name,
          date: b.commit.committed_date,
        } : null,
      })),
    });
  } catch (e) {
    console.error('getProjectBranches error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getProjectCommits(req, res) {
  const { gitlabUrl, token, projectPath, projectId, ref, page = 1, perPage = 30 } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const commits = await gitlabApi.getCommits(gitlabUrl, token, pId, ref, page, perPage);
    const parsedCommits = (commits || []).map((c) => ({
      id: c.id,
      shortId: c.short_id,
      title: c.title,
      message: c.message,
      author: c.author_name,
      authorEmail: c.author_email,
      date: c.committed_date,
      webUrl: c.web_url,
    }));
    res.json({
      commits: parsedCommits,
      page: Number(page),
      hasMore: Array.isArray(commits) && commits.length >= Number(perPage),
    });
  } catch (e) {
    console.error('getProjectCommits error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getProjectTags(req, res) {
  const { gitlabUrl, token, projectPath, projectId } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const tags = await gitlabApi.getTags(gitlabUrl, token, pId);
    res.json({
      tags: (tags || []).map((t) => ({
        name: t.name,
        message: t.message,
        target: t.target,
        commit: t.commit ? {
          id: t.commit.id,
          shortId: t.commit.short_id,
          title: t.commit.title,
          author: t.commit.author_name,
          date: t.commit.committed_date,
        } : null,
        release: t.release ? {
          tagName: t.release.tag_name,
          description: t.release.description,
        } : null,
      })),
    });
  } catch (e) {
    console.error('getProjectTags error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getBranchStatus(req, res) {
  const { gitlabUrl, token, projectPath, projectId, ref, subtreePath, basePath, packageJsonPath } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const pkgPath = packageJsonPath || 'package.json';

    const [commit, tag, pkgVersion, stimulusInfo] = await Promise.all([
      gitlabApi.getLatestCommit(gitlabUrl, token, pId, ref),
      gitlabApi.getLatestTag(gitlabUrl, token, pId).catch(() => null),
      gitlabApi.getPackageVersion(gitlabUrl, token, pId, ref, pkgPath),
      findStimulusVersion(gitlabUrl, token, pId, ref, req.body.stimulusPath),
    ]);

    const result = {
      ref,
      commitSha: commit ? commit.short_id : null,
      commitFullSha: commit ? commit.id : null,
      commitDate: commit ? commit.committed_date : null,
      commitAuthor: commit ? commit.author_name : null,
      commitTitle: commit ? commit.title : null,
      latestTag: tag ? tag.name : null,
      packageVersion: pkgVersion,
      stimulusVersion: stimulusInfo ? stimulusInfo.version : null,
      stimulusPath: stimulusInfo ? stimulusInfo.path : null,
    };

    if (subtreePath && basePath) {
      try {
        result.subtree = await getSubtreeStatus(gitlabUrl, token, pId, ref, subtreePath, basePath, pkgPath);
      } catch (e) {
        result.subtree = { error: e.message };
      }
    }

    if (req.body.type === 'monorepo' || req.body.isMonorepo) {
      try {
        result.monorepo = await getMonorepoStatus(gitlabUrl, token, pId, ref);
      } catch (e) {
        result.monorepo = { error: e.message, workspaces: [] };
      }
    }

    res.json(result);
  } catch (e) {
    console.error('getBranchStatus error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function createProjectTag(req, res) {
  const { gitlabUrl, token, projectPath, projectId, tagName, ref, message, releaseDescription } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const payload = {
      tag_name: tagName,
      ref: ref,
    };
    if (message && message.trim()) payload.message = message.trim();
    if (releaseDescription && releaseDescription.trim()) payload.release_description = releaseDescription.trim();

    const tag = await gitlabApi.createTag(gitlabUrl, token, pId, payload);
    res.json({
      success: true,
      tag: {
        name: tag.name,
        message: tag.message,
        target: tag.target,
        commit: tag.commit ? {
          id: tag.commit.id,
          shortId: tag.commit.short_id,
          title: tag.commit.title,
          author: tag.commit.author_name,
          date: tag.commit.committed_date,
        } : null,
        release: tag.release ? {
          tagName: tag.release.tag_name,
          description: tag.release.description,
        } : null,
      },
    });
  } catch (e) {
    console.error('createProjectTag error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function deleteProjectTag(req, res) {
  const { gitlabUrl, token, projectPath, projectId, tagName } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    await gitlabApi.deleteTag(gitlabUrl, token, pId, tagName);
    res.json({ success: true, tagName });
  } catch (e) {
    console.error('deleteProjectTag error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

async function getCommitDetails(req, res) {
  const { gitlabUrl, token, projectPath, projectId, sha } = req.body;
  try {
    const pId = projectId || (await gitlabApi.getProjectInfo(gitlabUrl, token, projectPath)).id;
    const [commit, diffs, refs] = await Promise.all([
      gitlabApi.getCommit(gitlabUrl, token, pId, sha),
      gitlabApi.getCommitDiff(gitlabUrl, token, pId, sha).catch(() => []),
      gitlabApi.getCommitRefs(gitlabUrl, token, pId, sha).catch(() => []),
    ]);

    // Parse diffs and calculate additions / deletions
    let totalAdds = 0;
    let totalDels = 0;
    const formattedDiffs = (diffs || []).map((d) => {
      let add = 0;
      let del = 0;
      if (d.diff) {
        const lines = d.diff.split('\n');
        for (const line of lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) add++;
          else if (line.startsWith('-') && !line.startsWith('---')) del++;
        }
      }
      totalAdds += add;
      totalDels += del;
      return {
        diff: d.diff,
        newPath: d.new_path,
        oldPath: d.old_path,
        newFile: Boolean(d.new_file),
        renamedFile: Boolean(d.renamed_file),
        deletedFile: Boolean(d.deleted_file),
        aMode: d.a_mode,
        bMode: d.b_mode,
        additions: add,
        deletions: del,
      };
    });

    const additions = (commit.stats && commit.stats.additions != null) ? commit.stats.additions : totalAdds;
    const deletions = (commit.stats && commit.stats.deletions != null) ? commit.stats.deletions : totalDels;

    const branches = (refs || []).filter((r) => r.type === 'branch').map((r) => r.name);
    const tags = (refs || []).filter((r) => r.type === 'tag').map((r) => r.name);

    res.json({
      commit: {
        id: commit.id,
        shortId: commit.short_id,
        title: commit.title,
        message: commit.message,
        authorName: commit.author_name,
        authorEmail: commit.author_email,
        authoredDate: commit.authored_date,
        committerName: commit.committer_name,
        committerEmail: commit.committer_email,
        committedDate: commit.committed_date,
        parentIds: commit.parent_ids || [],
        webUrl: commit.web_url,
        stats: {
          additions,
          deletions,
          total: additions + deletions,
          changedFiles: formattedDiffs.length,
        },
        branches,
        tags,
      },
      diffs: formattedDiffs,
    });
  } catch (e) {
    console.error('getCommitDetails error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}

module.exports = {
  testConnection,
  checkAll,
  listProjects,
  getProjectMergeRequests,
  getMergeRequestDetails,
  getMergeRequestChanges,
  getProjectMembers,
  createProjectMergeRequest,
  mergeProjectMergeRequest,
  getProjectIssues,
  getProjectBranches,
  getProjectCommits,
  getCommitDetails,
  getProjectTags,
  createProjectTag,
  deleteProjectTag,
  getBranchStatus,
};
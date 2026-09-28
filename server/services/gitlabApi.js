// Raw GitLab API calls — nothing but fetch + parse

function cleanBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

async function gitlabGet(gitlabUrl, token, apiPath) {
  const url = `${cleanBaseUrl(gitlabUrl)}/api/v4${apiPath}`;
  const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`GitLab API ${res.status} for ${apiPath}: ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function gitlabGetRawText(gitlabUrl, token, apiPath) {
  const url = `${cleanBaseUrl(gitlabUrl)}/api/v4${apiPath}`;
  const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  if (!res.ok) {
    const err = new Error(`GitLab API ${res.status} for ${apiPath}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

async function gitlabPost(gitlabUrl, token, apiPath, body) {
  const url = `${cleanBaseUrl(gitlabUrl)}/api/v4${apiPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitLab API ${res.status} for ${apiPath}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function gitlabPut(gitlabUrl, token, apiPath, body) {
  const url = `${cleanBaseUrl(gitlabUrl)}/api/v4${apiPath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitLab API ${res.status} for ${apiPath}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// --- Convenience wrappers ---

async function getCurrentUser(gitlabUrl, token) {
  return gitlabGet(gitlabUrl, token, '/user');
}

async function getProjectInfo(gitlabUrl, token, projectPath) {
  return gitlabGet(gitlabUrl, token, `/projects/${encodeURIComponent(projectPath)}`);
}

async function getLatestCommit(gitlabUrl, token, projectId, ref) {
  const commits = await gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/repository/commits?ref_name=${encodeURIComponent(ref)}&per_page=1`
  );
  return commits[0] || null;
}

async function getLatestTag(gitlabUrl, token, projectId) {
  const tags = await gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/repository/tags?per_page=1&order_by=updated&sort=desc`
  );
  return tags[0] || null;
}

async function getPackageVersion(gitlabUrl, token, projectId, ref, filePath) {
  try {
    const text = await gitlabGetRawText(
      gitlabUrl, token,
      `/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(ref)}`
    );
    const json = JSON.parse(text);
    return json.version || null;
  } catch (e) {
    return null;
  }
}

async function getLatestPipeline(gitlabUrl, token, projectId, ref) {
  try {
    const pipelines = await gitlabGet(
      gitlabUrl, token,
      `/projects/${encodeURIComponent(projectId)}/pipelines?ref=${encodeURIComponent(ref)}&per_page=1`
    );
    return pipelines[0] || null;
  } catch (e) {
    return null;
  }
}

async function searchCommits(gitlabUrl, token, projectId, query) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/search?scope=commits&search=${encodeURIComponent(query)}`
  );
}

async function getCommitsByPath(gitlabUrl, token, projectId, ref, subtreePath, page, perPage = 100) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/repository/commits?path=${encodeURIComponent(subtreePath)}&ref_name=${encodeURIComponent(ref)}&per_page=${perPage}&page=${page}`
  );
}

async function compareCommits(gitlabUrl, token, projectId, from, to) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/repository/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

async function getBranches(gitlabUrl, token, projectId, page = 1, perPage = 100) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/repository/branches?per_page=${perPage}&page=${page}`
  );
}

async function getCommits(gitlabUrl, token, projectId, ref, page = 1, perPage = 30) {
  const refParam = ref ? `&ref_name=${encodeURIComponent(ref)}` : '';
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/repository/commits?per_page=${perPage}&page=${page}${refParam}`
  );
}

async function getTags(gitlabUrl, token, projectId, page = 1, perPage = 100) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/repository/tags?per_page=${perPage}&page=${page}&order_by=updated&sort=desc`
  );
}

async function listProjects(gitlabUrl, token, search, page = 1, perPage = 20) {
  const params = new URLSearchParams({
    page,
    per_page: perPage,
    membership: true,
    order_by: 'last_activity_at',
    sort: 'desc',
  });
  if (search) params.set('search', search);
  return gitlabGet(
    gitlabUrl, token,
    `/projects?${params.toString()}`
  );
}

async function getMergeRequests(gitlabUrl, token, projectId, state = 'opened', page = 1, perPage = 15) {
  const stateQuery = state && state !== 'all' ? `&state=${encodeURIComponent(state)}` : '';
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/merge_requests?order_by=updated_at&sort=desc&per_page=${perPage}&page=${page}${stateQuery}`
  );
}

async function getMergeRequestDetails(gitlabUrl, token, projectId, mrIid) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/merge_requests/${encodeURIComponent(mrIid)}?include_diverged_commits_count=true&render_html=true`
  );
}

async function getMergeRequestChanges(gitlabUrl, token, projectId, mrIid) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/merge_requests/${encodeURIComponent(mrIid)}/changes`
  );
}

async function getMergeRequestCommits(gitlabUrl, token, projectId, mrIid) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/merge_requests/${encodeURIComponent(mrIid)}/commits`
  );
}

async function createMergeRequest(gitlabUrl, token, projectId, data) {
  return gitlabPost(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/merge_requests`,
    data
  );
}

async function acceptMergeRequest(gitlabUrl, token, projectId, mrIid, data = {}) {
  return gitlabPut(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/merge_requests/${encodeURIComponent(mrIid)}/merge`,
    data
  );
}

async function getIssues(gitlabUrl, token, projectId, state = 'opened', page = 1, perPage = 10) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/issues?state=${state}&order_by=updated_at&sort=desc&per_page=${perPage}&page=${page}`
  );
}

async function getProjectMembers(gitlabUrl, token, projectId) {
  // 1. Try project users endpoint (returns all users with project access)
  try {
    const users = await gitlabGet(
      gitlabUrl, token,
      `/projects/${encodeURIComponent(projectId)}/users?per_page=100`
    );
    if (Array.isArray(users) && users.length > 0) return users;
  } catch (e) {
    // continue fallback
  }

  // 2. Try inherited + direct members endpoint
  try {
    const membersAll = await gitlabGet(
      gitlabUrl, token,
      `/projects/${encodeURIComponent(projectId)}/members/all?per_page=100`
    );
    if (Array.isArray(membersAll) && membersAll.length > 0) return membersAll;
  } catch (e) {
    // continue fallback
  }

  // 3. Try direct members endpoint
  try {
    const directMembers = await gitlabGet(
      gitlabUrl, token,
      `/projects/${encodeURIComponent(projectId)}/members?per_page=100`
    );
    if (Array.isArray(directMembers) && directMembers.length > 0) return directMembers;
  } catch (e) {
    // continue fallback
  }

  // 4. Try global users endpoint
  try {
    const globalUsers = await gitlabGet(
      gitlabUrl, token,
      `/users?active=true&per_page=100`
    );
    if (Array.isArray(globalUsers) && globalUsers.length > 0) return globalUsers;
  } catch (e) {
    // continue fallback
  }

  return [];
}

async function getRawFileContent(gitlabUrl, token, projectId, filePath, ref) {
  return gitlabGetRawText(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(ref)}`
  );
}

async function getRecentActivity(gitlabUrl, token, projectId, perPage = 10) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${encodeURIComponent(projectId)}/events?action=pushed_event&per_page=${perPage}`
  );
}

module.exports = {
  getCurrentUser,
  getProjectInfo,
  getLatestCommit,
  getLatestTag,
  getPackageVersion,
  getLatestPipeline,
  searchCommits,
  getCommitsByPath,
  compareCommits,
  getBranches,
  getCommits,
  getTags,
  listProjects,
  getMergeRequests,
  getMergeRequestDetails,
  getMergeRequestChanges,
  getMergeRequestCommits,
  createMergeRequest,
  acceptMergeRequest,
  getProjectMembers,
  getRawFileContent,
  getIssues,
  getRecentActivity,
};
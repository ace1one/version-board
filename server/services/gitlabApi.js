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
    `/projects/${projectId}/repository/commits?ref_name=${encodeURIComponent(ref)}&per_page=1`
  );
  return commits[0] || null;
}

async function getLatestTag(gitlabUrl, token, projectId) {
  const tags = await gitlabGet(
    gitlabUrl, token,
    `/projects/${projectId}/repository/tags?per_page=1&order_by=updated&sort=desc`
  );
  return tags[0] || null;
}

async function getPackageVersion(gitlabUrl, token, projectId, ref, filePath) {
  try {
    const text = await gitlabGetRawText(
      gitlabUrl, token,
      `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(ref)}`
    );
    const json = JSON.parse(text);
    return json.version || null;
  } catch (e) {
    return null;
  }
}

async function searchCommits(gitlabUrl, token, projectId, query) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${projectId}/search?scope=commits&search=${encodeURIComponent(query)}`
  );
}

async function getCommitsByPath(gitlabUrl, token, projectId, ref, subtreePath, page, perPage = 100) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${projectId}/repository/commits?path=${encodeURIComponent(subtreePath)}&ref_name=${encodeURIComponent(ref)}&per_page=${perPage}&page=${page}`
  );
}

async function compareCommits(gitlabUrl, token, projectId, from, to) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${projectId}/repository/compare?from=${from}&to=${encodeURIComponent(to)}`
  );
}

async function getTags(gitlabUrl, token, projectId, page, perPage = 100) {
  return gitlabGet(
    gitlabUrl, token,
    `/projects/${projectId}/repository/tags?per_page=${perPage}&page=${page}`
  );
}

module.exports = {
  getCurrentUser,
  getProjectInfo,
  getLatestCommit,
  getLatestTag,
  getPackageVersion,
  searchCommits,
  getCommitsByPath,
  compareCommits,
  getTags,
};
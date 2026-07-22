// const express = require('express');
// const path = require('path');

// const app = express();
// app.use(express.json({ limit: '2mb' }));
// app.use(express.static(path.join(__dirname, 'public')));

// const PORT = process.env.PORT || 4545;

// // ---------- GitLab API helpers ----------

// function cleanBaseUrl(url) {
//   return url.replace(/\/+$/, '');
// }

// async function gitlabGet(gitlabUrl, token, apiPath) {
//   const url = `${cleanBaseUrl(gitlabUrl)}/api/v4${apiPath}`;
//   const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
//   if (!res.ok) {
//     const body = await res.text().catch(() => '');
//     const err = new Error(`GitLab API ${res.status} for ${apiPath}: ${body.slice(0, 300)}`);
//     err.status = res.status;
//     throw err;
//   }
//   return res.json();
// }

// async function gitlabGetRawText(gitlabUrl, token, apiPath) {
//   const url = `${cleanBaseUrl(gitlabUrl)}/api/v4${apiPath}`;
//   const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
//   if (!res.ok) {
//     const err = new Error(`GitLab API ${res.status} for ${apiPath}`);
//     err.status = res.status;
//     throw err;
//   }
//   return res.text();
// }

// async function getProjectInfo(gitlabUrl, token, projectPath) {
//   return gitlabGet(gitlabUrl, token, `/projects/${encodeURIComponent(projectPath)}`);
// }

// async function getLatestCommit(gitlabUrl, token, projectId, ref) {
//   const commits = await gitlabGet(
//     gitlabUrl, token,
//     `/projects/${projectId}/repository/commits?ref_name=${encodeURIComponent(ref)}&per_page=1`
//   );
//   return commits[0] || null;
// }

// async function getLatestTag(gitlabUrl, token, projectId) {
//   const tags = await gitlabGet(
//     gitlabUrl, token,
//     `/projects/${projectId}/repository/tags?per_page=1&order_by=updated&sort=desc`
//   );
//   return tags[0] || null;
// }

// async function getPackageVersion(gitlabUrl, token, projectId, ref, filePath) {
//   try {
//     const text = await gitlabGetRawText(
//       gitlabUrl, token,
//       `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(ref)}`
//     );
//     const json = JSON.parse(text);
//     return json.version || null;
//   } catch (e) {
//     return null; // file may not exist, or isn't valid JSON - that's fine
//   }
// }

// // Parses git-subtree squash commit messages to find the base SHA that was pulled in.
// // Handles both:
// //   Squashed 'prefix/' content from commit <sha>          (git subtree add)
// //   Squashed 'prefix/' changes from <sha1>..<sha2>          (git subtree pull / merge)
// function extractSubtreeSha(message) {
//   if (!message) return null;
//   let m = message.match(/Squashed '.*?' changes from [0-9a-f]+\.\.([0-9a-f]+)/i);
//   if (m) return m[1];
//   m = message.match(/Squashed '.*?' content from commit ([0-9a-f]+)/i);
//   if (m) return m[1];
//   return null;
// }

// // async function getSubtreeStatus(gitlabUrl, token, mainProjectId, mainRef, subtreePath, baseProjectPath) {
// //   const commits = await gitlabGet(
// //     gitlabUrl, token,
// //     `/projects/${mainProjectId}/repository/commits?path=${encodeURIComponent(subtreePath)}&ref_name=${encodeURIComponent(mainRef)}&per_page=20`
// //   );

// //   let baseSha = null;
// //   let foundCommit = null;
// //   for (const c of commits) {
// //     const sha = extractSubtreeSha(c.message);
// //     if (sha) {
// //       baseSha = sha;
// //       foundCommit = c;
// //       break;
// //     }
// //   }

// //   if (!baseSha) {
// //     return {
// //       error: 'Could not find a git-subtree squash commit in the last 20 commits touching this path. ' +
// //              'Try increasing history depth or check the subtree path is correct.'
// //     };
// //   }

// //   const baseProject = await getProjectInfo(gitlabUrl, token, baseProjectPath);
// //   const baseLatest = await getLatestCommit(gitlabUrl, token, baseProject.id, baseProject.default_branch);

// //   const upToDate = baseLatest && (baseLatest.id === baseSha || baseLatest.id.startsWith(baseSha) || baseSha.startsWith(baseLatest.short_id));

// //   const result = {
// //     pulledSha: baseSha,
// //     pulledAt: foundCommit.committed_date,
// //     pulledCommitTitle: foundCommit.title,
// //     baseProjectPath,
// //     baseDefaultBranch: baseProject.default_branch,
// //     baseLatestSha: baseLatest ? baseLatest.id : null,
// //     baseLatestDate: baseLatest ? baseLatest.committed_date : null,
// //     upToDate: !!upToDate,
// //   };

// //   if (!upToDate) {
// //     try {
// //       const compare = await gitlabGet(
// //         gitlabUrl, token,
// //         `/projects/${baseProject.id}/repository/compare?from=${baseSha}&to=${encodeURIComponent(baseProject.default_branch)}`
// //       );
// //       const commitsBehind = compare.commits || [];
// //       result.behindCount = commitsBehind.length;
// //       result.behindCommits = commitsBehind.slice(-10).reverse().map(c => ({
// //         sha: c.short_id,
// //         title: c.title,
// //         date: c.committed_date,
// //         author: c.author_name,
// //       }));
// //     } catch (e) {
// //       result.behindCountError = e.message;
// //     }
// //   }

// //   return result;
// // }

// // ---------- Routes ----------

// async function findSquashCommitViaSearch(gitlabUrl, token, mainProjectId, mainRef, subtreePath) {
//   // GitLab's commit search greps commit messages directly (works on CE without Elasticsearch too),
//   // so it isn't limited by how many commits touched the path in a --follow sense.
//   let hits;
//   try {
//     hits = await gitlabGet(
//       gitlabUrl, token,
//       `/projects/${mainProjectId}/search?scope=commits&search=${encodeURIComponent('Squashed')}`
//     );
//   } catch (e) {
//     return null; // search may be disabled on this instance; caller will fall back
//   }
//   if (!Array.isArray(hits) || hits.length === 0) return null;

//   const prefixNoSlash = subtreePath.replace(/\/+$/, '');
//   // Prefer a hit whose message actually names this subtree prefix, in case the repo has multiple subtrees.
//   let candidates = hits.filter((c) => c.message && c.message.includes(prefixNoSlash));
//   if (candidates.length === 0) candidates = hits;

//   candidates.sort((a, b) => new Date(b.committed_date) - new Date(a.committed_date));
//   for (const c of candidates) {
//     const sha = extractSubtreeSha(c.message);
//     if (sha) return { sha, commit: c };
//   }
//   return null;
// }

// async function findSquashCommitViaPathScan(gitlabUrl, token, mainProjectId, mainRef, subtreePath) {
//   let page = 1;
//   const perPage = 100;
//   const maxPages = 5; // scan up to 500 commits touching this path before giving up
//   while (page <= maxPages) {
//     const commits = await gitlabGet(
//       gitlabUrl, token,
//       `/projects/${mainProjectId}/repository/commits?path=${encodeURIComponent(subtreePath)}&ref_name=${encodeURIComponent(mainRef)}&per_page=${perPage}&page=${page}`
//     );
//     if (!commits.length) break;
//     for (const c of commits) {
//       const sha = extractSubtreeSha(c.message);
//       if (sha) return { sha, commit: c };
//     }
//     if (commits.length < perPage) break;
//     page += 1;
//   }
//   return null;
// }

// async function getSubtreeStatus(gitlabUrl, token, mainProjectId, mainRef, subtreePath, baseProjectPath) {
//   let found = await findSquashCommitViaSearch(gitlabUrl, token, mainProjectId, mainRef, subtreePath);
//   if (!found) {
//     found = await findSquashCommitViaPathScan(gitlabUrl, token, mainProjectId, mainRef, subtreePath);
//   }

//   const baseSha = found ? found.sha : null;
//   const foundCommit = found ? found.commit : null;

//   if (!baseSha) {
//     return {
//       error: 'Could not find a git-subtree squash commit for this path (searched commit messages and scanned up to 500 commits touching the path). ' +
//              'Double-check the subtree prefix matches exactly what was passed to --prefix (including trailing slash), e.g. "projects/base-client/".'
//     };
//   }

//   const baseProject = await getProjectInfo(gitlabUrl, token, baseProjectPath);
//   const baseLatest = await getLatestCommit(gitlabUrl, token, baseProject.id, baseProject.default_branch);

//   const upToDate = baseLatest && (baseLatest.id === baseSha || baseLatest.id.startsWith(baseSha) || baseSha.startsWith(baseLatest.short_id));

//   const result = {
//     pulledSha: baseSha,
//     pulledAt: foundCommit.committed_date,
//     pulledCommitTitle: foundCommit.title,
//     baseProjectPath,
//     baseDefaultBranch: baseProject.default_branch,
//     baseLatestSha: baseLatest ? baseLatest.id : null,
//     baseLatestDate: baseLatest ? baseLatest.committed_date : null,
//     upToDate: !!upToDate,
//   };

//   if (!upToDate) {
//     try {
//       const compare = await gitlabGet(
//         gitlabUrl, token,
//         `/projects/${baseProject.id}/repository/compare?from=${baseSha}&to=${encodeURIComponent(baseProject.default_branch)}`
//       );
//       const commitsBehind = compare.commits || [];
//       result.behindCount = commitsBehind.length;
//       result.behindCommits = commitsBehind.slice(-10).reverse().map(c => ({
//         sha: c.short_id,
//         title: c.title,
//         date: c.committed_date,
//         author: c.author_name,
//       }));
//     } catch (e) {
//       result.behindCountError = e.message;
//     }
//   }

//   return result;
// }



// app.post('/api/test-connection', async (req, res) => {
//   const { gitlabUrl, token } = req.body;
//   try {
//     const user = await gitlabGet(gitlabUrl, token, '/user');
//     res.json({ ok: true, user: { username: user.username, name: user.name } });
//   } catch (e) {
//     res.status(e.status || 500).json({ ok: false, error: e.message });
//   }
// });

// app.post('/api/check-all', async (req, res) => {
//   const { gitlabUrl, token, projects, packageJsonPath } = req.body;
//   if (!gitlabUrl || !token || !Array.isArray(projects)) {
//     return res.status(400).json({ error: 'gitlabUrl, token, and projects[] are required' });
//   }

//   const pkgPath = packageJsonPath || 'package.json';

//   const results = await Promise.all(projects.map(async (p) => {
//     const base = { key: p.path, label: p.name || p.path, type: p.type || 'normal' };
//     try {
//       const info = await getProjectInfo(gitlabUrl, token, p.path);
//       const ref = p.ref || info.default_branch;

//       const [commit, tag, pkgVersion] = await Promise.all([
//         getLatestCommit(gitlabUrl, token, info.id, ref),
//         getLatestTag(gitlabUrl, token, info.id).catch(() => null),
//         getPackageVersion(gitlabUrl, token, info.id, ref, pkgPath),
//       ]);

//       const out = {
//         ...base,
//         ok: true,
//         webUrl: info.web_url,
//         defaultBranch: ref,
//         commitSha: commit ? commit.short_id : null,
//         commitFullSha: commit ? commit.id : null,
//         commitDate: commit ? commit.committed_date : null,
//         commitAuthor: commit ? commit.author_name : null,
//         commitTitle: commit ? commit.title : null,
//         latestTag: tag ? tag.name : null,
//         tagDate: tag ? (tag.commit && tag.commit.committed_date) : null,
//         packageVersion: pkgVersion,
//       };

//       if (p.type === 'subtree' && p.subtreePath && p.basePath) {
//         try {
//           out.subtree = await getSubtreeStatus(gitlabUrl, token, info.id, ref, p.subtreePath, p.basePath);
//         } catch (e) {
//           out.subtree = { error: e.message };
//         }
//       }

//       return out;
//     } catch (e) {
//       return { ...base, ok: false, error: e.message };
//     }
//   }));

//   res.json({ results });
// });

// app.listen(PORT, () => {
//   console.log(`GitLab Version Tracker running at http://localhost:${PORT}`);
// });
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));

// Serve React app static files (built output)
const reactDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(reactDist));

const PORT = process.env.PORT || 4545;

// ---------- GitLab API helpers ----------

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
    return null; // file may not exist, or isn't valid JSON - that's fine
  }
}

// Parses git-subtree squash commit messages to find the base SHA that was pulled in.
// Handles both:
//   Squashed 'prefix/' content from commit <sha>          (git subtree add)
//   Squashed 'prefix/' changes from <sha1>..<sha2>          (git subtree pull / merge)
function extractSubtreeSha(message) {
  if (!message) return null;
  let m = message.match(/Squashed '.*?' changes from [0-9a-f]+\.\.([0-9a-f]+)/i);
  if (m) return m[1];
  m = message.match(/Squashed '.*?' content from commit ([0-9a-f]+)/i);
  if (m) return m[1];
  return null;
}

async function findSquashCommitViaSearch(gitlabUrl, token, mainProjectId, mainRef, subtreePath) {
  // GitLab's commit search greps commit messages directly (works on CE without Elasticsearch too),
  // so it isn't limited by how many commits touched the path in a --follow sense.
  let hits;
  try {
    hits = await gitlabGet(
      gitlabUrl, token,
      `/projects/${mainProjectId}/search?scope=commits&search=${encodeURIComponent('Squashed')}`
    );
  } catch (e) {
    return null; // search may be disabled on this instance; caller will fall back
  }
  if (!Array.isArray(hits) || hits.length === 0) return null;

  const prefixNoSlash = subtreePath.replace(/\/+$/, '');
  // Prefer a hit whose message actually names this subtree prefix, in case the repo has multiple subtrees.
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
  const maxPages = 5; // scan up to 500 commits touching this path before giving up
  while (page <= maxPages) {
    const commits = await gitlabGet(
      gitlabUrl, token,
      `/projects/${mainProjectId}/repository/commits?path=${encodeURIComponent(subtreePath)}&ref_name=${encodeURIComponent(mainRef)}&per_page=${perPage}&page=${page}`
    );
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

async function findTagForSha(gitlabUrl, token, projectId, sha) {
  if (!sha) return null;
  try {
    // Tags list is usually small enough to page through fully for a version lookup.
    let page = 1;
    while (page <= 5) {
      const tags = await gitlabGet(gitlabUrl, token, `/projects/${projectId}/repository/tags?per_page=100&page=${page}`);
      if (!tags.length) break;
      const match = tags.find((t) => t.commit && (t.commit.id === sha || t.commit.id.startsWith(sha) || sha.startsWith(t.commit.short_id)));
      if (match) return match.name;
      if (tags.length < 100) break;
      page += 1;
    }
  } catch (e) {
    // ignore - version tag is a nice-to-have, not critical
  }
  return null;
}

async function getSubtreeStatus(gitlabUrl, token, mainProjectId, mainRef, subtreePath, baseProjectPath, basePackageJsonPath) {
  const baseProject = await getProjectInfo(gitlabUrl, token, baseProjectPath);
  const baseLatest = await getLatestCommit(gitlabUrl, token, baseProject.id, baseProject.default_branch);

  // The version actually pulled in, read straight from the subtree's own package.json -
  // this is the most reliable source, independent of whether we can find the squash commit.
  const subtreePkgPath = subtreePath.replace(/\/+$/, '') + '/package.json';
  const pulledVersion = await getPackageVersion(gitlabUrl, token, mainProjectId, mainRef, subtreePkgPath);

  // The latest version available upstream, read from the base project's own package.json.
  const baseLatestVersion = await getPackageVersion(
    gitlabUrl, token, baseProject.id, baseProject.default_branch, basePackageJsonPath || 'package.json'
  );

  const result = {
    pulledVersion,       // e.g. "1.62.2" - version field from projects/base-client/package.json in your repo
    baseProjectPath,
    baseDefaultBranch: baseProject.default_branch,
    baseLatestSha: baseLatest ? baseLatest.id : null,
    baseLatestVersion,   // e.g. "1.64.0" - version field from base project's own package.json
    baseLatestDate: baseLatest ? baseLatest.committed_date : null,
  };

  // Simple, reliable up-to-date check: compare version strings from package.json.
  // Falls back to "unknown" if either side is missing a version field.
  if (pulledVersion && baseLatestVersion) {
    result.upToDate = pulledVersion === baseLatestVersion;
  } else {
    result.upToDate = null; // unknown - couldn't read one or both package.json files
  }

  // Best-effort: also try to find the squash commit, so we can list exactly which commits
  // are missing. This is "nice to have" detail, not required for the version display above.
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
        const compare = await gitlabGet(
          gitlabUrl, token,
          `/projects/${baseProject.id}/repository/compare?from=${found.sha}&to=${encodeURIComponent(baseProject.default_branch)}`
        );
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

// ---------- Routes ----------

app.post('/api/test-connection', async (req, res) => {
  const { gitlabUrl, token } = req.body;
  try {
    const user = await gitlabGet(gitlabUrl, token, '/user');
    res.json({ ok: true, user: { username: user.username, name: user.name } });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/check-all', async (req, res) => {
  const { gitlabUrl, token, projects, packageJsonPath } = req.body;
  if (!gitlabUrl || !token || !Array.isArray(projects)) {
    return res.status(400).json({ error: 'gitlabUrl, token, and projects[] are required' });
  }

  const pkgPath = packageJsonPath || 'package.json';

  const results = await Promise.all(projects.map(async (p) => {
    const base = { key: p.path, label: p.name || p.path, type: p.type || 'normal' };
    try {
      const info = await getProjectInfo(gitlabUrl, token, p.path);
      const ref = p.ref || info.default_branch;

      const [commit, tag, pkgVersion] = await Promise.all([
        getLatestCommit(gitlabUrl, token, info.id, ref),
        getLatestTag(gitlabUrl, token, info.id).catch(() => null),
        getPackageVersion(gitlabUrl, token, info.id, ref, pkgPath),
      ]);

      const out = {
        ...base,
        ok: true,
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
});

// Catch-all for React SPA routing - serve index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(reactDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GitLab Version Tracker running at http://localhost:${PORT}`);
});
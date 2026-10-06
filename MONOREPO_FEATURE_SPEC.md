# Feature Specification: Monorepo & Multi-Bank Workspace Support for GitLab Version Tracker

## 1. Problem Statement
Currently, **GitLab Version Tracker** supports two project types:
1. **Normal**: Assumes `1 repo = 1 root package.json = 1 version`.
2. **Subtree**: Assumes base code was imported via git subtree`.

In multi-tenant monorepos like **BankXP**, a single repository contains multiple bank applications and shared packages:
- `base/package.json`
- `nucleus/package.json`
- `xp-services/package.json`
- `laxmi-bank/package.json`
- `nabil-bank/package.json`
- `nic-asia/package.json`

Because the tracker only reads the root `package.json`(`version: 0.0.0`), it cannot display individual bank versions or know which bank was modified in recent commits.

---

## 2. Target UI Card Design
```text
+--------------------------------------------------------------+ |  BankXP (Monorepo)                           [ Branch: main ] | |  Latest Commit: "fix: laxmi auth" by ashim (10m ago)          |
+--------------------------------------------------------------+ |  WORKSPACES / BANKS                                           | |  * Base:         v2.4.0  (Last changed: 2 days ago)           | |  * Nucleus:      v1.1.2  (Last changed: 5 days ago)           | |  * XP-Services:  v1.0.8  (Last changed: 1 week ago)           | |  ------------------------------------------------------------- | |  * Laxmi Bank:   v1.0.4  (Last changed: 10 mins ago) [Tag: v1.0.4]|
  j  * Nabil Bank:   v1.0.1  (Last changed: 3 weeks ago) [Tag: v1.0.1]|
  j  * NIC Asia:     v1.2.0  (Last changed: 1 month ago) [Tag: v1.2.0]|
+-------------------------------------------------------------+
```

---

## 3. Required Features

### A. Workspace Auto-Discovery (`type: 'monorepo'`)
1. Read the root `package.json` via GitLab API:
   `GET /projects/:id/repository/files/package.json/raw?ref=:branch`
2. Parse the `"workspaces"` field (e.g. `["base", "nucleus", "xp-services", "laxmi-bank", "nabil-bank"]`).
3. For each workspace path, fetch its nested `package.json` to extract `name` and `version`.

### B. Path-Specific Commit Tracking per Bank
In a monorepo, commits happen across different folders. The tracker must check when each bank's folder was last modified using:
`GET /projects/:id/repository/commits?path=<workspace-folder>&ref_name=:branch&per_page=1`

### C. Bank-Specific Tag Matching
Match tags per bank (e.g., tags starting with `laxmi-v*`, `nabil-v*`, `base-v**).

---

## 4. Code Implementation Details

### Backend (`server/controllers/gitlab.js`)
Add a helper function `getMonorepoStatus`:


```javascript
async function getMonorepoStatus(gitlabUrl, token, projectId, ref) {
  // 1. Fetch root package.json
  const rootPkgRaw = await gitlabApi.getRawFileContent(gitlabUrl, token, projectId, 'package.json', ref);
  const rootPkg = JSON.parse(rootPkgRaw);
  const workspaces = rootPkg.workspaces|| [];

  const workspacePaths = Array.isArray(workspaces) ? workspaces : (workspaces.packages || []);

  // 2. Fetch data for each workspace in parallel
  const workspaceDetails = await Promise.all(workspacePaths.map(async (wsPath) => {
    const cleanPath = wsPath.replace(/^\\.\\//, '').replace(/\\/$/, '');
    const pkgFilePath = `${cleanPath}/package.json`;

    try {
      const [pkgText, pathCommits] = await Promise.all([
        gitlabApi.getRawFileContent(gitlabUrl, token, projectId, pkgFilePath, ref).catch(() => null),
        gitlabApi.getCommitsByPath(gitlabUrl, token, projectId, ref, cleanPath, 1, 1).catch(() => [])
      ]);

      if (!pkgText) return null;
      const pkg = JSON.parse(pkgText);
      const latestCommit = pathCommits[0] || null;

      return {
        path: cleanPath,
        name: pkg.name || cleanPath,
        version: pkg.version || '0.0.0',
        latestCommit: latestCommit ? {
          sha: latestCommit.short_id,
          title: latestCommit.title,
          date: latestCommit.committed_date,
          author: latestCommit.author_name
        } : null
      };
    } catch (e) {
      return { path: cleanPath, error: e.message };
    }
  }));

  return workspaceDetails.filter(Boolean);
}
```

### Frontend (`client/src/components/`)
1. **SettingsDrawer.jsx**: Add `"Monorepo (Multi-Bank Workspaces)"` in the Project Type dropdown (`type: 'monorepo'`).
2. **ProjectCard.jsx**: If `project.type === 'monorepo'`, display the list of workspaces with:
   - Bank/Package Name
   - Version from inner `package.json`
   - Last modified commit title and relative timestamp
   - Link to the folder in GitLab

import React, { useState, useEffect, useCallback } from 'react';

export default function SettingsDrawer({ config, onClose, onSave }) {
  const [gitlabUrl, setGitlabUrl] = useState(config.gitlabUrl || '');
  const [token, setToken] = useState(config.token || '');
  const [rememberToken, setRememberToken] = useState(!!config.rememberToken);
  const [packageJsonPath, setPackageJsonPath] = useState(config.packageJsonPath || 'package.json');
  const [defaultSubtreePath, setDefaultSubtreePath] = useState(config.defaultSubtreePath || 'projects/base-client');
  const [defaultSubtreeBasePath, setDefaultSubtreeBasePath] = useState(config.defaultSubtreeBasePath || 'fonebank/banksmart-client-web');
  const [projects, setProjects] = useState(config.projects && config.projects.length > 0 ? [...config.projects] : []);
  const [testResult, setTestResult] = useState('');
  const [testResultClass, setTestResultClass] = useState('');
  const [newlyAddedKey, setNewlyAddedKey] = useState(null);
  const [projectFilter, setProjectFilter] = useState('');

  const [browseSearch, setBrowseSearch] = useState('');
  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  const fetchRepos = useCallback(async (search = '') => {
    if (!gitlabUrl || !token) return;
    setBrowseLoading(true);
    try {
      const res = await fetch('/api/list-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitlabUrl, token, search }),
      });
      const data = await res.json();
      setBrowseResults(data.projects || []);
    } catch (e) {
      setBrowseResults([]);
    } finally {
      setBrowseLoading(false);
    }
  }, [gitlabUrl, token]);

  const handleBrowseSearch = (value) => {
    setBrowseSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => fetchRepos(value), 400);
    setDebounceTimer(timer);
  };

  const detectSubtreeInfo = (repo) => {
    const path = repo.path_with_namespace || repo.path;
    const isSubtree = repo.hasSubtree ||
                      path.includes('bankxp') ||
                      path.includes('banksmart') ||
                      path.split('/').length > 2;

    const subPath = (defaultSubtreePath && defaultSubtreePath.trim()) || 'projects/base-client';
    const bPath = (defaultSubtreeBasePath && defaultSubtreeBasePath.trim()) || 'fonebank/banksmart-client-web';

    return { isSubtree, subtreePath: subPath, basePath: bPath };
  };

  // Add newly selected repo to TOP of the list
  const addFromBrowse = (repo) => {
    const fullPath = repo.path_with_namespace || repo.path;
    const alreadyExists = projects.some((p) => p.path === fullPath);
    if (alreadyExists) return;

    const { isSubtree, subtreePath, basePath } = detectSubtreeInfo(repo);

    const newProject = {
      name: repo.name,
      path: fullPath,
      type: isSubtree ? 'subtree' : 'normal',
      subtreePath: subtreePath,
      basePath: basePath,
    };

    setProjects([newProject, ...projects]);
    setNewlyAddedKey(fullPath);
    setTimeout(() => setNewlyAddedKey(null), 3000);
  };

  // Add new blank manual project to TOP of the list
  const addProject = () => {
    const subPath = (defaultSubtreePath && defaultSubtreePath.trim()) || 'projects/base-client';
    const bPath = (defaultSubtreeBasePath && defaultSubtreeBasePath.trim()) || 'fonebank/banksmart-client-web';
    const newProject = {
      name: '',
      path: '',
      type: 'normal',
      subtreePath: subPath,
      basePath: bPath,
    };
    setProjects([newProject, ...projects]);
  };

  const removeProject = (idx) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  const moveProject = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= projects.length) return;
    const updated = [...projects];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setProjects(updated);
  };

  const updateProject = (idx, fieldOrObj, value) => {
    setProjects((prev) => {
      const updated = [...prev];
      if (typeof fieldOrObj === 'object') {
        updated[idx] = { ...updated[idx], ...fieldOrObj };
      } else {
        updated[idx] = { ...updated[idx], [fieldOrObj]: value };
      }
      return updated;
    });
  };

  const handleTestConnection = async () => {
    setTestResult('Testing…');
    setTestResultClass('');
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitlabUrl, token }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult(`Connected as ${data.user.username}`);
        setTestResultClass('ok');
      } else {
        setTestResult(data.error || 'Failed');
        setTestResultClass('err');
      }
    } catch (e) {
      setTestResult(e.message);
      setTestResultClass('err');
    }
  };

  const handleExportConfig = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      gitlabUrl: gitlabUrl.trim(),
      packageJsonPath: packageJsonPath.trim() || 'package.json',
      defaultSubtreePath: defaultSubtreePath.trim() || 'projects/base-client',
      defaultSubtreeBasePath: defaultSubtreeBasePath.trim() || 'fonebank/banksmart-client-web',
      projects: projects.filter((p) => p.path && p.path.trim()),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `version-board-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.gitlabUrl) setGitlabUrl(imported.gitlabUrl);
        if (imported.packageJsonPath) setPackageJsonPath(imported.packageJsonPath);
        if (imported.defaultSubtreePath) setDefaultSubtreePath(imported.defaultSubtreePath);
        if (imported.defaultSubtreeBasePath) setDefaultSubtreeBasePath(imported.defaultSubtreeBasePath);
        if (Array.isArray(imported.projects)) {
          setProjects(imported.projects);
          alert(`Successfully loaded ${imported.projects.length} project(s) from JSON config! Click "Save & close" to apply.`);
        }
      } catch (err) {
        alert('Invalid JSON configuration file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    const defPath = defaultSubtreePath.trim() || 'projects/base-client';
    const defBase = defaultSubtreeBasePath.trim() || 'fonebank/banksmart-client-web';
    onSave({
      gitlabUrl: gitlabUrl.trim(),
      token: token.trim(),
      rememberToken,
      packageJsonPath: packageJsonPath.trim() || 'package.json',
      defaultSubtreePath: defPath,
      defaultSubtreeBasePath: defBase,
      projects: projects
        .filter((p) => p.path && p.path.trim())
        .map((p) => {
          if (p.type === 'subtree') {
            return {
              ...p,
              subtreePath: (p.subtreePath && p.subtreePath.trim()) || defPath,
              basePath: (p.basePath && p.basePath.trim()) || defBase,
            };
          }
          return p;
        }),
    });
  };

  const subtreeCount = projects.filter((p) => p.type === 'subtree').length;
  const normalCount = projects.length - subtreeCount;

  // Filter projects if search term entered in added section
  const visibleProjects = projects.filter((p) => {
    if (!projectFilter) return true;
    const q = projectFilter.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.path || '').toLowerCase().includes(q);
  });

  return (
    <>
      <style>{`
        .search-container {
          margin-bottom: 24px;
        }
        .search-input-wrapper {
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          background: #0d1117;
          border: 1px solid var(--hairline);
          border-radius: 8px;
          color: var(--text);
          font-size: 13.5px;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .search-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(79, 209, 165, 0.15);
        }
        .search-input::placeholder {
          color: var(--text-faint);
        }
        .repo-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border: 1px solid var(--hairline);
          border-radius: 8px;
          margin-bottom: 8px;
          background: var(--panel-raised);
          transition: all 0.15s ease;
        }
        .repo-card:hover {
          border-color: var(--accent);
          background: #202b33;
        }
        .repo-card.already-added {
          opacity: 0.6;
          background: var(--panel);
        }
        .repo-info {
          flex: 1;
          min-width: 0;
          margin-right: 12px;
        }
        .repo-name {
          font-weight: 600;
          font-size: 13.5px;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .card-path {
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          color: var(--text-muted);
          margin: 3px 0 0 0;
          padding: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .subtree-badge {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(79, 209, 165, 0.15);
          color: var(--accent);
          border: 1px solid rgba(79, 209, 165, 0.3);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .repo-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 5px;
        }
        .visibility-badge {
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .visibility-badge.private { background: #d29922; color: #0d1117; }
        .visibility-badge.internal { background: #a371f7; color: #fff; }
        .visibility-badge.public { background: #3fb950; color: #0d1117; }
        .repo-desc {
          font-size: 11.5px;
          color: var(--text-faint);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 320px;
        }
        .btn-add {
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 600;
          white-space: nowrap;
          background: var(--accent);
          color: #0E1316;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-add:hover {
          background: #65dfb7;
          transform: translateY(-1px);
        }
        .added-tag {
          font-size: 11.5px;
          color: var(--text-faint);
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        /* ---------- Projects Section ---------- */
        .projects-section {
          border-top: 1px solid var(--hairline);
          padding-top: 22px;
          margin-top: 12px;
        }
        .projects-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .projects-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .projects-title {
          font-size: 12px;
          font-weight: 800;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .count-pill {
          font-size: 11px;
          background: var(--panel-raised);
          border: 1px solid var(--hairline);
          padding: 2px 8px;
          border-radius: 12px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .count-pill.accent {
          color: var(--accent);
          border-color: rgba(79, 209, 165, 0.3);
          background: rgba(79, 209, 165, 0.08);
        }
        .btn-add-manual {
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 600;
          background: var(--panel-raised);
          color: var(--accent);
          border: 1px solid rgba(79, 209, 165, 0.35);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-add-manual:hover {
          background: rgba(79, 209, 165, 0.12);
          border-color: var(--accent);
        }
        .projects-filter-input {
          width: 100%;
          padding: 7px 12px;
          background: var(--bg);
          border: 1px solid var(--hairline);
          border-radius: 6px;
          color: var(--text);
          font-size: 12px;
          margin-bottom: 12px;
          box-sizing: border-box;
        }
        .projects-filter-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        /* ---------- Enhanced Project Card Row ---------- */
        .proj-card {
          background: var(--panel-raised);
          border: 1px solid var(--hairline);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 12px;
          position: relative;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .proj-card:hover {
          border-color: rgba(79, 209, 165, 0.35);
        }
        .proj-card.just-added {
          border-color: var(--accent);
          box-shadow: 0 0 16px rgba(79, 209, 165, 0.25);
          animation: highlightPulse 2s ease-out;
        }
        @keyframes highlightPulse {
          0% { transform: scale(1.02); }
          50% { transform: scale(1.00); }
          100% { }
        }
        .proj-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .proj-index-badge {
          font-size: 10.5px;
          font-family: var(--font-mono);
          background: var(--bg);
          color: var(--text-faint);
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid var(--hairline);
          font-weight: 600;
        }
        .proj-name-input {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--hairline);
          border-radius: 6px;
          color: var(--text);
          font-size: 13.5px;
          font-weight: 600;
          padding: 7px 10px;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .proj-name-input:focus {
          outline: none;
          border-color: var(--accent);
          background: #0E1316;
        }
        .proj-top-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-order {
          background: transparent;
          border: 1px solid var(--hairline);
          color: var(--text-faint);
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          padding: 4px 6px;
          line-height: 1;
        }
        .btn-order:hover:not(:disabled) {
          color: var(--text);
          border-color: var(--text-muted);
        }
        .btn-order:disabled {
          opacity: 0.3;
          cursor: default;
        }
        .btn-delete-card {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-faint);
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.15s;
        }
        .btn-delete-card:hover {
          color: var(--danger);
          background: rgba(232, 96, 122, 0.12);
          border-color: rgba(232, 96, 122, 0.3);
        }

        .proj-path-row {
          margin-bottom: 10px;
        }
        .proj-input-label {
          display: block;
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-faint);
          margin-bottom: 4px;
        }
        .proj-path-input {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--hairline);
          border-radius: 6px;
          color: var(--text);
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          padding: 7px 10px;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .proj-path-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        /* Segmented Type Toggle */
        .type-segmented {
          display: flex;
          background: var(--bg);
          padding: 3px;
          border-radius: 7px;
          border: 1px solid var(--hairline);
          gap: 4px;
          margin-bottom: 10px;
        }
        .type-segmented-btn {
          flex: 1;
          padding: 5px 10px;
          font-size: 11.5px;
          font-weight: 600;
          text-align: center;
          border-radius: 5px;
          background: transparent;
          color: var(--text-muted);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .type-segmented-btn.active {
          background: var(--panel-raised);
          color: var(--accent);
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .type-segmented-btn.active.normal {
          color: var(--text);
        }

        /* Subtree nested box */
        .subtree-config-box {
          background: rgba(79, 209, 165, 0.04);
          border: 1px solid rgba(79, 209, 165, 0.2);
          border-left: 3px solid var(--accent);
          border-radius: 6px;
          padding: 10px 12px;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .subtree-config-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .subtree-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        @media (max-width: 480px) {
          .subtree-grid { grid-template-columns: 1fr; }
        }
        .subtree-field input {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--hairline);
          border-radius: 5px;
          color: var(--text);
          font-family: var(--font-mono), monospace;
          font-size: 11.5px;
          padding: 6px 8px;
          box-sizing: border-box;
        }
        .subtree-field input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .empty-state-box {
          padding: 28px 16px;
          text-align: center;
          color: var(--text-faint);
          border: 1px dashed var(--hairline);
          border-radius: 8px;
          font-size: 13px;
        }
      `}</style>

      <div className="overlay" onClick={onClose}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-head">
            <h2>Settings</h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close">✕</button>
          </div>

          <div className="drawer-body">
            {/* GitLab Connection */}
            <fieldset className="field-group">
              <legend>GitLab connection</legend>
              <label>
                GitLab base URL
                <input type="text" placeholder="https://gitlab-01.f1soft.com" value={gitlabUrl} onChange={(e) => setGitlabUrl(e.target.value)} />
              </label>
              <label>
                Personal Access Token
                <input type="password" placeholder="glpat-xxxxxxxxxxxx" value={token} onChange={(e) => setToken(e.target.value)} />
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={rememberToken} onChange={(e) => setRememberToken(e.target.checked)} />
                Remember on this machine (stored in browser localStorage)
              </label>
              <div className="field-row">
                <button className="btn btn-secondary" onClick={handleTestConnection}>Test connection</button>
                <span className={`test-result ${testResultClass}`}>{testResult}</span>
              </div>
            </fieldset>

            {/* package.json path */}
            <fieldset className="field-group">
              <legend>package.json path (optional)</legend>
              <label>
                Path within repo used to read a "version" field
                <input type="text" placeholder="package.json" value={packageJsonPath} onChange={(e) => setPackageJsonPath(e.target.value)} />
              </label>
            </fieldset>

            {/* Default subtree base */}
            <fieldset className="field-group">
              <legend>Default subtree base (applied when adding repos)</legend>
              <label>
                Subtree prefix inside each repo
                <input type="text" placeholder="projects/base-client" value={defaultSubtreePath} onChange={(e) => setDefaultSubtreePath(e.target.value)} />
              </label>
              <label>
                Base project path
                <input type="text" placeholder="fonebank/banksmart-client-web" value={defaultSubtreeBasePath} onChange={(e) => setDefaultSubtreeBasePath(e.target.value)} />
              </label>
            </fieldset>

            {/* Team Configuration Sharing */}
            <fieldset className="field-group">
              <legend>Team Configuration Sharing</legend>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Export your configured bank repositories to share with teammates, or import an existing team preset JSON.
              </p>
              <div className="team-share-box">
                <button type="button" className="btn-share" onClick={handleExportConfig}>
                  ⬇ Export JSON
                </button>
                <label className="btn-share" style={{ margin: 0, cursor: 'pointer' }}>
                  ⬆ Import JSON
                  <input type="file" accept=".json" onChange={handleImportConfig} style={{ display: 'none' }} />
                </label>
              </div>
            </fieldset>

            {/* Search Repositories to Add */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search and add GitLab repositories..."
                  value={browseSearch}
                  onChange={(e) => handleBrowseSearch(e.target.value)}
                  className="search-input"
                  autoFocus
                />
              </div>
              
              {browseLoading && (
                <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  Searching repositories...
                </div>
              )}
              
              {!browseLoading && browseResults.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {browseResults.map((repo) => {
                    const fullPath = repo.path_with_namespace || repo.path;
                    const alreadyAdded = projects.some((p) => p.path === fullPath);
                    const { isSubtree } = detectSubtreeInfo(repo);
                    
                    return (
                      <div key={repo.id} className={`repo-card ${alreadyAdded ? 'already-added' : ''}`}>
                        <div className="repo-info">
                          <div className="repo-name">
                            {repo.name}
                            {isSubtree && <span className="subtree-badge">Subtree</span>}
                          </div>
                          <p className="card-path">{fullPath}</p>
                          <div className="repo-meta">
                            <span className={`visibility-badge ${repo.visibility}`}>{repo.visibility}</span>
                            {repo.description && (
                              <span className="repo-desc">{repo.description}</span>
                            )}
                          </div>
                        </div>
                        {alreadyAdded ? (
                          <span className="added-tag">✓ Added</span>
                        ) : (
                          <button className="btn-add" onClick={() => addFromBrowse(repo)}>
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {!browseLoading && browseSearch && browseResults.length === 0 && (
                <div className="empty-state-box">No repositories found matching "{browseSearch}"</div>
              )}
            </div>

            {/* Added Projects List */}
            <div className="projects-section">
              <div className="projects-header">
                <div className="projects-title-wrap">
                  <span className="projects-title">Added Projects</span>
                  <span className="count-pill accent">{projects.length}</span>
                  {subtreeCount > 0 && (
                    <span className="count-pill">{subtreeCount} subtree</span>
                  )}
                </div>
                <button className="btn-add-manual" onClick={addProject}>+ Add blank</button>
              </div>

              {projects.length > 4 && (
                <input
                  type="text"
                  placeholder="Filter added projects..."
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="projects-filter-input"
                />
              )}
              
              <div className="project-list">
                {visibleProjects.map((p, idx) => {
                  const actualIdx = projects.indexOf(p);
                  const isJustAdded = newlyAddedKey && p.path === newlyAddedKey;

                  return (
                    <ProjectRow
                      key={p.path || actualIdx}
                      project={p}
                      idx={actualIdx}
                      totalCount={projects.length}
                      isJustAdded={isJustAdded}
                      defaultSubtreePath={defaultSubtreePath}
                      defaultSubtreeBasePath={defaultSubtreeBasePath}
                      onUpdate={updateProject}
                      onRemove={removeProject}
                      onMove={moveProject}
                    />
                  );
                })}
                {projects.length === 0 && (
                  <div className="empty-state-box">
                    No projects added yet. Search above to add repositories to your board.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="drawer-foot">
            <button className="btn btn-primary" onClick={handleSave}>Save &amp; close</button>
          </div>
        </div>
      </div>
    </>
  );
}

function ProjectRow({
  project,
  idx,
  totalCount,
  isJustAdded,
  defaultSubtreePath,
  defaultSubtreeBasePath,
  onUpdate,
  onRemove,
  onMove,
}) {
  const isSubtree = project.type === 'subtree';

  return (
    <div className={`proj-card ${isJustAdded ? 'just-added' : ''}`}>
      <div className="proj-card-top">
        <span className="proj-index-badge">#{idx + 1}</span>
        <input 
          type="text" 
          placeholder="Display Name (e.g. Prabhu Bank)" 
          value={project.name} 
          onChange={(e) => onUpdate(idx, 'name', e.target.value)} 
          className="proj-name-input"
        />
        <div className="proj-top-actions">
          <button 
            className="btn-order" 
            disabled={idx === 0} 
            onClick={() => onMove(idx, idx - 1)}
            title="Move Up"
          >
            ▲
          </button>
          <button 
            className="btn-order" 
            disabled={idx === totalCount - 1} 
            onClick={() => onMove(idx, idx + 1)}
            title="Move Down"
          >
            ▼
          </button>
          <button 
            className="btn-delete-card" 
            onClick={() => onRemove(idx)} 
            title="Remove repository"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="proj-path-row">
        <label className="proj-input-label">GitLab Path</label>
        <input 
          type="text" 
          placeholder="namespace/project-name (e.g. fonebank/bankxp/rbb)" 
          value={project.path} 
          onChange={(e) => onUpdate(idx, 'path', e.target.value)} 
          className="proj-path-input"
        />
      </div>

      {/* Segmented Type Toggle */}
      <div className="type-segmented">
        <button
          type="button"
          className={`type-segmented-btn ${!isSubtree ? 'active normal' : ''}`}
          onClick={() => onUpdate(idx, 'type', 'normal')}
        >
          📦 Standard Repo
        </button>
        <button
          type="button"
          className={`type-segmented-btn ${isSubtree ? 'active' : ''}`}
          onClick={() => onUpdate(idx, {
            type: 'subtree',
            subtreePath: project.subtreePath || defaultSubtreePath || 'projects/base-client',
            basePath: project.basePath || defaultSubtreeBasePath || 'fonebank/banksmart-client-web',
          })}
        >
          🌿 Subtree Base
        </button>
      </div>

      {/* Subtree configuration parameters */}
      {isSubtree && (
        <div className="subtree-config-box">
          <div className="subtree-config-title">
            <span>🌿 Base Subtree Configuration</span>
          </div>
          <div className="subtree-grid">
            <div className="subtree-field">
              <label className="proj-input-label">Subtree Folder in Repo</label>
              <input 
                type="text" 
                placeholder="projects/base-client" 
                value={project.subtreePath} 
                onChange={(e) => onUpdate(idx, 'subtreePath', e.target.value)} 
              />
            </div>
            <div className="subtree-field">
              <label className="proj-input-label">Base Project Path</label>
              <input 
                type="text" 
                placeholder="fonebank/banksmart-client-web" 
                value={project.basePath} 
                onChange={(e) => onUpdate(idx, 'basePath', e.target.value)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
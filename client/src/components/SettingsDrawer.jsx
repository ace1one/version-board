import React, { useState, useEffect, useCallback } from 'react';

export default function SettingsDrawer({ config, onClose, onSave }) {
  const [gitlabUrl, setGitlabUrl] = useState(config.gitlabUrl || '');
  const [token, setToken] = useState(config.token || '');
  const [rememberToken, setRememberToken] = useState(!!config.rememberToken);
  const [packageJsonPath, setPackageJsonPath] = useState(config.packageJsonPath || 'package.json');
  const [projects, setProjects] = useState(config.projects && config.projects.length > 0 ? [...config.projects] : []);
  const [testResult, setTestResult] = useState('');
  const [testResultClass, setTestResultClass] = useState('');

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
    
    let subtreePath = '';
    let basePath = '';
    
    if (isSubtree) {
      if (path.includes('/bankxp/')) {
        const parts = path.split('/');
        if (parts.length >= 3) {
          basePath = `${parts[0]}/banksmart-client-web`;
          subtreePath = `projects/${parts[parts.length - 1]}`;
        }
      } else if (path.includes('banksmart-client-web')) {
        basePath = path;
        subtreePath = 'projects/base-client';
      } else {
        const parts = path.split('/');
        const projectName = parts[parts.length - 1];
        basePath = parts.slice(0, -1).join('/') + '/banksmart-client-web';
        subtreePath = `projects/${projectName}`;
      }
    }
    
    return { isSubtree, subtreePath, basePath };
  };

  const addFromBrowse = (repo) => {
    const fullPath = repo.path_with_namespace || repo.path;
    const alreadyExists = projects.some((p) => p.path === fullPath);
    if (alreadyExists) return;

    const { isSubtree, subtreePath, basePath } = detectSubtreeInfo(repo);

    setProjects([...projects, {
      name: repo.name,
      path: fullPath,
      type: isSubtree ? 'subtree' : 'normal',
      subtreePath: subtreePath,
      basePath: basePath,
    }]);
  };

  const addProject = () => {
    setProjects([...projects, { name: '', path: '', type: 'normal', subtreePath: '', basePath: '' }]);
  };

  const removeProject = (idx) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  const updateProject = (idx, field, value) => {
    const updated = [...projects];
    updated[idx] = { ...updated[idx], [field]: value };
    setProjects(updated);
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

  const handleSave = () => {
    onSave({
      gitlabUrl: gitlabUrl.trim(),
      token: token.trim(),
      rememberToken,
      packageJsonPath: packageJsonPath.trim() || 'package.json',
      projects: projects.filter((p) => p.path.trim()),
    });
  };

  return (
    <>
      <style>{`
        .card-path {
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          color: #6b7280;
          margin: 4px 0 0 0;
          padding: 0;
        }
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
          border: 1px solid #30363d;
          border-radius: 6px;
          color: #e6edf3;
          font-size: 14px;
          box-sizing: border-box;
        }
        .search-input:focus {
          // outline: none;
          border-color: #58a6ff;
          // box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
        }
        .search-input::placeholder {
          color: #8b949e;
        }
        .repo-card {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px 16px;
          border: 1px solid #30363d;
          border-radius: 6px;
          margin-bottom: 8px;
          background: #161b22;
          transition: all 0.15s ease;
        }
        .repo-card:hover {
          border-color: #58a6ff;
          background: #1c2129;
        }
        .repo-card.already-added {
          opacity: 0.5;
          background: #0d1117;
        }
        .repo-info {
          flex: 1;
          min-width: 0;
          margin-right: 12px;
        }
        .repo-name {
          font-weight: 600;
          font-size: 14px;
          color: #e6edf3;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .subtree-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: #58a6ff;
          color: #0d1117;
          font-weight: 700;
          text-transform: uppercase;
        }
        .repo-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }
        .visibility-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .visibility-badge.private { background: #d29922; color: #0d1117; }
        .visibility-badge.internal { background: #a371f7; color: #fff; }
        .visibility-badge.public { background: #3fb950; color: #0d1117; }
        .repo-desc {
          font-size: 12px;
          color: #8b949e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 400px;
        }
        .btn-add {
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          background: #238636;
          color: #fff;
          border: 1px solid #2ea043;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-add:hover {
          background: #2ea043;
        }
        .projects-section {
          border-top: 1px solid #30363d;
          padding-top: 20px;
          margin-top: 8px;
        }
        .projects-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .projects-title {
          font-size: 12px;
          font-weight: 700;
          color: #8b949e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .btn-add-manual {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          background: #21262d;
          color: #e6edf3;
          border: 1px solid #30363d;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-add-manual:hover {
          background: #30363d;
          border-color: #8b949e;
        }
        .project-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          position: relative;
        }
        .project-card input[type="text"] {
          width: 100%;
          padding: 10px 12px;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          color: #e6edf3;
          font-size: 14px;
          font-family: var(--font-mono), monospace;
          margin-bottom: 10px;
          box-sizing: border-box;
        }
        .project-card input[type="text"]:focus {
          outline: none;
          border-color: #58a6ff;
          box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
        }
        .project-card input[type="text"]::placeholder {
          color: #484f58;
        }
        .project-type-row {
          display: flex;
          gap: 20px;
          margin-bottom: 10px;
          font-size: 13px;
          color: #8b949e;
        }
        .project-type-row label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .project-type-row input[type="radio"] {
          width: 14px;
          height: 14px;
          accent-color: #58a6ff;
        }
        .subtree-fields {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed #30363d;
        }
        .subtree-fields input {
          flex: 1;
          margin-bottom: 0;
        }
        .btn-remove {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: 1px solid #30363d;
          color: #8b949e;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.15s;
        }
        .btn-remove:hover {
          color: #f85149;
          border-color: #f85149;
          background: rgba(248, 81, 73, 0.1);
        }
        .empty-state {
          padding: 24px;
          text-align: center;
          color: #8b949e;
          border: 1px dashed #30363d;
          border-radius: 6px;
          font-size: 13px;
        }
      `}</style>

      <div className="overlay" onClick={onClose}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-head">
            <h2>Settings</h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>

          <div className="drawer-body">
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

            <fieldset className="field-group">
              <legend>package.json path (optional)</legend>
              <label>
                Path within repo used to read a "version" field
                <input type="text" placeholder="package.json" value={packageJsonPath} onChange={(e) => setPackageJsonPath(e.target.value)} />
              </label>
            </fieldset>

            {/* Search Repositories */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={browseSearch}
                  onChange={(e) => handleBrowseSearch(e.target.value)}
                  className="search-input"
                  autoFocus
                />
              </div>
              
              {browseLoading && (
                <div style={{ padding: '12px', color: '#8b949e', fontSize: '13px' }}>
                  Searching...
                </div>
              )}
              
              {!browseLoading && browseResults.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {browseResults.map((repo) => {
                    const fullPath = repo.path_with_namespace || repo.path;
                    const alreadyAdded = projects.some((p) => p.path === fullPath);
                    const { isSubtree } = detectSubtreeInfo(repo);
                    
                    return (
                      <div key={repo.id} className={`repo-card ${alreadyAdded ? 'already-added' : ''}`}>
                        <div className="repo-info">
                          <div className="repo-name">
                            {repo.name}
                            {isSubtree && !alreadyAdded && <span className="subtree-badge">Subtree</span>}
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
                          <span style={{ color: '#8b949e', fontSize: '12px' }}>Added</span>
                        ) : (
                          <button className="btn-add" onClick={() => addFromBrowse(repo)}>
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {!browseLoading && browseSearch && browseResults.length === 0 && (
                <div className="empty-state">No repositories found</div>
              )}
            </div>

            {/* Added Projects */}
            <div className="projects-section">
              <div className="projects-header">
                <span className="projects-title">Added Projects ({projects.length})</span>
                <button className="btn-add-manual" onClick={addProject}>+ Add manually</button>
              </div>
              
              <div className="project-list">
                {projects.map((p, idx) => (
                  <ProjectRow key={idx} project={p} idx={idx} onUpdate={updateProject} onRemove={removeProject} />
                ))}
                {projects.length === 0 && (
                  <div className="empty-state">
                    No projects added yet. Search above to add repositories.
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

function ProjectRow({ project, idx, onUpdate, onRemove }) {
  const showSubtree = project.type === 'subtree';

  return (
    <div className="project-card">
      <button className="btn-remove" onClick={() => onRemove(idx)} title="Remove">🗑</button>
      
      <input 
        type="text" 
        placeholder="Display name" 
        value={project.name} 
        onChange={(e) => onUpdate(idx, 'name', e.target.value)} 
      />
      <input 
        type="text" 
        placeholder="namespace/project-path" 
        value={project.path} 
        onChange={(e) => onUpdate(idx, 'path', e.target.value)} 
      />
      
      <div className="project-type-row">
        <label>
          <input type="radio" name={`type-${idx}`} value="normal" checked={project.type !== 'subtree'} onChange={() => onUpdate(idx, 'type', 'normal')} /> 
          Normal
        </label>
        <label>
          <input type="radio" name={`type-${idx}`} value="subtree" checked={project.type === 'subtree'} onChange={() => onUpdate(idx, 'type', 'subtree')} /> 
          Has subtree base
        </label>
      </div>
      
      {showSubtree && (
        <div className="subtree-fields">
          <input 
            type="text" 
            placeholder="Subtree prefix (e.g. projects/base-client)" 
            value={project.subtreePath} 
            onChange={(e) => onUpdate(idx, 'subtreePath', e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Base project path" 
            value={project.basePath} 
            onChange={(e) => onUpdate(idx, 'basePath', e.target.value)} 
          />
        </div>
      )}
    </div>
  );
}
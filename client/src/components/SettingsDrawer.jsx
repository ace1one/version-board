import React, { useState, useEffect } from 'react';

export default function SettingsDrawer({ config, onClose, onSave }) {
  const [gitlabUrl, setGitlabUrl] = useState(config.gitlabUrl || '');
  const [token, setToken] = useState(config.token || '');
  const [rememberToken, setRememberToken] = useState(!!config.rememberToken);
  const [packageJsonPath, setPackageJsonPath] = useState(config.packageJsonPath || 'package.json');
  const [projects, setProjects] = useState(config.projects && config.projects.length > 0 ? [...config.projects] : []);
  const [testResult, setTestResult] = useState('');
  const [testResultClass, setTestResultClass] = useState('');

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

          <fieldset className="field-group">
            <legend>Projects</legend>
            <div className="project-list">
              {projects.map((p, idx) => (
                <ProjectRow key={idx} project={p} idx={idx} onUpdate={updateProject} onRemove={removeProject} />
              ))}
            </div>
            <button className="btn btn-secondary" onClick={addProject}>+ Add project</button>
          </fieldset>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-primary" onClick={handleSave}>Save &amp; close</button>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project, idx, onUpdate, onRemove }) {
  const showSubtree = project.type === 'subtree';

  return (
    <div className="project-row" data-idx={idx}>
      <div className="project-row-main">
        <input className="p-name" type="text" placeholder="Display name (e.g. Prabhu Bank - BankXP)" value={project.name} onChange={(e) => onUpdate(idx, 'name', e.target.value)} />
        <input className="p-path" type="text" placeholder="namespace/project-path (e.g. fonebank/prabhu-bankxp)" value={project.path} onChange={(e) => onUpdate(idx, 'path', e.target.value)} />
      </div>
      <div className="project-row-type">
        <label className="radio-label">
          <input type="radio" name={`type-${idx}`} value="normal" checked={project.type !== 'subtree'} onChange={() => onUpdate(idx, 'type', 'normal')} /> Normal
        </label>
        <label className="radio-label">
          <input type="radio" name={`type-${idx}`} value="subtree" checked={project.type === 'subtree'} onChange={() => onUpdate(idx, 'type', 'subtree')} /> Has subtree base
        </label>
      </div>
      {showSubtree && (
        <div className="project-row-subtree">
          <input className="p-subtreePath" type="text" placeholder="Subtree prefix (e.g. projects/base-client/)" value={project.subtreePath} onChange={(e) => onUpdate(idx, 'subtreePath', e.target.value)} />
          <input className="p-basePath" type="text" placeholder="Base project path (e.g. fonebank/banksmart-client-web)" value={project.basePath} onChange={(e) => onUpdate(idx, 'basePath', e.target.value)} />
        </div>
      )}
      <button className="btn btn-ghost btn-icon p-remove" title="Remove" onClick={() => onRemove(idx)}>🗑</button>
    </div>
  );
}
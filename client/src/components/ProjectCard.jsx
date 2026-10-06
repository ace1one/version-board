import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cardStatusClass, fmtDate, timeAgo } from '../utils/helpers';

export default function ProjectCard({ result }) {
  const navigate = useNavigate();

  const openDetail = () => navigate(`/detail/${encodeURIComponent(result.key)}`);

  if (!result.ok) {
    return (
      <div className={`card compact ${cardStatusClass(result)}`} onClick={openDetail}>
        <div className="card-head">
          <div>
            <p className="card-title">{result.label}</p>
            <p className="card-path">{result.key}</p>
          </div>
          <span className="status-pill error">error</span>
        </div>
        <p className="error-text">{result.error}</p>
      </div>
    );
  }

  const statusClass = cardStatusClass(result);
  const isMonorepo = result.type === 'monorepo' || !!result.monorepo;
  const statusLabel = statusClass === 'status-ok' ? (isMonorepo ? 'monorepo' : 'ok') : statusClass === 'status-warn' ? 'attention' : 'error';
  const statusPillClass = statusClass === 'status-ok' ? (isMonorepo ? 'monorepo-pill' : 'ok') : statusClass === 'status-warn' ? 'warn' : 'error';

  return (
    <div className={`card compact ${statusClass} ${isMonorepo ? 'card-monorepo' : ''}`} onClick={openDetail}>
      <div className="card-head">
        <div className="card-title-group">
          <p className="card-title">{result.label}</p>
          <p className="card-path">{result.key}</p>
        </div>
        <div className="card-head-badges">
          <span className={`status-pill ${statusPillClass}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="card-body">
        <DataRow label="Branch" value={result.defaultBranch || '—'} />
        <DataRow label="Latest tag" value={result.latestTag || '—'} />
        <DataRow label="Version" value={result.packageVersion || '—'} />
        {result.commitTitle && (
          <DataRow
            label="Latest commit"
            value={
              <span title={`by ${result.commitAuthor || 'unknown'} (${fmtDate(result.commitDate)})`}>
                "{result.commitTitle.length > 28 ? `${result.commitTitle.slice(0, 28)}…` : result.commitTitle}"
              </span>
            }
            dim
          />
        )}
        {result.commitDate && (
          <DataRow label="Updated" value={`${timeAgo(result.commitDate)} (${fmtDate(result.commitDate)})`} dim />
        )}

        {result.monorepo && (
          <MonorepoWorkspacesCompact
            monorepo={result.monorepo}
            webUrl={result.webUrl}
            defaultBranch={result.defaultBranch}
          />
        )}

        {result.subtree && <SubtreeCompact subtree={result.subtree} />}
      </div>
    </div>
  );
}

function DataRow({ label, value, dim }) {
  return (
    <div className="data-row">
      <span className="label">{label}</span>
      <span className={`value${dim ? ' dim' : ''}`}>{value}</span>
    </div>
  );
}

function MonorepoWorkspacesCompact({ monorepo, webUrl, defaultBranch }) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (monorepo.error) {
    return (
      <div className="monorepo-card-box">
        <div className="monorepo-box-head">
          <span className="monorepo-box-title">Workspaces / Banks</span>
          <span className="status-badge err" style={{ fontSize: '10px' }}>Error</span>
        </div>
        <p className="error-text" style={{ fontSize: '11px', margin: '4px 0 0 0' }}>{monorepo.error}</p>
      </div>
    );
  }

  const allWorkspaces = monorepo.workspaces || [];
  const workspaces = allWorkspaces.filter((ws) => {
    const name = (ws.name || ws.path || '').toLowerCase();
    return !name.includes('nucleus') && !name.includes('xp-service');
  });

  if (workspaces.length === 0) {
    return (
      <div className="monorepo-card-box">
        <div className="monorepo-box-head">
          <span className="monorepo-box-title">Workspaces / Banks</span>
        </div>
        <p className="dim" style={{ fontSize: '11.5px', margin: '4px 0 0 0' }}>No bank workspaces detected</p>
      </div>
    );
  }

  const toggleOpen = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="monorepo-card-box">
      <div
        className="monorepo-box-head clickable"
        onClick={toggleOpen}
        title={isOpen ? 'Click to collapse bank workspaces' : 'Click to view bank workspaces'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="monorepo-accordion-arrow">{isOpen ? '▼' : '▶'}</span>
          <span className="monorepo-box-title">WORKSPACES / BANKS</span>
          <span className="monorepo-box-count">{workspaces.length}</span>
        </div>
        <span className="monorepo-toggle-hint">{isOpen ? 'Hide' : 'Show'}</span>
      </div>

      {isOpen && (
        <div className="monorepo-workspaces-list" style={{ marginTop: '6px' }}>
          {workspaces.map((ws, i) => {
            const folderUrl = webUrl && defaultBranch ? `${webUrl}/-/tree/${encodeURIComponent(defaultBranch)}/${encodeURIComponent(ws.path)}` : null;
            return (
              <div key={ws.path || i} className="monorepo-ws-row">
                <div className="monorepo-ws-main">
                  <span className="monorepo-ws-bullet">•</span>
                  <span className="monorepo-ws-name" title={ws.name || ws.path}>
                    {ws.name || ws.path}
                  </span>
                  {folderUrl && (
                    <a
                      href={folderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="monorepo-ws-link"
                      onClick={(e) => e.stopPropagation()}
                      title={`Open ${ws.path} folder in GitLab`}
                    >
                      ↗
                    </a>
                  )}
                </div>
                <div className="monorepo-ws-meta">
                  {ws.version ? (
                    <span className="monorepo-ws-version">v{ws.version}</span>
                  ) : (
                    <span className="monorepo-ws-version dim">—</span>
                  )}
                  {ws.latestTag && (
                    <span className="monorepo-ws-tag" title={`Tag: ${ws.latestTag.name}`}>
                      {ws.latestTag.name}
                    </span>
                  )}
                  {ws.latestCommit && (
                    <span
                      className="monorepo-ws-time dim"
                      title={`Last commit: "${ws.latestCommit.title}" by ${ws.latestCommit.author} (${fmtDate(ws.latestCommit.date)})`}
                    >
                      {timeAgo(ws.latestCommit.date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubtreeCompact({ subtree }) {
  if (subtree.error) {
    return (
      <div className="subtree-compact">
        <span className="label">Base</span>
        <span className="value" style={{ color: 'var(--danger)' }}>error</span>
      </div>
    );
  }

  const st = subtree;
  let status;
  if (st.upToDate === true) {
    status = <span style={{ color: 'var(--accent)' }}>up to date</span>;
  } else if (st.upToDate === false) {
    status = st.behindCount != null
      ? <span style={{ color: 'var(--warn)' }}>{st.behindCount} commit(s) behind</span>
      : <span style={{ color: 'var(--warn)' }}>out of date</span>;
  } else {
    status = <span className="dim">unknown</span>;
  }

  return (
    <div className="subtree-compact">
      <span className="label">Base {st.pulledVersion || '—'} → {st.baseLatestVersion || '?'}</span>
      <span className="value">{status}</span>
    </div>
  );
}
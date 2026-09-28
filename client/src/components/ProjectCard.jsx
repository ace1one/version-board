import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cardStatusClass, fmtDate } from '../utils/helpers';

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
  const statusLabel = statusClass === 'status-ok' ? 'ok' : statusClass === 'status-warn' ? 'attention' : 'error';
  const statusPillClass = statusClass === 'status-ok' ? 'ok' : statusClass === 'status-warn' ? 'warn' : 'error';

  return (
    <div className={`card compact ${statusClass}`} onClick={openDetail}>
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
        {result.commitDate && (
          <DataRow label="Updated" value={fmtDate(result.commitDate)} dim />
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
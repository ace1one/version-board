import React from 'react';
import { Link } from 'react-router-dom';
import { fmtDate, cardStatusClass } from '../utils/helpers';

export default function ProjectCard({ result }) {
  if (!result.ok) {
    return (
      <div className={`card ${cardStatusClass(result)}`}>
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
    <div className={`card ${statusClass}`}>
      <div className="card-head">
        <div>
          <p className="card-title">{result.label}</p>
          <p className="card-path">{result.key}</p>
        </div>
        <span className={`status-pill ${statusPillClass}`}>{statusLabel}</span>
      </div>
      <div className="card-body">
        <DataRow label="Branch" value={result.defaultBranch || '—'} />
        <DataRow label="Latest commit" value={result.commitSha || '—'} />
        <DataRow label="Commit date" value={fmtDate(result.commitDate)} dim />
        <DataRow label="Author" value={result.commitAuthor || '—'} dim />
        <DataRow label="Latest tag" value={result.latestTag || '—'} />
        <DataRow label="package.json ver." value={result.packageVersion || '—'} />
        {result.subtree && <SubtreeBlock subtree={{ ...result.subtree, _key: result.key }} />}
      </div>
      <div className="card-footer">
        <a className="card-link" href={result.webUrl || '#'} target="_blank" rel="noopener">open in gitlab →</a>
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

function SubtreeBlock({ subtree }) {
  if (subtree.error) {
    return (
      <div className="subtree-block">
        <div className="subtree-title">Base subtree</div>
        <p className="error-text">{subtree.error}</p>
      </div>
    );
  }

  const st = subtree;
  let statusHtml;
  if (st.upToDate === true) {
    statusHtml = <span style={{ color: 'var(--accent)' }}>up to date</span>;
  } else if (st.upToDate === false) {
    statusHtml = st.behindCount != null
      ? <span style={{ color: 'var(--warn)' }}>{st.behindCount} commit(s) behind</span>
      : <span style={{ color: 'var(--warn)' }}>out of date ({st.baseLatestVersion || '?'} available)</span>;
  } else {
    statusHtml = <span className="dim">unknown (couldn't read a version)</span>;
  }

  return (
    <div className="subtree-block">
      <div className="subtree-title-row">
        <div className="subtree-title">Base subtree · {st.baseProjectPath}</div>
        <Link to={`/detail/${encodeURIComponent(subtree._key || '')}`} className="subtree-detail-btn">Details</Link>
      </div>
      <div className="data-row">
        <span className="label">Base client version</span>
        <span className="value">{st.pulledVersion || '—'}</span>
      </div>
      <div className="data-row">
        <span className="label">Latest base version</span>
        <span className="value">{st.baseLatestVersion || '—'}</span>
      </div>
      <div className="data-row">
        <span className="label">Status</span>
        <span className="value">{statusHtml}</span>
      </div>
    </div>
  );
}
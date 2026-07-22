import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { fmtDate } from '../utils/helpers';

export default function DetailView({ results }) {
  const { key } = useParams();

  // Try from state first, fall back to sessionStorage
  let allResults = results;
  if (!allResults || allResults.length === 0) {
    try {
      allResults = JSON.parse(sessionStorage.getItem('vb_last_results') || '[]');
    } catch (e) {
      allResults = [];
    }
  }

  const match = allResults.find((r) => r.key === key);

  if (!match) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">◈</span>
            <div>
              <h1>Project not found</h1>
              <p className="subtitle">—</p>
            </div>
          </div>
          <div className="topbar-actions">
            <Link to="/" className="btn btn-ghost">← Back to board</Link>
          </div>
        </header>
        <main>
          <div className="detail-content">
            <div className="card status-error">
              <p className="error-text">
                No cached data for this project. Go back to the board and hit "Refresh all" first,
                then open "View details" again — this page reads from the last refresh, it doesn't
                re-query GitLab itself.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <div>
            <h1>{match.label}</h1>
            <p className="subtitle">{match.key}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <Link to="/" className="btn btn-ghost">← Back to board</Link>
        </div>
      </header>
      <main>
        <div className="detail-content">
          {!match.ok ? (
            <div className="card status-error">
              <p className="error-text">{match.error}</p>
            </div>
          ) : (
            <>
              <div className="card status-ok detail-card">
                <div className="subtree-title">Project</div>
                <DataRow label="Branch" value={match.defaultBranch || '—'} />
                <DataRow label="Latest commit" value={match.commitFullSha || match.commitSha || '—'} />
                <DataRow label="Commit date" value={fmtDate(match.commitDate)} dim />
                <DataRow label="Author" value={match.commitAuthor || '—'} dim />
                <DataRow label="Commit title" value={match.commitTitle || '—'} dim />
                <DataRow label="Latest tag" value={match.latestTag || '—'} />
                <DataRow label="package.json ver." value={match.packageVersion || '—'} />
                <div className="card-footer">
                  <a className="card-link" href={match.webUrl || '#'} target="_blank" rel="noopener">open in gitlab →</a>
                </div>
              </div>
              {match.subtree && <SubtreeDetail subtree={match.subtree} />}
            </>
          )}
        </div>
      </main>
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

function SubtreeDetail({ subtree }) {
  if (subtree.error) {
    return (
      <div className="card status-warn detail-card">
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
      : <span style={{ color: 'var(--warn)' }}>out of date</span>;
  } else {
    statusHtml = <span className="dim">unknown (couldn't read a version)</span>;
  }

  return (
    <div className={`card ${st.upToDate === false ? 'status-warn' : 'status-ok'} detail-card`}>
      <div className="subtree-title">Base subtree · {st.baseProjectPath}</div>
      {st.pulledVersion != null && <DataRow label="Pulled version" value={st.pulledVersion || '—'} />}
      {st.baseLatestVersion != null && <DataRow label="Latest base version" value={st.baseLatestVersion || '—'} />}
      <div className="data-row">
        <span className="label">Status</span>
        <span className="value">{statusHtml}</span>
      </div>
      <div className="divider"></div>
      <DataRow label="Pulled SHA" value={st.pulledSha || '—'} />
      <DataRow label="Pulled on" value={fmtDate(st.pulledAt)} dim />
      <DataRow label="Pulled commit title" value={st.pulledCommitTitle || '—'} dim />
      <div className="divider"></div>
      <DataRow label="Base default branch" value={st.baseDefaultBranch || '—'} />
      <DataRow label="Base HEAD SHA" value={st.baseLatestSha || '—'} />
      <DataRow label="Base HEAD date" value={fmtDate(st.baseLatestDate)} dim />
      {st.squashCommitNote && <p className="error-text" style={{ marginTop: 10 }}>{st.squashCommitNote}</p>}
      {st.behindCommits && st.behindCommits.length > 0 && (
        <>
          <div className="subtree-title" style={{ marginTop: 14 }}>Commits not yet pulled</div>
          <div className="behind-list behind-list-full">
            {st.behindCommits.map((c, i) => (
              <div className="behind-commit" key={i}>
                <span className="sha">{c.sha}</span>
                <span className="behind-title">{c.title}</span>
                <span className="behind-meta">{c.author || ''} · {fmtDate(c.date)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
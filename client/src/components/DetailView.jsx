import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fmtDate } from '../utils/helpers';

export default function DetailView({ config, results }) {
  const { key } = useParams();
  const [activeTab, setActiveTab] = useState('details');
  const [mergeRequests, setMergeRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [mrLoading, setMrLoading] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [mrError, setMrError] = useState('');
  const [issuesError, setIssuesError] = useState('');

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

  // Fetch MRs when tab is activated
  useEffect(() => {
    if (activeTab === 'mr' && match && match.ok) {
      setMrLoading(true);
      setMrError('');
      fetch('/api/project-merge-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: config.gitlabUrl,
          token: config.token,
          projectPath: match.key,
          state: 'opened',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setMergeRequests(data.mergeRequests || []);
        })
        .catch((e) => setMrError(e.message))
        .finally(() => setMrLoading(false));
    }
  }, [activeTab, match?.key, match?.ok, config.gitlabUrl, config.token]);

  // Fetch Issues when tab is activated
  useEffect(() => {
    if (activeTab === 'issues' && match && match.ok) {
      setIssuesLoading(true);
      setIssuesError('');
      fetch('/api/project-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: config.gitlabUrl,
          token: config.token,
          projectPath: match.key,
          state: 'opened',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setIssues(data.issues || []);
        })
        .catch((e) => setIssuesError(e.message))
        .finally(() => setIssuesLoading(false));
    }
  }, [activeTab, match?.key, match?.ok, config.gitlabUrl, config.token]);

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
                Project not found. Go back and refresh.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const tabs = [
    { id: 'details', label: '📋 Details', count: null },
    { id: 'mr', label: '🔀 Merge Requests', count: mergeRequests.length },
    { id: 'issues', label: '🐛 Issues', count: issues.length },
  ];

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
          <div className="detail-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`detail-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.count != null && tab.count >= 0 && (
                  <span className="tab-badge">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'details' && !match.ok && (
            <div className="card status-error">
              <p className="error-text">{match.error}</p>
            </div>
          )}

          {activeTab === 'details' && match.ok && (
            <>
              <div className="card status-ok detail-card">
                <div className="subtree-title">Project Information</div>
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

          {activeTab === 'mr' && match.ok && (
            <div className="card detail-card">
              <div className="subtree-title">Open Merge Requests</div>
              {mrLoading && <div className="tab-loading">Loading merge requests...</div>}
              {mrError && <p className="error-text">{mrError}</p>}
              {!mrLoading && !mrError && mergeRequests.length === 0 && (
                <div className="tab-empty">No open merge requests</div>
              )}
              {!mrLoading && mergeRequests.map((mr) => (
                <a key={mr.id} href={mr.webUrl} target="_blank" rel="noopener" className="list-item">
                  <div className="list-item-head">
                    <span className="list-item-title">{mr.title}</span>
                    <span className={`state-badge ${mr.state === 'merged' ? 'merged' : mr.state === 'closed' ? 'closed' : 'opened'}`}>
                      {mr.state}
                    </span>
                  </div>
                  <div className="list-item-meta">
                    <span>#{mr.id}</span>
                    <span>{mr.sourceBranch} → {mr.targetBranch}</span>
                    <span>by {mr.author}</span>
                    <span>{fmtDate(mr.updatedAt)}</span>
                  </div>
                  {mr.labels.length > 0 && (
                    <div className="label-list">
                      {mr.labels.map((l, i) => (
                        <span key={i} className="label-pill">{l}</span>
                      ))}
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}

          {activeTab === 'issues' && match.ok && (
            <div className="card detail-card">
              <div className="subtree-title">Open Issues</div>
              {issuesLoading && <div className="tab-loading">Loading issues...</div>}
              {issuesError && <p className="error-text">{issuesError}</p>}
              {!issuesLoading && !issuesError && issues.length === 0 && (
                <div className="tab-empty">No open issues 🎉</div>
              )}
              {!issuesLoading && issues.map((issue) => (
                <a key={issue.id} href={issue.webUrl} target="_blank" rel="noopener" className="list-item">
                  <div className="list-item-head">
                    <span className="list-item-title">{issue.title}</span>
                    <span className={`state-badge ${issue.state === 'closed' ? 'closed' : 'opened'}`}>
                      {issue.state}
                    </span>
                  </div>
                  <div className="list-item-meta">
                    <span>#{issue.id}</span>
                    {issue.assignees.length > 0 && <span>→ {issue.assignees.join(', ')}</span>}
                    <span>by {issue.author}</span>
                    <span>{fmtDate(issue.updatedAt)}</span>
                  </div>
                  {issue.labels.length > 0 && (
                    <div className="label-list">
                      {issue.labels.map((l, i) => (
                        <span key={i} className="label-pill">{l}</span>
                      ))}
                    </div>
                  )}
                </a>
              ))}
            </div>
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
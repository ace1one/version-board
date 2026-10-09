import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmtDate } from '../utils/helpers';

export default function TableView({ results }) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState('label');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (sortField === 'subtreeVersion') {
      valA = a.subtree?.pulledVersion || '';
      valB = b.subtree?.pulledVersion || '';
    } else if (sortField === 'behindCount') {
      valA = a.subtree?.behindCount ?? (a.subtree?.upToDate === true ? 0 : 9999);
      valB = b.subtree?.behindCount ?? (b.subtree?.upToDate === true ? 0 : 9999);
    }
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="table-container">
      <table className="version-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('label')} className="sortable">
              Project Name {sortField === 'label' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th onClick={() => handleSort('defaultBranch')} className="sortable">
              Branch {sortField === 'defaultBranch' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th>Latest Tag</th>
            <th onClick={() => handleSort('packageVersion')} className="sortable">
              App Ver. {sortField === 'packageVersion' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th onClick={() => handleSort('subtreeVersion')} className="sortable">
              Subtree Ver. {sortField === 'subtreeVersion' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th>Latest Base</th>
            <th onClick={() => handleSort('behindCount')} className="sortable">
              Subtree Status {sortField === 'behindCount' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th onClick={() => handleSort('commitDate')} className="sortable">
              Updated {sortField === 'commitDate' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th>GitLab</th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((r, i) => {
            const st = r.subtree;
            const isBehind = st && st.upToDate === false;
            const isUpToDate = st && st.upToDate === true;

            return (
              <tr
                key={`${r.key}-${i}`}
                className="table-row"
                onClick={() => navigate(`/detail/${encodeURIComponent(r.key)}`)}
              >
                <td className="col-name">
                  <div className="table-title">{r.label}</div>
                  <div className="table-sub">{r.key}</div>
                </td>
                <td>
                  <span className="code-pill">{r.defaultBranch || '—'}</span>
                </td>
                <td>
                  <span className="tag-pill">{r.latestTag || '—'}</span>
                </td>
                <td>
                  {r.monorepo ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                      <span className="code-pill" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                        {r.monorepo.workspaces?.length || 0} workspaces
                      </span>
                      {r.stimulusVersion && (
                        <span className="stimulus-pill" style={{ fontSize: '11px', padding: '1px 6px' }}>
                          Stimulus v{r.stimulusVersion}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <strong>{r.packageVersion || '—'}</strong>
                      {r.stimulusVersion && (
                        <div style={{ marginTop: '2px' }}>
                          <span className="stimulus-pill" style={{ fontSize: '11px', padding: '1px 6px' }}>
                            Stimulus v{r.stimulusVersion}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {st ? (
                    <span className={st.pulledVersion ? 'code-pill' : 'dim'}>
                      {st.pulledVersion || '—'}
                    </span>
                  ) : r.monorepo ? (
                    <span className="dim" style={{ fontSize: '11px' }}>
                      {r.monorepo.workspaces ? r.monorepo.workspaces.map(w => w.name).slice(0, 2).join(', ') + (r.monorepo.workspaces.length > 2 ? '…' : '') : '—'}
                    </span>
                  ) : (
                    <span className="dim">N/A</span>
                  )}
                </td>
                <td>
                  {st ? (
                    <span className="code-pill">{st.baseLatestVersion || '—'}</span>
                  ) : (
                    <span className="dim">—</span>
                  )}
                </td>
                <td>
                  {!r.ok ? (
                    <span className="status-badge err">Error</span>
                  ) : r.monorepo ? (
                    <span className="status-badge monorepo" style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                      🏛️ Monorepo
                    </span>
                  ) : !st ? (
                    <span className="status-badge normal">Standard</span>
                  ) : isUpToDate ? (
                    <span className="status-badge ok">✓ Up to date</span>
                  ) : isBehind ? (
                    <span className="status-badge warn">
                      ⚠️ {st.behindCount != null ? `${st.behindCount} commit(s) behind` : 'Out of date'}
                    </span>
                  ) : (
                    <span className="status-badge faint">Unknown</span>
                  )}
                </td>
                <td>
                  <span className="dim" style={{ fontSize: '11px' }}>{fmtDate(r.commitDate)}</span>
                </td>
                <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                  {r.webUrl && (
                    <a
                      href={r.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-table-link"
                      title="Open in GitLab"
                    >
                      open ↗
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

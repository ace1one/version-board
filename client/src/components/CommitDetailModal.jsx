import React, { useState, useEffect } from 'react';
import DiffViewer from './DiffViewer';
import { fmtDate, timeAgo } from '../utils/helpers';
import {
  CommitIcon,
  TagIcon,
  GitBranchIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  FolderIcon,
  SearchIcon,
  RefreshIcon,
  FileCodeIcon,
} from './Icons';

export default function CommitDetailModal({
  isOpen,
  onClose,
  commitSha,
  project,
  config,
  onSelectSha,
}) {
  const [activeSubTab, setActiveSubTab] = useState('changes'); // 'changes' | 'overview' | 'refs'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commitData, setCommitData] = useState(null);
  const [diffs, setDiffs] = useState([]);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [fileFilter, setFileFilter] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedSha, setCopiedSha] = useState(false);

  const effectiveToken = config?.token || sessionStorage.getItem('vb_session_token') || '';
  const effectiveGitlabUrl = config?.gitlabUrl || sessionStorage.getItem('vb_session_gitlab_url') || '';

  const loadCommitDetails = async (shaToLoad) => {
    const targetSha = shaToLoad || commitSha;
    if (!isOpen || !targetSha || !project) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/commit-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: effectiveGitlabUrl,
          token: effectiveToken,
          projectPath: project.key,
          projectId: project.gitlabProjectId,
          sha: targetSha,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCommitData(data.commit);
      setDiffs(data.diffs || []);
      setSelectedFileIdx(0);
    } catch (err) {
      console.error('Failed to load commit details:', err);
      setError(err.message || 'Failed to load commit details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && commitSha) {
      loadCommitDetails(commitSha);
    }
  }, [isOpen, commitSha]);

  if (!isOpen) return null;

  const handleCopySha = (sha) => {
    if (!sha) return;
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleJumpToCommit = (sha) => {
    if (onSelectSha) {
      onSelectSha(sha);
    } else {
      loadCommitDetails(sha);
    }
  };

  const cleanWebUrl = project?.webUrl || (effectiveGitlabUrl ? `${effectiveGitlabUrl.replace(/\/+$/, '')}/${project?.key}` : '');
  const commitWebUrl = commitData?.webUrl || (cleanWebUrl ? `${cleanWebUrl}/-/commit/${commitData?.id || commitSha}` : '');
  const treeWebUrl = cleanWebUrl ? `${cleanWebUrl}/-/tree/${commitData?.id || commitSha}` : '';

  // Filter diffs by file search
  const filteredDiffs = diffs.filter((d) => {
    if (!fileFilter) return true;
    const path = (d.newPath || d.oldPath || '').toLowerCase();
    return path.includes(fileFilter.toLowerCase().trim());
  });

  const currentDiff = filteredDiffs[selectedFileIdx] || filteredDiffs[0];

  const commit = commitData;
  const stats = commit?.stats || {
    additions: diffs.reduce((acc, d) => acc + (d.additions || 0), 0),
    deletions: diffs.reduce((acc, d) => acc + (d.deletions || 0), 0),
    changedFiles: diffs.length,
  };

  // Separate title from extra description
  let commitDescription = '';
  if (commit?.message) {
    const msg = commit.message.trim();
    if (commit.title && msg.startsWith(commit.title)) {
      commitDescription = msg.slice(commit.title.length).trim();
    } else if (msg !== commit.title) {
      commitDescription = msg;
    }
  }

  return (
    <div className="modal-backdrop commit-detail-backdrop" onClick={onClose}>
      <div
        className="modal-card mr-review-modal commit-detail-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.28)', color: '#38bdf8' }}>
              <CommitIcon size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="modal-title" style={{ fontFamily: 'var(--font-mono)' }}>
                  Commit {commit?.shortId || (commitSha && commitSha.slice(0, 8))}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '2px 7px', fontSize: '11px', height: '22px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => handleCopySha(commit?.id || commitSha)}
                  title="Copy full commit SHA"
                >
                  {copiedSha ? <><CheckIcon size={11} /> Copied</> : <><CopyIcon size={11} /> Copy SHA</>}
                </button>
              </div>
              <div className="modal-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                <span>
                  authored {commit?.authoredDate ? timeAgo(commit.authoredDate) : ''} ({commit?.authoredDate ? fmtDate(commit.authoredDate) : ''}) by
                </span>
                <strong style={{ color: 'var(--text)' }}>{commit?.authorName || 'Unknown Author'}</strong>
                {commit?.authorEmail && (
                  <span style={{ color: 'var(--text-faint)' }}>&lt;{commit.authorEmail}&gt;</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {treeWebUrl && (
              <a
                href={treeWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Browse repository tree at this commit on GitLab"
              >
                <FolderIcon size={13} /> Browse files
              </a>
            )}

            {commitWebUrl && (
              <a
                href={commitWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Open this commit directly in GitLab"
              >
                Open in GitLab <ExternalLinkIcon size={12} />
              </a>
            )}

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              title="Close modal (Esc)"
            >
              &times;
            </button>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {loading && (
          <div className="modal-body" style={{ flex: 1, minHeight: 0, padding: '80px 24px', textAlign: 'center' }}>
            <RefreshIcon size={28} className="spin" style={{ marginBottom: '12px', color: 'var(--accent)' }} />
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading commit details and file diffs...</div>
          </div>
        )}

        {error && (
          <div className="modal-body" style={{ flex: 1, minHeight: 0, padding: '24px' }}>
            <div className="modal-error-banner">
              <strong>Error:</strong> {error}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginLeft: '12px', padding: '3px 8px', fontSize: '11.5px' }}
                onClick={() => loadCommitDetails(commitSha)}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY */}
        {!loading && !error && commit && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* SUB-TABS (Changes / Overview / Refs) */}
            <div className="mr-review-subtabs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#182026', borderBottom: '1px solid #26313a' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`mr-subtab ${activeSubTab === 'changes' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('changes')}
                >
                  <FileCodeIcon size={14} />
                  <span>Changes</span>
                  <span className="subtab-count">{stats.changedFiles}</span>
                </button>

                <button
                  type="button"
                  className={`mr-subtab ${activeSubTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('overview')}
                >
                  <span>Commit Message & Details</span>
                </button>

                <button
                  type="button"
                  className={`mr-subtab ${activeSubTab === 'refs' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('refs')}
                >
                  <GitBranchIcon size={14} />
                  <span>Branches & Tags</span>
                  <span className="subtab-count">{(commit.branches?.length || 0) + (commit.tags?.length || 0)}</span>
                </button>
              </div>

              {activeSubTab === 'changes' && diffs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span className="diff-stat-summary" style={{ fontSize: '12px', display: 'inline-flex', gap: '6px' }}>
                    <span className="stat-add">+{stats.additions}</span>
                    <span className="stat-del">-{stats.deletions}</span>
                  </span>
                  <button
                    type="button"
                    className="btn-sidebar-toggle"
                    onClick={() => setShowSidebar(!showSidebar)}
                    title={showSidebar ? 'Collapse file sidebar to widen diff review area' : 'Show file sidebar'}
                  >
                    {showSidebar ? '◀ Hide Files' : '▶ Show Files'}
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: CHANGES (SPLIT FILE LIST + FULL DIFF VIEWER) */}
            {activeSubTab === 'changes' && (
              <div className="mr-changes-layout" style={{ flex: 1, minHeight: 0 }}>
                {/* File list sidebar */}
                {showSidebar && diffs.length > 0 && (
                  <div className="mr-files-sidebar">
                    <div className="mr-files-header">
                      <input
                        type="text"
                        placeholder="Filter changed files..."
                        value={fileFilter}
                        onChange={(e) => {
                          setFileFilter(e.target.value);
                          setSelectedFileIdx(0);
                        }}
                        className="mr-file-search"
                      />
                    </div>
                    <div className="mr-files-list">
                      {filteredDiffs.length === 0 && (
                        <div className="tab-empty" style={{ padding: '24px' }}>No files matched</div>
                      )}
                      {filteredDiffs.map((d, idx) => {
                        const isSelected = (filteredDiffs[selectedFileIdx] || filteredDiffs[0]) === d;
                        const fullPath = d.newPath || d.oldPath || '';
                        const parts = fullPath.split('/');
                        const fileName = parts.pop();
                        const dirPath = parts.join('/');

                        return (
                          <div
                            key={idx}
                            className={`mr-file-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedFileIdx(idx)}
                            title={fullPath}
                          >
                            <div className="mr-file-name-wrap">
                              <span className="mr-file-name">{fileName}</span>
                              {dirPath && <span className="mr-file-dir">{dirPath}/</span>}
                            </div>
                            <div className="mr-file-flags">
                              {d.newFile && <span className="diff-tag-pill added">+N</span>}
                              {d.deletedFile && <span className="diff-tag-pill deleted">-D</span>}
                              {d.renamedFile && <span className="diff-tag-pill renamed">R</span>}
                              {(d.additions > 0 || d.deletions > 0) && (
                                <span className="diff-stat-summary" style={{ fontSize: '10.5px' }}>
                                  {d.additions > 0 && <span className="stat-add">+{d.additions}</span>}
                                  {d.deletions > 0 && <span className="stat-del">-{d.deletions}</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Diff Main Area */}
                <div className="mr-diff-content-area" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                  {currentDiff ? (
                    <div style={{ position: 'relative' }}>
                      <DiffViewer
                        diff={currentDiff.diff}
                        oldPath={currentDiff.oldPath}
                        newPath={currentDiff.newPath}
                        newFile={currentDiff.newFile}
                        deletedFile={currentDiff.deletedFile}
                        renamedFile={currentDiff.renamedFile}
                      />
                    </div>
                  ) : (
                    <div className="tab-empty" style={{ padding: '80px 0', textAlign: 'center' }}>
                      {diffs.length === 0 ? 'No file changes in this commit.' : 'No file selected.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: COMMIT MESSAGE & OVERVIEW */}
            {activeSubTab === 'overview' && (
              <div className="modal-body mr-overview-body" style={{ flex: 1, minHeight: 0, padding: '24px', overflowY: 'auto' }}>
                <div className="card detail-card" style={{ background: '#182026', margin: 0, maxWidth: '1000px' }}>
                  <div className="subtree-title" style={{ fontSize: '15px', color: 'var(--text)' }}>
                    Commit Information
                  </div>

                  <div style={{ marginTop: '14px', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 10px', lineHeight: '1.4' }}>
                      {commit.title}
                    </h2>
                    {commitDescription && (
                      <div
                        style={{
                          padding: '14px 16px',
                          background: '#0d1215',
                          border: '1px solid #28333c',
                          borderRadius: '8px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: 'var(--text)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {commitDescription}
                      </div>
                    )}
                  </div>

                  <div className="divider" style={{ margin: '16px 0' }} />

                  <div className="data-row">
                    <span className="label">Commit SHA</span>
                    <span className="value font-mono">
                      {commit.id}{' '}
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '1px 6px', fontSize: '11px', height: '20px', marginLeft: '6px' }}
                        onClick={() => handleCopySha(commit.id)}
                      >
                        {copiedSha ? 'Copied' : 'Copy'}
                      </button>
                    </span>
                  </div>

                  <div className="data-row">
                    <span className="label">Author</span>
                    <span className="value">
                      <strong>{commit.authorName}</strong> {commit.authorEmail && <span className="dim">&lt;{commit.authorEmail}&gt;</span>}
                    </span>
                  </div>

                  <div className="data-row">
                    <span className="label">Authored Date</span>
                    <span className="value">
                      {fmtDate(commit.authoredDate)} ({timeAgo(commit.authoredDate)})
                    </span>
                  </div>

                  {commit.committerName && commit.committerName !== commit.authorName && (
                    <div className="data-row">
                      <span className="label">Committer</span>
                      <span className="value">
                        <strong>{commit.committerName}</strong> {commit.committerEmail && <span className="dim">&lt;{commit.committerEmail}&gt;</span>}
                      </span>
                    </div>
                  )}

                  {commit.parentIds && commit.parentIds.length > 0 && (
                    <div className="data-row">
                      <span className="label">Parent Commit{commit.parentIds.length > 1 ? 's' : ''}</span>
                      <span className="value" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {commit.parentIds.map((pSha) => (
                          <button
                            key={pSha}
                            type="button"
                            className="code-pill"
                            style={{ cursor: 'pointer', background: '#1d2730', border: '1px solid #2e3d4b', color: 'var(--accent)' }}
                            onClick={() => handleJumpToCommit(pSha)}
                            title={`View parent commit ${pSha}`}
                          >
                            {pSha.slice(0, 8)}
                          </button>
                        ))}
                      </span>
                    </div>
                  )}

                  <div className="data-row">
                    <span className="label">Stats</span>
                    <span className="value">
                      {stats.changedFiles} changed file{stats.changedFiles === 1 ? '' : 's'} (
                      <span className="stat-add">+{stats.additions} additions</span>,{' '}
                      <span className="stat-del">-{stats.deletions} deletions</span>)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BRANCHES & TAGS */}
            {activeSubTab === 'refs' && (
              <div className="modal-body mr-overview-body" style={{ flex: 1, minHeight: 0, padding: '24px', overflowY: 'auto' }}>
                <div className="card detail-card" style={{ background: '#182026', margin: 0, maxWidth: '1000px' }}>
                  <div className="subtree-title" style={{ fontSize: '15px', color: 'var(--text)' }}>
                    Branches &amp; Tags Containing this Commit
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GitBranchIcon size={14} /> Branches ({commit.branches?.length || 0})
                    </div>
                    {commit.branches && commit.branches.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {commit.branches.map((b) => (
                          <span key={b} className="badge badge-branch" style={{ fontSize: '12px', padding: '3px 8px' }}>
                            {b}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="dim" style={{ fontSize: '12.5px' }}>No branch refs found containing this commit.</div>
                    )}
                  </div>

                  <div className="divider" style={{ margin: '20px 0' }} />

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TagIcon size={14} /> Tags ({commit.tags?.length || 0})
                    </div>
                    {commit.tags && commit.tags.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {commit.tags.map((t) => (
                          <span key={t} className="tag-pill" style={{ fontSize: '12px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <TagIcon size={11} /> {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="dim" style={{ fontSize: '12.5px' }}>No tags found pointing to or containing this commit.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          {commitWebUrl && (
            <a
              href={commitWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              Open in GitLab <ExternalLinkIcon size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

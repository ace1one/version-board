import React, { useState, useEffect } from 'react';
import DiffViewer from './DiffViewer';
import { fmtDate } from '../utils/helpers';
import {
  PullRequestIcon,
  GitBranchIcon,
  GitMergeIcon,
  AlertTriangleIcon,
  CheckIcon,
  ExternalLinkIcon,
  CommitIcon,
  FileCodeIcon,
  RefreshIcon,
} from './Icons';

export default function MrReviewModal({
  isOpen,
  onClose,
  mrId,
  project,
  config,
  onMerged,
}) {
  const [activeSubTab, setActiveSubTab] = useState('changes'); // 'changes' | 'overview' | 'commits'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mrDetails, setMrDetails] = useState(null);
  const [changesData, setChangesData] = useState({ changes: [], commits: [] });
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [fileFilter, setFileFilter] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  // Merge execution state
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [shouldRemoveSource, setShouldRemoveSource] = useState(true); // Default checked like GitLab
  const [squash, setSquash] = useState(false);

  const effectiveToken = config.token || sessionStorage.getItem('vb_session_token') || '';
  const effectiveGitlabUrl = config.gitlabUrl || sessionStorage.getItem('vb_session_gitlab_url') || '';

  const loadData = async () => {
    if (!isOpen || !mrId || !project) return;
    setLoading(true);
    setError('');
    setMergeError('');

    try {
      const [detailsRes, changesRes] = await Promise.all([
        fetch('/api/mr-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gitlabUrl: effectiveGitlabUrl,
            token: effectiveToken,
            projectPath: project.key,
            projectId: project.gitlabProjectId,
            mrIid: mrId,
          }),
        }),
        fetch('/api/mr-changes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gitlabUrl: effectiveGitlabUrl,
            token: effectiveToken,
            projectPath: project.key,
            projectId: project.gitlabProjectId,
            mrIid: mrId,
          }),
        }),
      ]);

      const detailsData = await detailsRes.json();
      if (detailsData.error) throw new Error(detailsData.error);

      const changesJson = await changesRes.json();
      if (changesJson.error) throw new Error(changesJson.error);

      setMrDetails(detailsData.mergeRequest);
      setChangesData(changesJson);
      if (detailsData.mergeRequest?.shouldRemoveSourceBranch != null) {
        setShouldRemoveSource(detailsData.mergeRequest.shouldRemoveSourceBranch);
      }
      if (detailsData.mergeRequest?.squash != null) {
        setSquash(detailsData.mergeRequest.squash);
      }
    } catch (err) {
      console.error('Failed to load MR review data:', err);
      setError(err.message || 'Failed to load Merge Request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && mrId) {
      loadData();
    }
  }, [isOpen, mrId]);

  if (!isOpen) return null;

  const handleMerge = async () => {
    if (!window.confirm(`Are you sure you want to merge MR !${mrId} into ${mrDetails?.targetBranch}?`)) {
      return;
    }

    setMerging(true);
    setMergeError('');

    try {
      const res = await fetch('/api/mr-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: effectiveGitlabUrl,
          token: effectiveToken,
          projectPath: project.key,
          projectId: project.gitlabProjectId,
          mrIid: mrId,
          shouldRemoveSourceBranch: shouldRemoveSource,
          squash: squash,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMergeSuccess(true);
      if (onMerged) onMerged(data.mergeRequest);
      setTimeout(() => {
        loadData();
      }, 1000);
    } catch (err) {
      setMergeError(err.message || 'Failed to merge Merge Request');
    } finally {
      setMerging(false);
    }
  };

  const hasConflicts = mrDetails?.hasConflicts === true || mrDetails?.detailedMergeStatus === 'cannot_be_merged';
  const isMerged = mrDetails?.state === 'merged' || mergeSuccess;
  const isClosed = mrDetails?.state === 'closed';
  const isMergeable = !hasConflicts && !isMerged && !isClosed && (mrDetails?.detailedMergeStatus === 'mergeable' || mrDetails?.state === 'opened');

  const filteredChanges = (changesData.changes || []).filter((c) => {
    const q = fileFilter.toLowerCase().trim();
    if (!q) return true;
    return (c.newPath && c.newPath.toLowerCase().includes(q)) || (c.oldPath && c.oldPath.toLowerCase().includes(q));
  });

  const currentChange = filteredChanges[selectedFileIdx] || filteredChanges[0];

  const assigneesList = mrDetails?.assignees || (mrDetails?.assignee ? [mrDetails.assignee] : []);
  const reviewersList = mrDetails?.reviewers || [];

  return (
    <div className="modal-backdrop mr-review-backdrop" onClick={onClose}>
      <div className="modal-card mr-review-modal" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <PullRequestIcon size={18} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 className="modal-title">!{mrId} {mrDetails?.title || 'Merge Request'}</h3>
                {mrDetails && (
                  <span className={`state-badge ${isMerged ? 'merged' : mrDetails.state}`}>
                    {isMerged ? 'merged' : mrDetails.state}
                  </span>
                )}
                {hasConflicts && (
                  <span className="conflict-badge">
                    <AlertTriangleIcon size={12} /> Conflicts
                  </span>
                )}
              </div>
              <div className="mr-header-meta-row">
                <span className="mr-project-label">{project?.label}</span>
                <span>•</span>
                <span className="branch-path-pill">
                  <GitBranchIcon size={11} /> {mrDetails?.sourceBranch || '…'} → {mrDetails?.targetBranch || '…'}
                </span>
                {mrDetails?.author && (
                  <>
                    <span>•</span>
                    <span>by <strong>{mrDetails.author}</strong></span>
                  </>
                )}
                {assigneesList.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="mr-header-pill">Assignee: <strong>{assigneesList.map((a) => a.name).join(', ')}</strong></span>
                  </>
                )}
                {reviewersList.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="mr-header-pill">Reviewers: <strong>{reviewersList.map((r) => r.name).join(', ')}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mrDetails?.webUrl && (
              <a
                href={mrDetails.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                title="Open in GitLab"
              >
                GitLab <ExternalLinkIcon size={12} />
              </a>
            )}
            <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {loading && (
          <div className="modal-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="tab-loading">Loading Merge Request details & diffs...</div>
          </div>
        )}

        {error && (
          <div className="modal-body">
            <div className="modal-error-banner">⚠️ {error}</div>
            <button type="button" className="btn btn-ghost" onClick={loadData} style={{ marginTop: '10px' }}>
              <RefreshIcon size={13} /> Retry
            </button>
          </div>
        )}

        {!loading && !error && mrDetails && (
          <>
            {/* GITLAB MERGE STATUS BANNER */}
            <div className="mr-status-banner-wrap">
              {hasConflicts && (
                <div className="mr-conflict-banner">
                  <div className="banner-icon"><AlertTriangleIcon size={18} /></div>
                  <div className="banner-content">
                    <strong>Merge blocked: Cannot be merged automatically</strong>
                    <p>There are merge conflicts between <code>{mrDetails.sourceBranch}</code> and <code>{mrDetails.targetBranch}</code>. Resolve conflicts on GitLab or in your local branch to merge.</p>
                  </div>
                </div>
              )}

              {isMerged && (
                <div className="mr-merged-banner">
                  <div className="banner-icon"><CheckIcon size={18} /></div>
                  <div className="banner-content">
                    <strong>Merged successfully into <code>{mrDetails.targetBranch}</code></strong>
                    {mrDetails.mergedBy && <p>Merged by {mrDetails.mergedBy} on {fmtDate(mrDetails.mergedAt)}</p>}
                  </div>
                </div>
              )}

              {isClosed && !isMerged && (
                <div className="mr-closed-banner">
                  <strong>This merge request is closed.</strong>
                </div>
              )}

              {isMergeable && (
                <div className="mr-ready-banner">
                  <div className="banner-left">
                    <div className="banner-icon"><CheckIcon size={18} /></div>
                    <div className="banner-content">
                      <strong>Ready to merge!</strong>
                      <p>No merge conflicts with <code>{mrDetails.targetBranch}</code>. All checks passed.</p>
                    </div>
                  </div>

                  <div className="merge-action-controls">
                    <label className="merge-option-label">
                      <input
                        type="checkbox"
                        checked={shouldRemoveSource}
                        onChange={(e) => setShouldRemoveSource(e.target.checked)}
                      />
                      <span>Delete source branch</span>
                    </label>

                    <label className="merge-option-label">
                      <input
                        type="checkbox"
                        checked={squash}
                        onChange={(e) => setSquash(e.target.checked)}
                      />
                      <span>Squash commits</span>
                    </label>

                    <button
                      type="button"
                      className="btn btn-primary btn-merge"
                      onClick={handleMerge}
                      disabled={merging}
                    >
                      <GitMergeIcon size={14} />
                      {merging ? 'Merging...' : 'Merge'}
                    </button>
                  </div>
                </div>
              )}

              {mergeError && (
                <div className="modal-error-banner" style={{ marginTop: '10px' }}>
                  ⚠️ {mergeError}
                </div>
              )}
            </div>

            {/* SUB-TABS (Changes / Overview / Commits) */}
            <div className="mr-review-subtabs">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`mr-subtab ${activeSubTab === 'changes' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('changes')}
                >
                  <FileCodeIcon size={14} />
                  <span>Changes</span>
                  <span className="subtab-count">{changesData.changes?.length || 0}</span>
                </button>

                <button
                  type="button"
                  className={`mr-subtab ${activeSubTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('overview')}
                >
                  <span>Description & Details</span>
                </button>

                <button
                  type="button"
                  className={`mr-subtab ${activeSubTab === 'commits' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('commits')}
                >
                  <CommitIcon size={14} />
                  <span>Commits</span>
                  <span className="subtab-count">{changesData.commits?.length || 0}</span>
                </button>
              </div>

              {activeSubTab === 'changes' && (
                <button
                  type="button"
                  className="btn-sidebar-toggle"
                  onClick={() => setShowSidebar(!showSidebar)}
                  title={showSidebar ? 'Collapse file sidebar to widen diff review area' : 'Show file sidebar'}
                >
                  {showSidebar ? '◀ Hide Files' : '▶ Show Files'}
                </button>
              )}
            </div>

            {/* SUB-TAB 1: CHANGES (DIFF VIEWER) */}
            {activeSubTab === 'changes' && (
              <div className="mr-changes-layout">
                {/* File list sidebar */}
                {showSidebar && (
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
                      {filteredChanges.length === 0 && (
                        <div className="tab-empty" style={{ padding: '24px' }}>No files matched</div>
                      )}
                      {filteredChanges.map((change, idx) => {
                        const isSelected = (filteredChanges[selectedFileIdx] || filteredChanges[0]) === change;
                        const fullPath = change.newPath || change.oldPath || '';
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
                              {change.newFile && <span className="diff-tag-pill added">+N</span>}
                              {change.deletedFile && <span className="diff-tag-pill deleted">-D</span>}
                              {change.renamedFile && <span className="diff-tag-pill renamed">R</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Diff Main Area */}
                <div className="mr-diff-content-area">
                  {currentChange ? (
                    <DiffViewer
                      diff={currentChange.diff}
                      oldPath={currentChange.oldPath}
                      newPath={currentChange.newPath}
                      newFile={currentChange.newFile}
                      deletedFile={currentChange.deletedFile}
                      renamedFile={currentChange.renamedFile}
                    />
                  ) : (
                    <div className="tab-empty" style={{ padding: '60px' }}>
                      No diff selected
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: OVERVIEW / DESCRIPTION */}
            {activeSubTab === 'overview' && (
              <div className="modal-body mr-overview-body">
                <div className="card detail-card" style={{ background: '#182026', margin: 0 }}>
                  <div className="subtree-title">Merge Request Details</div>
                  <div className="data-row">
                    <span className="label">Title</span>
                    <span className="value font-bold">{mrDetails.title}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Source Branch</span>
                    <span className="value"><code>{mrDetails.sourceBranch}</code></span>
                  </div>
                  <div className="data-row">
                    <span className="label">Target Branch</span>
                    <span className="value"><code>{mrDetails.targetBranch}</code></span>
                  </div>
                  <div className="data-row">
                    <span className="label">Author</span>
                    <span className="value">{mrDetails.author} ({mrDetails.authorUsername})</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Assignees</span>
                    <span className="value">
                      {assigneesList.length > 0
                        ? assigneesList.map((a) => `${a.name} (@${a.username})`).join(', ')
                        : 'Unassigned'}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="label">Reviewers</span>
                    <span className="value">
                      {reviewersList.length > 0
                        ? reviewersList.map((r) => `${r.name} (@${r.username})`).join(', ')
                        : 'None assigned'}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="label">Created At</span>
                    <span className="value dim">{fmtDate(mrDetails.createdAt)}</span>
                  </div>
                  {mrDetails.updatedAt && (
                    <div className="data-row">
                      <span className="label">Updated At</span>
                      <span className="value dim">{fmtDate(mrDetails.updatedAt)}</span>
                    </div>
                  )}
                  {mrDetails.labels?.length > 0 && (
                    <div className="data-row">
                      <span className="label">Labels</span>
                      <span className="value">
                        <div className="label-list" style={{ marginTop: 2 }}>
                          {mrDetails.labels.map((l, i) => (
                            <span key={i} className="label-pill">{l}</span>
                          ))}
                        </div>
                      </span>
                    </div>
                  )}
                </div>

                <div className="card detail-card" style={{ background: '#182026', margin: 0 }}>
                  <div className="subtree-title">Description</div>
                  {mrDetails.description ? (
                    <div className="mr-description-text">
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                        {mrDetails.description}
                      </pre>
                    </div>
                  ) : (
                    <p className="dim" style={{ margin: 0, fontStyle: 'italic' }}>No description provided.</p>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: COMMITS */}
            {activeSubTab === 'commits' && (
              <div className="modal-body mr-commits-body">
                {changesData.commits?.length === 0 && (
                  <div className="tab-empty">No commits listed for this MR</div>
                )}
                {changesData.commits?.map((c) => (
                  <div key={c.id} className="list-item commit-list-item">
                    <div className="list-item-head">
                      <span className="code-pill">{c.shortId}</span>
                      <span className="list-item-title">{c.title}</span>
                    </div>
                    <div className="list-item-meta">
                      <span>by <strong>{c.author}</strong></span>
                      <span>{fmtDate(c.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

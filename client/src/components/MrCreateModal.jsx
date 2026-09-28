import React, { useState, useEffect } from 'react';
import BranchDropdown from './BranchDropdown';
import UserPicker from './UserPicker';
import { PullRequestIcon, GitBranchIcon, CheckIcon, ExternalLinkIcon, UserIcon } from './Icons';

export default function MrCreateModal({
  isOpen,
  onClose,
  project,
  config,
  branches = [],
  tags = [],
  onSuccess,
}) {
  if (!isOpen || !project) return null;

  const defaultTargetBranch = project.defaultBranch || 'master';
  const [sourceBranch, setSourceBranch] = useState(
    branches.length > 0 && branches[0]?.name !== defaultTargetBranch ? branches[0]?.name : ''
  );
  const [targetBranch, setTargetBranch] = useState(defaultTargetBranch);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState('');
  const [assigneeId, setAssigneeId] = useState(null);
  const [reviewerIds, setReviewerIds] = useState([]);
  const [removeSourceBranch, setRemoveSourceBranch] = useState(true); // Default checked like GitLab
  const [squash, setSquash] = useState(false);

  // Members list & Current User
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdMr, setCreatedMr] = useState(null);

  const effectiveToken = config?.token || sessionStorage.getItem('vb_session_token') || '';
  const effectiveGitlabUrl = config?.gitlabUrl || sessionStorage.getItem('vb_session_gitlab_url') || '';

  // Auto fill title from latest commit or branch name whenever source branch changes (GitLab behavior)
  useEffect(() => {
    if (!sourceBranch) return;

    // Helper formatted fallback
    const cleanBranch = sourceBranch
      .replace(/^(feature|bugfix|hotfix|fix|refactor|chore)\//i, '')
      .replace(/[-_]/g, ' ')
      .trim();
    const fallbackTitle = cleanBranch ? cleanBranch.charAt(0).toUpperCase() + cleanBranch.slice(1) : sourceBranch;

    // Update title immediately to fallback formatted branch name
    setTitle(fallbackTitle);

    // Query latest commit of source branch to use actual commit message as default title
    if (effectiveGitlabUrl && effectiveToken && project) {
      fetch('/api/project-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: effectiveGitlabUrl,
          token: effectiveToken,
          projectPath: project.key,
          projectId: project.gitlabProjectId,
          ref: sourceBranch,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.commits && data.commits.length > 0) {
            const latest = data.commits[0];
            if (latest.title) {
              setTitle(latest.title);
            }
            if (latest.message) {
              const lines = latest.message.split('\n').map((l) => l.trim()).filter(Boolean);
              if (lines.length > 1) {
                setDescription(lines.slice(1).join('\n'));
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [sourceBranch, project?.key, project?.gitlabProjectId, effectiveGitlabUrl, effectiveToken]);

  // Fetch project members for assignee & reviewers on mount
  useEffect(() => {
    if (project && effectiveGitlabUrl && effectiveToken) {
      setMembersLoading(true);
      fetch('/api/project-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: effectiveGitlabUrl,
          token: effectiveToken,
          projectPath: project.key,
          projectId: project.gitlabProjectId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.members) setMembers(data.members);
          if (data.currentUser) setCurrentUser(data.currentUser);
        })
        .catch((e) => console.warn('Failed to load project members:', e.message))
        .finally(() => setMembersLoading(false));
    }
  }, [project?.key, project?.gitlabProjectId, effectiveGitlabUrl, effectiveToken]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!sourceBranch) {
      setError('Please select or specify a source branch.');
      return;
    }
    if (sourceBranch === targetBranch) {
      setError('Source branch and target branch must be different.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/mr-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: effectiveGitlabUrl,
          token: effectiveToken,
          projectPath: project.key,
          projectId: project.gitlabProjectId,
          sourceBranch,
          targetBranch,
          title,
          description,
          labels: labels.split(',').map((l) => l.trim()).filter(Boolean),
          assigneeId: assigneeId ? parseInt(assigneeId, 10) : undefined,
          reviewerIds: reviewerIds.map((id) => parseInt(id, 10)),
          removeSourceBranch,
          squash,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCreatedMr(data.mergeRequest);
      if (onSuccess) onSuccess(data.mergeRequest);
    } catch (err) {
      setError(err.message || 'Failed to create Merge Request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card mr-create-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <PullRequestIcon size={18} />
            </span>
            <div>
              <h3 className="modal-title">New Merge Request</h3>
              <p className="modal-subtitle">{project.label || project.key}</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {createdMr ? (
          <div className="modal-body success-state">
            <div className="success-icon-wrap">
              <CheckIcon size={28} />
            </div>
            <h4>Merge Request Created!</h4>
            <p className="success-sub">MR #{createdMr.id} has been opened on GitLab targeting <code>{createdMr.targetBranch}</code>.</p>
            <div className="success-actions">
              <a
                href={createdMr.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                Open in GitLab <ExternalLinkIcon size={13} />
              </a>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="mr-create-form">
            <div className="modal-body mr-form-body">
              {error && <div className="modal-error-banner">⚠️ {error}</div>}

              {/* Branch Pickers with Searchable Dropdowns */}
              <div className="mr-branches-row">
                <div className="mr-form-field">
                  <label className="mr-field-label">
                    <GitBranchIcon size={13} className="label-icon" />
                    <span>Source Branch</span>
                  </label>
                  <BranchDropdown
                    branches={branches}
                    tags={tags}
                    selectedRef={sourceBranch}
                    defaultBranch={branches[0]?.name || ''}
                    onSelect={(branch) => setSourceBranch(branch)}
                  />
                  <span className="mr-field-hint">The branch containing your changes</span>
                </div>

                <div className="mr-branch-arrow-divider">
                  <span>→</span>
                </div>

                <div className="mr-form-field">
                  <label className="mr-field-label">
                    <GitBranchIcon size={13} className="label-icon" />
                    <span>Target Branch</span>
                  </label>
                  <BranchDropdown
                    branches={branches}
                    tags={tags}
                    selectedRef={targetBranch}
                    defaultBranch={defaultTargetBranch}
                    onSelect={(branch) => setTargetBranch(branch)}
                  />
                  <span className="mr-field-hint">The branch to merge into</span>
                </div>
              </div>

              {/* Title Field */}
              <div className="mr-form-field">
                <label className="mr-field-label">
                  <span>Title</span>
                  <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fix(auth): resolve session token expiration on reload"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mr-input"
                />
              </div>

              {/* Description Field */}
              <div className="mr-form-field">
                <label className="mr-field-label">
                  <span>Description</span>
                  <span className="optional-tag">(Markdown supported)</span>
                </label>
                <textarea
                  rows="4"
                  placeholder="Describe the changes in this MR, testing notes, or reference issues (#123)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mr-textarea"
                />
              </div>

              {/* Assignee & Reviewers Section (GitLab style) */}
              <div className="form-row-grid">
                <div className="mr-form-field">
                  <label className="mr-field-label">
                    <span>Assignee</span>
                    <span className="optional-tag">(Optional)</span>
                  </label>
                  <UserPicker
                    users={members}
                    selectedIds={assigneeId ? [assigneeId] : []}
                    multiple={false}
                    currentUser={currentUser}
                    placeholder="Search or select assignee..."
                    loading={membersLoading}
                    onChange={(ids) => setAssigneeId(ids[0] || null)}
                  />
                </div>

                <div className="mr-form-field">
                  <label className="mr-field-label">
                    <span>Reviewers</span>
                    <span className="optional-tag">
                      {reviewerIds.length > 0 ? `(${reviewerIds.length} selected)` : '(Optional)'}
                    </span>
                  </label>
                  <UserPicker
                    users={members}
                    selectedIds={reviewerIds}
                    multiple={true}
                    currentUser={currentUser}
                    placeholder="Search or select reviewers..."
                    loading={membersLoading}
                    onChange={(ids) => setReviewerIds(ids)}
                  />
                </div>
              </div>

              {/* Display Reviewer Chips if any selected */}
              {reviewerIds.length > 0 && (
                <div className="mr-selected-reviewers-chips">
                  {members
                    .filter((m) => reviewerIds.includes(m.id))
                    .map((m) => (
                      <div key={m.id} className="mr-reviewer-tag">
                        <span>{m.name || m.username}</span>
                        <button
                          type="button"
                          className="mr-reviewer-tag-remove"
                          onClick={() => setReviewerIds(reviewerIds.filter((id) => id !== m.id))}
                          title="Remove reviewer"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* Labels Field */}
              <div className="mr-form-field">
                <label className="mr-field-label">
                  <span>Labels</span>
                  <span className="optional-tag">(Comma separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. frontend, bugfix, review-ready"
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  className="mr-input"
                />
              </div>

              {/* Checkbox Options */}
              <div className="mr-checkbox-group">
                <label className="mr-custom-checkbox">
                  <input
                    type="checkbox"
                    checked={removeSourceBranch}
                    onChange={(e) => setRemoveSourceBranch(e.target.checked)}
                  />
                  <span className="checkbox-text">Delete source branch when merge request is accepted</span>
                </label>

                <label className="mr-custom-checkbox">
                  <input
                    type="checkbox"
                    checked={squash}
                    onChange={(e) => setSquash(e.target.checked)}
                  />
                  <span className="checkbox-text">Squash commits when merge request is accepted</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !title.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <PullRequestIcon size={14} />
                {loading ? 'Creating MR...' : 'Create Merge Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

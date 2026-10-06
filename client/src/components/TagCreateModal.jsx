import React, { useState } from 'react';
import BranchDropdown from './BranchDropdown';
import { TagIcon, CheckIcon, ExternalLinkIcon } from './Icons';

export default function TagCreateModal({
  isOpen,
  onClose,
  project,
  config,
  branches = [],
  tags = [],
  currentRef,
  onSuccess,
}) {
  if (!isOpen || !project) return null;

  const defaultRef = currentRef || project.defaultBranch || 'master';
  const [tagName, setTagName] = useState('');
  const [ref, setRef] = useState(defaultRef);
  const [message, setMessage] = useState('');
  const [releaseDescription, setReleaseDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTag, setCreatedTag] = useState(null);

  const effectiveToken = config?.token || sessionStorage.getItem('vb_session_token') || '';
  const effectiveGitlabUrl = config?.gitlabUrl || sessionStorage.getItem('vb_session_gitlab_url') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tagName.trim()) {
      setError('Tag name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tag-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: effectiveGitlabUrl,
          token: effectiveToken,
          projectPath: project.key || project.path,
          projectId: project.gitlabProjectId || project.id,
          tagName: tagName.trim(),
          ref: ref || defaultRef,
          message: message.trim() || undefined,
          releaseDescription: releaseDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create tag');
      }

      setCreatedTag(data.tag || { name: tagName.trim() });
      if (onSuccess) {
        onSuccess(data.tag);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTagName('');
    setMessage('');
    setReleaseDescription('');
    setError('');
    setCreatedTag(null);
    onClose();
  };

  const cleanWebUrl = project.webUrl || (effectiveGitlabUrl ? `${effectiveGitlabUrl.replace(/\/+$/, '')}/${project.key || project.path}` : '#');

  return (
    <div className="modal-backdrop" onClick={handleReset}>
      <div className="modal-card tag-create-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge" style={{ background: 'rgba(232, 163, 61, 0.15)', color: 'var(--warn)', borderColor: 'rgba(232, 163, 61, 0.3)' }}>
              <TagIcon size={18} />
            </span>
            <div>
              <h3 className="modal-title">New Git Tag</h3>
              <p className="modal-subtitle">{project.label || project.name} ({project.key || project.path})</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleReset} title="Close dialog">
            &times;
          </button>
        </div>

        {/* Modal Content */}
        {createdTag ? (
          <div className="modal-body success-state">
            <div className="success-icon-wrap" style={{ background: 'rgba(79, 209, 165, 0.15)', color: 'var(--accent)' }}>
              <CheckIcon size={28} />
            </div>
            <h4>Tag Created Successfully!</h4>
            <p className="success-sub">
              Tag <code>{createdTag.name}</code> was created on GitLab from <code>{ref}</code>.
            </p>
            <div className="success-actions">
              <a
                href={`${cleanWebUrl}/-/tags/${encodeURIComponent(createdTag.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                View on GitLab <ExternalLinkIcon size={13} />
              </a>
              <button type="button" className="btn btn-ghost" onClick={handleReset}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mr-create-form">
            <div className="modal-body mr-form-body">
              {error && <div className="modal-error-banner">⚠️ {error}</div>}

              {/* Tag Name Field */}
              <div className="mr-form-field">
                <label className="mr-field-label">
                  <span>Tag name</span>
                  <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. v1.0.5 or laxmi-v1.0.4"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="mr-input"
                  autoFocus
                  required
                />
              </div>

              {/* Create From Ref / Branch */}
              <div className="mr-form-field">
                <label className="mr-field-label">
                  <span>Create from (Branch or Tag)</span>
                </label>
                <BranchDropdown
                  branches={branches}
                  tags={tags}
                  selectedRef={ref}
                  defaultBranch={defaultRef}
                  onSelect={(newRef) => setRef(newRef)}
                />
                <span className="mr-field-hint">The source branch or ref where the tag will point</span>
              </div>

              {/* Message (Optional) */}
              <div className="mr-form-field">
                <label className="mr-field-label">
                  <span>Message</span>
                  <span className="optional-tag">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Short message or release title..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mr-input"
                />
              </div>

              {/* Release Notes / Description (Optional) */}
              <div className="mr-form-field">
                <label className="mr-field-label">
                  <span>Release notes</span>
                  <span className="optional-tag">(Optional)</span>
                </label>
                <textarea
                  placeholder="Detailed release changelog / description..."
                  value={releaseDescription}
                  onChange={(e) => setReleaseDescription(e.target.value)}
                  className="mr-textarea"
                  rows={3}
                />
              </div>
            </div>

            {/* Edge-to-edge Modal Footer */}
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={handleReset} disabled={loading}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !tagName.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <TagIcon size={14} />
                {loading ? 'Creating tag...' : 'Create tag'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

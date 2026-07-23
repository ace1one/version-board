import React from 'react';

export default function EmptyState({ onAddFirst, isSearch }) {
  if (isSearch) {
    return (
      <section className="empty-state">
        <div className="empty-icon">🔍</div>
        <p>No projects match your search</p>
        <p className="empty-hint">Try a different keyword or clear the search</p>
      </section>
    );
  }

  return (
    <section className="empty-state">
      <div className="empty-icon">◈</div>
      <h2 className="empty-title">Welcome to Version Board</h2>
      <p>Track default-branch versions across all your GitLab projects</p>
      <div className="empty-features">
        <div className="empty-feature">
          <span className="empty-feature-icon">📦</span>
          <span>Monitor package versions</span>
        </div>
        <div className="empty-feature">
          <span className="empty-feature-icon">🌳</span>
          <span>Track subtree sync status</span>
        </div>
        <div className="empty-feature">
          <span className="empty-feature-icon">🔀</span>
          <span>View merge requests & issues</span>
        </div>
      </div>
      <button className="btn btn-primary btn-large" onClick={onAddFirst}>
        ⚡ Get started — add projects
      </button>
    </section>
  );
}
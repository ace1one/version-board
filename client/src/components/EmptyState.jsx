import React from 'react';
import { PackageIcon, GitBranchIcon, PullRequestIcon, SearchIcon, RocketIcon } from './Icons';

export default function EmptyState({ onAddFirst, isSearch }) {
  if (isSearch) {
    return (
      <section className="empty-state">
        <div className="empty-icon">
          <SearchIcon size={28} />
        </div>
        <p>No projects match your search</p>
        <p className="empty-hint">Try a different keyword or clear the search</p>
      </section>
    );
  }

  return (
    <section className="empty-state">
      <div className="empty-icon">◈</div>
      <h2 className="empty-title">Welcome to gitClone</h2>
      <p>View, sync and manage all your Git repositories in one place</p>
      <div className="empty-features">
        <div className="empty-feature">
          <span className="empty-feature-icon">
            <PackageIcon size={18} />
          </span>
          <span>Monitor package versions</span>
        </div>
        <div className="empty-feature">
          <span className="empty-feature-icon">
            <GitBranchIcon size={18} />
          </span>
          <span>Track subtree sync status</span>
        </div>
        <div className="empty-feature">
          <span className="empty-feature-icon">
            <PullRequestIcon size={18} />
          </span>
          <span>View merge requests &amp; issues</span>
        </div>
      </div>
      <button className="btn btn-primary btn-large" onClick={onAddFirst}>
        <RocketIcon size={15} style={{ marginRight: 6 }} /> Get started — add projects
      </button>
    </section>
  );
}
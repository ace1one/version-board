import React from 'react';

export default function TopBar({ connStatus, connStatusClass, onSettings, onRefresh }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">◈</span>
        <div>
          <h1>Version Board</h1>
          <p className="subtitle">Default-branch status across your GitLab projects</p>
        </div>
      </div>
      <div className="topbar-actions">
        <span className={`conn-status ${connStatusClass}`}>{connStatus}</span>
        <button className="btn btn-ghost" onClick={onSettings}>Settings</button>
        <button className="btn btn-primary" onClick={onRefresh}>Refresh all</button>
      </div>
    </header>
  );
}
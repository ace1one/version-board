import React from 'react';

export default function TopBar({ connStatus, connStatusClass, onSettings, onRefresh, searchQuery, onSearchChange, resultCount }) {
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
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => onSearchChange && onSearchChange('')}>&times;</button>
          )}
        </div>
        <span className={`conn-status ${connStatusClass}`}>{connStatus}</span>
        {/* {resultCount != null && <span className="result-count">{resultCount} shown</span>} */}
        <button className="btn btn-ghost" onClick={onSettings}>⚙ Settings</button>
        <button className="btn btn-primary" onClick={onRefresh}>⟳ Refresh</button>
      </div>
    </header>
  );
}
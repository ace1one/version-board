import React from 'react';
import { SearchIcon, GridIcon, TableIcon, CogIcon, RefreshIcon, CheckIcon } from './Icons';

export default function TopBar({
  connStatus,
  connStatusClass,
  onSettings,
  onRefresh,
  onOpenGitDocs,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  stats,
}) {
  return (
    <header className="topbar">
      <div className="topbar-main">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <div>
            <h1>gitClone</h1>
            <p className="subtitle">View, Sync &amp; Manage Git Repositories</p>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Search box */}
          <div className="search-box">
            <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <SearchIcon size={14} />
            </span>
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

          {/* View mode toggle */}
          <div className="view-mode-toggle">
            <button
              className={`btn-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid Cards View"
            >
              <GridIcon size={13} style={{ marginRight: 4 }} /> Grid
            </button>
            <button
              className={`btn-toggle ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => onViewModeChange('table')}
              title="Matrix Table View"
            >
              <TableIcon size={13} style={{ marginRight: 4 }} /> Table
            </button>
          </div>

          <span className={`conn-status ${connStatusClass}`}>{connStatus}</span>
          <button
            type="button"
            className="btn btn-ghost btn-git-guide-nav"
            onClick={onOpenGitDocs}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ff7b72', borderColor: 'rgba(255, 123, 114, 0.35)' }}
            title="Open Interactive Git Commands Guide & Workflow Simulator"
          >
            <span style={{ display: 'inline-flex', color: '#ff7b72' }}>&gt;_</span> Git Guide
          </button>
          <button className="btn btn-ghost" onClick={onSettings} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <CogIcon size={14} /> Settings
          </button>
          <button className="btn btn-primary" onClick={onRefresh} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <RefreshIcon size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      {stats && stats.total > 0 && (
        <div className="filter-bar">
          <button
            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => onStatusFilterChange('all')}
          >
            All <span className="tab-count">{stats.total}</span>
          </button>
          {stats.behind > 0 && (
            <button
              className={`filter-tab warn ${statusFilter === 'behind' ? 'active' : ''}`}
              onClick={() => onStatusFilterChange('behind')}
            >
              Needs Base Update <span className="tab-count warn">{stats.behind}</span>
            </button>
          )}
          {stats.synced > 0 && (
            <button
              className={`filter-tab ok ${statusFilter === 'synced' ? 'active' : ''}`}
              onClick={() => onStatusFilterChange('synced')}
            >
              <CheckIcon size={12} style={{ marginRight: 2 }} /> Up to Date <span className="tab-count ok">{stats.synced}</span>
            </button>
          )}
          {stats.errors > 0 && (
            <button
              className={`filter-tab err ${statusFilter === 'errors' ? 'active' : ''}`}
              onClick={() => onStatusFilterChange('errors')}
            >
              Errors <span className="tab-count err">{stats.errors}</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
import React from 'react';

export default function DashboardLoader({ count = 6 }) {
  const cardCount = Math.min(Math.max(count, 4), 12);

  return (
    <div className="dashboard-loader">
      <div className="dashboard-loader-banner">
        <div className="dashboard-loader-spinner"></div>
        <div>
          <strong>Loading repositories…</strong>
          <span style={{ marginLeft: 8, opacity: 0.8 }}>
            Fetching branches, tags, and version status from GitLab
          </span>
        </div>
      </div>

      <div className="skeleton-grid">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div key={idx} className="skeleton-card">
            <div className="skeleton-head">
              <div className="skeleton-bar skeleton-title"></div>
              <div className="skeleton-bar skeleton-pill"></div>
            </div>
            <div className="skeleton-bar skeleton-path"></div>
            <div className="skeleton-body">
              <div className="skeleton-row">
                <div className="skeleton-bar skeleton-label"></div>
                <div className="skeleton-bar skeleton-val"></div>
              </div>
              <div className="skeleton-row">
                <div className="skeleton-bar skeleton-label"></div>
                <div className="skeleton-bar skeleton-val"></div>
              </div>
              <div className="skeleton-row">
                <div className="skeleton-bar skeleton-label"></div>
                <div className="skeleton-bar skeleton-val"></div>
              </div>
              <div className="skeleton-row">
                <div className="skeleton-bar skeleton-label"></div>
                <div className="skeleton-bar skeleton-val"></div>
              </div>
            </div>
            <div className="skeleton-bar skeleton-bottom-box"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

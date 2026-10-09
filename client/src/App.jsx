import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { loadConfig, saveConfig } from './utils/storage';
import { fmtDate, cardStatusClass } from './utils/helpers';
import TopBar from './components/TopBar';
import Board from './components/Board';
import TableView from './components/TableView';
import EmptyState from './components/EmptyState';
import DashboardLoader from './components/DashboardLoader';
import SettingsDrawer from './components/SettingsDrawer';
import DetailView from './components/DetailView';
import GitCheatsheetModal from './components/GitCheatsheetModal';

const DEFAULT_STATE = {
  gitlabUrl: '',
  token: '',
  rememberToken: false,
  packageJsonPath: 'package.json',
  defaultSubtreePath: 'projects/base-client',
  defaultSubtreeBasePath: 'fonebank/banksmart-client-web',
  projects: [],
};

export default function App() {
  const [config, setConfig] = useState(() => loadConfig() || DEFAULT_STATE);
  const [results, setResults] = useState(() => {
    try {
      const cached = sessionStorage.getItem('vb_last_results');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    const cfg = loadConfig() || DEFAULT_STATE;
    const hasConfig = Boolean(cfg.gitlabUrl && cfg.token && cfg.projects && cfg.projects.length > 0);
    try {
      const cached = sessionStorage.getItem('vb_last_results');
      if (cached && JSON.parse(cached)?.length > 0) return false;
    } catch {}
    return hasConfig;
  });
  const [connStatus, setConnStatus] = useState('');
  const [connStatusClass, setConnStatusClass] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gitDocsOpen, setGitDocsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('vb_view_mode') || 'grid');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0); // in minutes

  // Compute stats across all results
  const stats = {
    total: results.length,
    behind: results.filter((r) => r.subtree && r.subtree.upToDate === false).length,
    synced: results.filter((r) => r.subtree && r.subtree.upToDate === true).length,
    errors: results.filter((r) => !r.ok || (r.subtree && r.subtree.error)).length,
  };

  // Filter results based on search query and status filter
  const filteredResults = results.filter((r) => {
    // 1. Text Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (r.label || '').toLowerCase().includes(q) ||
        (r.key || '').toLowerCase().includes(q) ||
        (r.packageVersion || '').toLowerCase().includes(q) ||
        (r.stimulusVersion || '').toLowerCase().includes(q) ||
        (r.latestTag || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 2. Status Filter Pill
    if (statusFilter === 'behind') {
      return r.subtree && r.subtree.upToDate === false;
    }
    if (statusFilter === 'synced') {
      return r.subtree && r.subtree.upToDate === true;
    }
    if (statusFilter === 'errors') {
      return !r.ok || (r.subtree && r.subtree.error);
    }
    return true;
  });

  // Auto-open settings on first run
  useEffect(() => {
    if (config.projects.length === 0) {
      setSettingsOpen(true);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!config.gitlabUrl || !config.token || config.projects.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setConnStatus('loading…');
    setConnStatusClass('');

    try {
      const res = await fetch('/api/check-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gitlabUrl: config.gitlabUrl,
          token: config.token,
          projects: config.projects,
          packageJsonPath: config.packageJsonPath,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Cache results in sessionStorage for detail view
      sessionStorage.setItem('vb_last_results', JSON.stringify(data.results));
      setResults(data.results);
      setConnStatus(`${data.results.length} project(s) · updated ${new Date().toLocaleTimeString()}`);
      setConnStatusClass('ok');
    } catch (e) {
      setConnStatus('error: ' + e.message);
      setConnStatusClass('err');
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Refresh when config changes (after saving settings)
  useEffect(() => {
    if (config.gitlabUrl && config.token && config.projects.length > 0) {
      refreshAll();
    }
  }, [config.gitlabUrl, config.token, config.projects.length, config.packageJsonPath]);

  // Handle auto-refresh interval
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;
    const intervalMs = autoRefreshInterval * 60 * 1000;
    const timer = setInterval(() => {
      refreshAll();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, refreshAll]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('vb_view_mode', mode);
  };

  const handleSaveSettings = (updatedConfig) => {
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
    setSettingsOpen(false);
  };

  const handleOpenSettings = () => setSettingsOpen(true);
  const handleCloseSettings = () => setSettingsOpen(false);

  const hasConfig = Boolean(config.gitlabUrl && config.token && config.projects && config.projects.length > 0);
  const isFilterActive = Boolean(searchQuery || statusFilter !== 'all');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div className="app">
            <TopBar
              connStatus={connStatus}
              connStatusClass={connStatusClass}
              onSettings={handleOpenSettings}
              onRefresh={refreshAll}
              onOpenGitDocs={() => setGitDocsOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              stats={stats}
            />
            <main>
              {loading && results.length === 0 ? (
                <DashboardLoader count={config.projects?.length || 6} />
              ) : !hasConfig || results.length === 0 ? (
                <EmptyState onAddFirst={handleOpenSettings} isSearch={false} />
              ) : filteredResults.length === 0 ? (
                <EmptyState onAddFirst={handleOpenSettings} isSearch={isFilterActive} />
              ) : viewMode === 'grid' ? (
                <Board results={filteredResults} gitlabUrl={config.gitlabUrl} />
              ) : (
                <TableView results={filteredResults} gitlabUrl={config.gitlabUrl} />
              )}
            </main>
            {settingsOpen && (
              <SettingsDrawer
                config={config}
                onClose={handleCloseSettings}
                onSave={handleSaveSettings}
              />
            )}
            {gitDocsOpen && (
              <GitCheatsheetModal
                isOpen={gitDocsOpen}
                onClose={() => setGitDocsOpen(false)}
              />
            )}
          </div>
        } />
        <Route path="/detail/:key" element={
          <DetailView config={config} results={results} />
        } />
        <Route path="/git-docs" element={
          <GitCheatsheetModal isOpen={true} onClose={() => window.history.back()} />
        } />
      </Routes>
    </BrowserRouter>
  );
}
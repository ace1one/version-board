import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { loadConfig, saveConfig } from './utils/storage';
import { fmtDate, cardStatusClass } from './utils/helpers';
import TopBar from './components/TopBar';
import Board from './components/Board';
import EmptyState from './components/EmptyState';
import SettingsDrawer from './components/SettingsDrawer';
import DetailView from './components/DetailView';

const DEFAULT_STATE = {
  gitlabUrl: '',
  token: '',
  rememberToken: false,
  packageJsonPath: 'package.json',
  projects: [],
};

export default function App() {
  const [config, setConfig] = useState(() => loadConfig() || DEFAULT_STATE);
  const [results, setResults] = useState([]);
  const [connStatus, setConnStatus] = useState('');
  const [connStatusClass, setConnStatusClass] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter results based on search query
  const filteredResults = results.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.label || '').toLowerCase().includes(q) ||
      (r.key || '').toLowerCase().includes(q) ||
      (r.packageVersion || '').toLowerCase().includes(q) ||
      (r.latestTag || '').toLowerCase().includes(q)
    );
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
      return;
    }

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
    }
  }, [config]);

  // Refresh when config changes (after saving settings)
  useEffect(() => {
    if (config.gitlabUrl && config.token && config.projects.length > 0) {
      refreshAll();
    }
  }, [config.gitlabUrl, config.token, config.projects.length, config.packageJsonPath]);

  const handleSaveSettings = (updatedConfig) => {
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
    setSettingsOpen(false);
  };

  const handleOpenSettings = () => setSettingsOpen(true);
  const handleCloseSettings = () => setSettingsOpen(false);

  const showEmpty = !config.gitlabUrl || config.projects.length === 0 || filteredResults.length === 0;

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
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              resultCount={filteredResults.length}
            />
            <main>
              {showEmpty && (
                <EmptyState onAddFirst={handleOpenSettings} isSearch={!searchQuery ? false : true} />
              )}
              {!showEmpty && <Board results={filteredResults} />}
            </main>
            {settingsOpen && (
              <SettingsDrawer
                config={config}
                onClose={handleCloseSettings}
                onSave={handleSaveSettings}
              />
            )}
          </div>
        } />
        <Route path="/detail/:key" element={
          <DetailView config={config} results={results} />
        } />
      </Routes>
    </BrowserRouter>
  );
}
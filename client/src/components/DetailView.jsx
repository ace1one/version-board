import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fmtDate, timeAgo } from '../utils/helpers';
import BranchDropdown from './BranchDropdown';
import MrReviewModal from './MrReviewModal';
import MrCreateModal from './MrCreateModal';
import TagCreateModal from './TagCreateModal';
import CommitDetailModal from './CommitDetailModal';
import GitCheatsheetModal from './GitCheatsheetModal';
import {
  GitBranchIcon,
  TagIcon,
  CommitIcon,
  PullRequestIcon,
  IssueIcon,
  DetailsIcon,
  RefreshIcon,
  RocketIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
  CheckIcon,
  PlusIcon,
  GitMergeIcon,
  TrashIcon,
} from './Icons';

export default function DetailView({ config, results }) {
  const { key } = useParams();
  const [activeTab, setActiveTab] = useState('details');

  // MRs & Issues & Commits state
  const [mergeRequests, setMergeRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [mrLoading, setMrLoading] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [mrError, setMrError] = useState('');
  const [issuesError, setIssuesError] = useState('');
  const [mrStateFilter, setMrStateFilter] = useState('opened');
  const [mrSearch, setMrSearch] = useState('');
  const [selectedReviewMrId, setSelectedReviewMrId] = useState(null);
  const [selectedCommitSha, setSelectedCommitSha] = useState(null);
  const [showCreateMrModal, setShowCreateMrModal] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [showGitGuideModal, setShowGitGuideModal] = useState(false);
  const [deletingTagName, setDeletingTagName] = useState(null);

  // Branches & Commits & Tags state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchStatusLoading, setBranchStatusLoading] = useState(false);

  const [commits, setCommits] = useState([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsLoadingMore, setCommitsLoadingMore] = useState(false);
  const [commitsHasMore, setCommitsHasMore] = useState(false);
  const [commitsPage, setCommitsPage] = useState(1);
  const [commitsError, setCommitsError] = useState('');
  const commitSentinelRef = useRef(null);

  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState('');

  const [copiedPull, setCopiedPull] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);

  // Dynamic branch override state
  const [dynamicData, setDynamicData] = useState(null);
  const [branchesError, setBranchesError] = useState('');

  // Search filter states for Commits and Tags tabs
  const [commitSearch, setCommitSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  // Fallback to session storage for token and results
  const effectiveToken = config.token || sessionStorage.getItem('vb_session_token') || '';
  const effectiveGitlabUrl = config.gitlabUrl || sessionStorage.getItem('vb_session_gitlab_url') || '';

  useEffect(() => {
    if (config.token) sessionStorage.setItem('vb_session_token', config.token);
    if (config.gitlabUrl) sessionStorage.setItem('vb_session_gitlab_url', config.gitlabUrl);
  }, [config.token, config.gitlabUrl]);

  // Try from state first, fall back to sessionStorage
  let allResults = results;
  if (!allResults || allResults.length === 0) {
    try {
      allResults = JSON.parse(sessionStorage.getItem('vb_last_results') || '[]');
    } catch (e) {
      allResults = [];
    }
  }

  const initialMatch = allResults.find((r) => r.key === key);
  const match = dynamicData ? { ...initialMatch, ...dynamicData } : initialMatch;

  // Initialize selected branch
  useEffect(() => {
    if (initialMatch?.defaultBranch && !selectedBranch) {
      setSelectedBranch(initialMatch.defaultBranch);
    }
  }, [initialMatch?.defaultBranch, selectedBranch]);

  // Helper for safe JSON fetching with clear server restart message if HTML returned
  const safeJsonFetch = async (url, payload) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('Please restart "npm run dev" in terminal to load backend API updates.');
      }
      throw new Error(`Server ${res.status}: ${text.slice(0, 100)}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  // Fetch Branches list on mount
  const fetchBranches = useCallback(() => {
    if (initialMatch && initialMatch.ok && effectiveGitlabUrl && effectiveToken) {
      setBranchesLoading(true);
      setBranchesError('');
      safeJsonFetch('/api/project-branches', {
        gitlabUrl: effectiveGitlabUrl,
        token: effectiveToken,
        projectPath: initialMatch.key,
        projectId: initialMatch.gitlabProjectId,
      })
        .then((data) => {
          if (data.branches) setBranches(data.branches);
        })
        .catch((e) => {
          console.warn('Failed to fetch branches:', e.message);
          setBranchesError(e.message);
        })
        .finally(() => setBranchesLoading(false));
    }
  }, [initialMatch?.key, initialMatch?.gitlabProjectId, effectiveGitlabUrl, effectiveToken]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Fetch Tags list on mount
  const fetchTags = useCallback(() => {
    if (initialMatch && initialMatch.ok && effectiveGitlabUrl && effectiveToken) {
      setTagsLoading(true);
      setTagsError('');
      safeJsonFetch('/api/project-tags', {
        gitlabUrl: effectiveGitlabUrl,
        token: effectiveToken,
        projectPath: initialMatch.key,
        projectId: initialMatch.gitlabProjectId,
      })
        .then((data) => {
          setTags(data.tags || []);
        })
        .catch((e) => setTagsError(e.message))
        .finally(() => setTagsLoading(false));
    }
  }, [initialMatch?.key, initialMatch?.gitlabProjectId, effectiveGitlabUrl, effectiveToken]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleDeleteTag = async (tagName) => {
    if (!window.confirm(`Are you sure you want to delete tag "${tagName}"? This will permanently delete the tag from GitLab.`)) {
      return;
    }
    setDeletingTagName(tagName);
    try {
      await safeJsonFetch('/api/tag-delete', {
        gitlabUrl: effectiveGitlabUrl,
        token: effectiveToken,
        projectPath: initialMatch?.key,
        projectId: initialMatch?.gitlabProjectId,
        tagName,
      });
      fetchTags();
    } catch (err) {
      alert('Failed to delete tag: ' + err.message);
    } finally {
      setDeletingTagName(null);
    }
  };

  // Fetch MRs on mount and when state filter changes
  const fetchMergeRequests = useCallback((stateOverride) => {
    if (initialMatch && initialMatch.ok && effectiveGitlabUrl && effectiveToken) {
      setMrLoading(true);
      setMrError('');
      const st = stateOverride !== undefined ? stateOverride : mrStateFilter;
      safeJsonFetch('/api/project-merge-requests', {
        gitlabUrl: effectiveGitlabUrl,
        token: effectiveToken,
        projectPath: initialMatch.key,
        projectId: initialMatch.gitlabProjectId,
        state: st,
      })
        .then((data) => {
          setMergeRequests(data.mergeRequests || []);
        })
        .catch((e) => setMrError(e.message))
        .finally(() => setMrLoading(false));
    }
  }, [initialMatch?.key, initialMatch?.gitlabProjectId, effectiveGitlabUrl, effectiveToken, mrStateFilter]);

  useEffect(() => {
    fetchMergeRequests();
  }, [fetchMergeRequests]);

  // Fetch Issues immediately on mount
  useEffect(() => {
    if (initialMatch && initialMatch.ok && effectiveGitlabUrl && effectiveToken) {
      setIssuesLoading(true);
      setIssuesError('');
      safeJsonFetch('/api/project-issues', {
        gitlabUrl: effectiveGitlabUrl,
        token: effectiveToken,
        projectPath: initialMatch.key,
        projectId: initialMatch.gitlabProjectId,
        state: 'opened',
      })
        .then((data) => {
          setIssues(data.issues || []);
        })
        .catch((e) => setIssuesError(e.message))
        .finally(() => setIssuesLoading(false));
    }
  }, [initialMatch?.key, initialMatch?.gitlabProjectId, effectiveGitlabUrl, effectiveToken]);

  // Fetch Commits with pagination support
  const fetchCommitsForBranch = useCallback((branchName, page = 1, append = false) => {
    if (!initialMatch || !initialMatch.ok || !effectiveGitlabUrl || !effectiveToken || !branchName) return;
    if (page === 1) {
      setCommitsLoading(true);
      setCommitsError('');
    } else {
      setCommitsLoadingMore(true);
    }

    safeJsonFetch('/api/project-commits', {
      gitlabUrl: effectiveGitlabUrl,
      token: effectiveToken,
      projectPath: initialMatch.key,
      projectId: initialMatch.gitlabProjectId,
      ref: branchName,
      page,
      perPage: 30,
    })
      .then((data) => {
        const newCommits = data.commits || [];
        setCommits((prev) => (append ? [...prev, ...newCommits] : newCommits));
        setCommitsPage(page);
        setCommitsHasMore(data.hasMore ?? (newCommits.length >= 30));
      })
      .catch((e) => {
        if (page === 1) setCommitsError(e.message);
      })
      .finally(() => {
        setCommitsLoading(false);
        setCommitsLoadingMore(false);
      });
  }, [initialMatch?.key, initialMatch?.gitlabProjectId, initialMatch?.ok, effectiveGitlabUrl, effectiveToken]);

  const loadMoreCommits = useCallback(() => {
    if (commitsLoading || commitsLoadingMore || !commitsHasMore) return;
    const targetRef = selectedBranch || initialMatch?.defaultBranch;
    fetchCommitsForBranch(targetRef, commitsPage + 1, true);
  }, [commitsLoading, commitsLoadingMore, commitsHasMore, selectedBranch, initialMatch?.defaultBranch, commitsPage, fetchCommitsForBranch]);

  // Infinite scroll observer for commits
  useEffect(() => {
    if (activeTab !== 'commits' || !commitsHasMore || commitsLoading || commitsLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCommits();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (commitSentinelRef.current) {
      observer.observe(commitSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [activeTab, commitsHasMore, commitsLoading, commitsLoadingMore, loadMoreCommits]);

  // Fetch dynamic branch status when branch is changed by user
  const handleBranchChange = async (newBranch) => {
    setSelectedBranch(newBranch);
    setCommitsPage(1);
    fetchCommitsForBranch(newBranch, 1, false);

    if (newBranch === initialMatch?.defaultBranch && !dynamicData) {
      return;
    }

    setBranchStatusLoading(true);
    try {
      const pConfig = (config.projects || []).find((p) => p.path === initialMatch?.key) || {};
      const data = await safeJsonFetch('/api/branch-status', {
        gitlabUrl: effectiveGitlabUrl,
        token: effectiveToken,
        projectPath: initialMatch?.key,
        projectId: initialMatch?.gitlabProjectId,
        ref: newBranch,
        type: pConfig.type || initialMatch?.type,
        isMonorepo: pConfig.type === 'monorepo' || initialMatch?.type === 'monorepo' || !!initialMatch?.monorepo,
        subtreePath: pConfig.subtreePath || initialMatch?.subtree?.subtreePath,
        basePath: pConfig.basePath || initialMatch?.subtree?.baseProjectPath,
        packageJsonPath: config.packageJsonPath,
      });
      setDynamicData(data);
    } catch (e) {
      console.warn('Failed to fetch branch status', e);
    } finally {
      setBranchStatusLoading(false);
    }
  };

  // Initial commits fetch for default branch
  useEffect(() => {
    if (selectedBranch) {
      fetchCommitsForBranch(selectedBranch);
    }
  }, [selectedBranch, fetchCommitsForBranch]);

  if (!match) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">◈</span>
            <div>
              <h1>Project not found</h1>
              <p className="subtitle">—</p>
            </div>
          </div>
          <div className="topbar-actions">
            <Link to="/" className="btn btn-ghost">← Back to board</Link>
          </div>
        </header>
        <main>
          <div className="detail-content">
            <div className="card status-error">
              <p className="error-text">Project not found. Go back to board and refresh.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const tabs = [
    { id: 'details', label: 'Details', icon: <DetailsIcon size={14} />, count: null },
    { id: 'commits', label: 'Recent Commits', icon: <CommitIcon size={14} />, count: commits.length > 0 ? `${commits.length}${commitsHasMore ? '+' : ''}` : null },
    { id: 'tags', label: 'Tags & Releases', icon: <TagIcon size={14} />, count: tags.length },
    { id: 'mr', label: 'Merge Requests', icon: <PullRequestIcon size={14} />, count: mergeRequests.length },
    { id: 'issues', label: 'Issues', icon: <IssueIcon size={14} />, count: issues.length },
  ];

  const cleanWebUrl = match.webUrl || (config.gitlabUrl ? `${config.gitlabUrl.replace(/\/+$/, '')}/${match.key}` : '#');

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <div>
            <h1>{match.label}</h1>
            <p className="subtitle">{match.key}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowGitGuideModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#ff7b72', borderColor: 'rgba(255, 123, 114, 0.35)' }}
            title="Open Interactive Git Commands Guide"
          >
            <span style={{ display: 'inline-flex', color: '#ff7b72' }}>&gt;_</span> Git Guide
          </button>
          {/* Quick GitLab Shortcut Links */}
          <a href={`${cleanWebUrl}/-/pipelines`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" title="GitLab Pipelines">
            <RocketIcon size={13} style={{ marginRight: 5 }} /> Pipelines
          </a>
          <a href={`${cleanWebUrl}/-/tags`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" title="GitLab Tags">
            <TagIcon size={13} style={{ marginRight: 5 }} /> Tags
          </a>
          <a href={`${cleanWebUrl}/-/branches`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" title="GitLab Branches">
            <GitBranchIcon size={13} style={{ marginRight: 5 }} /> Branches
          </a>
          <Link to="/" className="btn btn-primary">← Back to board</Link>
        </div>
      </header>

      {/* Dynamic Branch & Tag Switcher Bar */}
      <div className="branch-switcher-bar">
        <div className="branch-selector-wrap">
          <span className="branch-icon">
            <GitBranchIcon size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            Ref / Branch:
          </span>
          <BranchDropdown
            branches={branches}
            tags={tags}
            selectedRef={selectedBranch || initialMatch?.defaultBranch}
            defaultBranch={initialMatch?.defaultBranch || 'master'}
            onSelect={handleBranchChange}
            loading={branchStatusLoading}
          />
          <button
            type="button"
            className="btn btn-ghost btn-icon-round"
            style={{ padding: '6px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Reload branches, tags & commits"
            onClick={() => {
              fetchBranches();
              fetchTags();
              handleBranchChange(selectedBranch || initialMatch?.defaultBranch);
            }}
          >
            <RefreshIcon size={13} />
          </button>
          {branchesLoading && <span className="dim" style={{ fontSize: '12px' }}>Loading branches…</span>}
          {branchesError && (
            <span
              style={{ color: 'var(--warn)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={fetchBranches}
              title="Click to retry loading branches"
            >
              ⚠️ {branchesError} (retry)
            </span>
          )}
          {branchStatusLoading && <span className="dim" style={{ fontSize: '12px' }}>Switching branch...</span>}
        </div>
        <div className="branch-meta-tag">
          Active Ref: <code>{selectedBranch || initialMatch?.defaultBranch}</code>
        </div>
      </div>

      <main>
        <div className="detail-content">
          <div className="detail-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`detail-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count != null && tab.count >= 0 && (
                  <span className="tab-badge">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <>
              <div className="card status-ok detail-card">
                <div className="subtree-title">Project Information</div>
                <DataRow label="Tracked branch" value={selectedBranch || match.defaultBranch || '—'} />
                <DataRow label="Latest commit" value={match.commitFullSha || match.commitSha || '—'} />
                <DataRow label="Commit date" value={fmtDate(match.commitDate)} dim />
                <DataRow label="Author" value={match.commitAuthor || '—'} dim />
                <DataRow label="Commit title" value={match.commitTitle || '—'} dim />
                <DataRow label="Latest tag" value={match.latestTag || '—'} />
                <DataRow label="package.json ver." value={match.packageVersion || '—'} />
                <div className="card-footer">
                  <a className="card-link" href={cleanWebUrl} target="_blank" rel="noopener">open in gitlab →</a>
                </div>
              </div>

              {match.monorepo && (
                <MonorepoDetail
                  monorepo={match.monorepo}
                  webUrl={cleanWebUrl}
                  defaultBranch={selectedBranch || match.defaultBranch}
                  onSelectCommit={(sha) => setSelectedCommitSha(sha)}
                />
              )}

              {match.subtree && (
                <SubtreeDetail
                  subtree={match.subtree}
                  onSelectCommit={(sha) => setSelectedCommitSha(sha)}
                />
              )}
            </>
          )}

          {/* TAB 2: RECENT COMMITS */}
          {activeTab === 'commits' && (
            <div className="card detail-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div className="subtree-title" style={{ margin: 0 }}>
                  Commits on <code>{selectedBranch || initialMatch?.defaultBranch}</code>
                  {commits.length > 0 && <span className="dim" style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: 8 }}>({commits.length} loaded)</span>}
                </div>
                <input
                  type="text"
                  placeholder="Filter commits by title, author, sha..."
                  value={commitSearch}
                  onChange={(e) => setCommitSearch(e.target.value)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--hairline)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12.5px',
                    color: 'var(--text)',
                    minWidth: '220px',
                    outline: 'none',
                  }}
                />
              </div>

              {commitsLoading && commits.length === 0 && <div className="tab-loading">Loading commit history...</div>}
              {commitsError && <p className="error-text">{commitsError}</p>}
              {!commitsLoading && !commitsError && commits.length === 0 && (
                <div className="tab-empty">No commits found on this branch</div>
              )}
              {commits.length > 0 && (() => {
                // Map commit SHA to tag name
                const tagsBySha = {};
                tags.forEach((t) => {
                  if (t.commit?.id) tagsBySha[t.commit.id] = t.name;
                  if (t.commit?.shortId) tagsBySha[t.commit.shortId] = t.name;
                  if (t.target) tagsBySha[t.target] = t.name;
                });

                // If current ref is a tag, associate with first commit if not yet matched
                const isSelectedTag = tags.some((t) => t.name === (selectedBranch || initialMatch?.defaultBranch));
                if (isSelectedTag && commits.length > 0) {
                  const firstId = commits[0].id;
                  const firstShort = commits[0].shortId;
                  if (firstId && !tagsBySha[firstId]) tagsBySha[firstId] = selectedBranch || initialMatch?.defaultBranch;
                  if (firstShort && !tagsBySha[firstShort]) tagsBySha[firstShort] = selectedBranch || initialMatch?.defaultBranch;
                }

                const q = commitSearch.toLowerCase().trim();
                const filtered = commits.filter(
                  (c) =>
                    !q ||
                    (c.title && c.title.toLowerCase().includes(q)) ||
                    (c.author && c.author.toLowerCase().includes(q)) ||
                    (c.shortId && c.shortId.toLowerCase().includes(q)) ||
                    (c.id && c.id.toLowerCase().includes(q)) ||
                    (tagsBySha[c.id] && tagsBySha[c.id].toLowerCase().includes(q)) ||
                    (tagsBySha[c.shortId] && tagsBySha[c.shortId].toLowerCase().includes(q))
                );

                if (filtered.length === 0 && commits.length > 0) {
                  return <div className="tab-empty">No commits matching &ldquo;{commitSearch}&rdquo;</div>;
                }

                return (
                  <>
                    {filtered.map((c) => {
                      const matchedTag = tagsBySha[c.id] || tagsBySha[c.shortId] || null;
                      const commitGitlabUrl = c.webUrl || (cleanWebUrl ? `${cleanWebUrl}/-/commit/${c.id || c.shortId}` : '');
                      return (
                        <div
                          key={c.id || c.shortId}
                          className="list-item clickable-commit-row"
                          onClick={() => setSelectedCommitSha(c.id || c.shortId)}
                          style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                        >
                          <div className="list-item-head">
                            <span className="list-item-title">{c.title}</span>
                            <div className="commit-head-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {matchedTag && (
                                <span className="commit-tag-pill" title={`Tag: ${matchedTag}`}>
                                  <TagIcon size={11} className="commit-tag-icon" />
                                  <span>{matchedTag}</span>
                                </span>
                              )}
                              <span className="code-pill">{c.shortId}</span>
                              {commitGitlabUrl && (
                                <a
                                  href={commitGitlabUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost"
                                  style={{
                                    padding: '2px 7px',
                                    fontSize: '11px',
                                    height: '22px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    color: 'var(--text-muted)',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Open commit directly in GitLab"
                                >
                                  GitLab <ExternalLinkIcon size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="list-item-meta">
                            <span>by <strong>{c.author}</strong></span>
                            <span>{fmtDate(c.date)}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Infinite scroll sentinel */}
                    <div ref={commitSentinelRef} style={{ height: '20px', margin: '4px 0' }} />

                    {commitsLoadingMore && (
                      <div className="tab-loading" style={{ padding: '12px 0', fontSize: '12.5px' }}>
                        Loading more commits...
                      </div>
                    )}

                    {!commitSearch && commitsHasMore && !commitsLoadingMore && (
                      <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={loadMoreCommits}
                          style={{ fontSize: '12px' }}
                        >
                          Load more commits
                        </button>
                      </div>
                    )}

                    {!commitSearch && !commitsHasMore && commits.length > 0 && (
                      <div className="dim" style={{ textAlign: 'center', padding: '14px 0', fontSize: '12px' }}>
                        ✓ All {commits.length} commits loaded
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 3: TAGS & RELEASES */}
          {activeTab === 'tags' && (
            <div className="card detail-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div className="subtree-title" style={{ margin: 0 }}>Tags &amp; Release History</div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '3px 10px', fontSize: '11.5px', height: '26px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setShowCreateTagModal(true)}
                  >
                    <PlusIcon size={12} /> New Tag
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Filter tags by name, message, commit..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--hairline)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12.5px',
                    color: 'var(--text)',
                    minWidth: '220px',
                    outline: 'none',
                  }}
                />
              </div>

              {tagsLoading && <div className="tab-loading">Loading tags...</div>}
              {tagsError && <p className="error-text">{tagsError}</p>}
              {!tagsLoading && !tagsError && tags.length === 0 && (
                <div className="tab-empty">No tags found in this project</div>
              )}
              {!tagsLoading && (() => {
                const q = tagSearch.toLowerCase().trim();
                const filtered = tags.filter(
                  (t) =>
                    !q ||
                    (t.name && t.name.toLowerCase().includes(q)) ||
                    (t.message && t.message.toLowerCase().includes(q)) ||
                    (t.release?.description && t.release.description.toLowerCase().includes(q)) ||
                    (t.commit?.shortId && t.commit.shortId.toLowerCase().includes(q))
                );

                if (filtered.length === 0 && tags.length > 0) {
                  return <div className="tab-empty">No tags matching &ldquo;{tagSearch}&rdquo;</div>;
                }

                return filtered.map((t) => (
                  <div key={t.name} className="list-item tag-history-item">
                    <div className="list-item-head">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="tag-pill" style={{ fontSize: '12.5px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <TagIcon size={13} /> {t.name}
                        </span>
                        {t.commit && (
                          <button
                            type="button"
                            className="code-pill"
                            style={{ cursor: 'pointer', border: '1px solid var(--hairline)' }}
                            title={`View commit ${t.commit.id || t.commit.shortId} in-app diffs`}
                            onClick={() => setSelectedCommitSha(t.commit.id || t.commit.shortId)}
                          >
                            Target: {t.commit.shortId}
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '11px', height: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title={`Switch ref to view commits, files and package versions at tag ${t.name}`}
                          onClick={() => handleBranchChange(t.name)}
                        >
                          <GitBranchIcon size={12} /> Switch Ref
                        </button>
                        <a
                          href={`${cleanWebUrl}/-/tags/${encodeURIComponent(t.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="card-link"
                          style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          GitLab Tag <ExternalLinkIcon size={11} />
                        </a>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '11px', height: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}
                          title={`Delete tag ${t.name} from GitLab`}
                          disabled={deletingTagName === t.name}
                          onClick={() => handleDeleteTag(t.name)}
                        >
                          <TrashIcon size={12} /> {deletingTagName === t.name ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    {t.commit?.title && (
                      <div style={{ fontSize: '12px', color: 'var(--text)', margin: '4px 0' }}>
                        Commit: <strong>{t.commit.title}</strong>
                      </div>
                    )}
                    {t.message && <div style={{ fontSize: '12px', color: 'var(--text-faint)', margin: '2px 0' }}>{t.message}</div>}
                    <div className="list-item-meta">
                      {t.commit && <span>by <strong>{t.commit.author}</strong></span>}
                      {t.commit && <span>{fmtDate(t.commit.date)}</span>}
                      {t.release && <span style={{ color: 'var(--accent)' }}>Release: {t.release.description}</span>}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* TAB 4: MERGE REQUESTS */}
          {activeTab === 'mr' && (
            <div className="card detail-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div className="subtree-title" style={{ margin: 0 }}>
                    Merge Requests
                  </div>
                  {/* MR State Filters */}
                  <div className="mr-filter-pills">
                    {['opened', 'merged', 'closed', 'all'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`mr-filter-pill ${mrStateFilter === st ? 'active' : ''}`}
                        onClick={() => setMrStateFilter(st)}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Filter MRs by title, branch, author..."
                    value={mrSearch}
                    onChange={(e) => setMrSearch(e.target.value)}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--hairline)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      color: 'var(--text)',
                      minWidth: '200px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => setShowCreateMrModal(true)}
                  >
                    <PlusIcon size={13} /> New MR
                  </button>
                </div>
              </div>

              {mrLoading && <div className="tab-loading">Loading merge requests...</div>}
              {mrError && <p className="error-text">{mrError}</p>}
              {!mrLoading && !mrError && mergeRequests.length === 0 && (
                <div className="tab-empty">No {mrStateFilter !== 'all' ? mrStateFilter : ''} merge requests found 🎉</div>
              )}

              {!mrLoading && (() => {
                const q = mrSearch.toLowerCase().trim();
                const filtered = mergeRequests.filter((mr) => {
                  if (!q) return true;
                  return (
                    (mr.title && mr.title.toLowerCase().includes(q)) ||
                    (mr.author && mr.author.toLowerCase().includes(q)) ||
                    (mr.sourceBranch && mr.sourceBranch.toLowerCase().includes(q)) ||
                    (mr.targetBranch && mr.targetBranch.toLowerCase().includes(q)) ||
                    String(mr.id).includes(q)
                  );
                });

                if (filtered.length === 0 && mergeRequests.length > 0) {
                  return <div className="tab-empty">No merge requests matching &ldquo;{mrSearch}&rdquo;</div>;
                }

                return filtered.map((mr) => {
                  const hasConflicts = mr.hasConflicts === true || mr.detailedMergeStatus === 'cannot_be_merged';
                  const isReady = mr.state === 'opened' && !hasConflicts && (mr.detailedMergeStatus === 'mergeable' || mr.hasConflicts === false);

                  return (
                    <div
                      key={mr.id}
                      className="list-item mr-interactive-item"
                      onClick={() => setSelectedReviewMrId(mr.id)}
                      title="Click to review diffs and merge this Merge Request"
                    >
                      <div className="list-item-head">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="code-pill">!{mr.id}</span>
                          <span className="list-item-title">{mr.title}</span>
                          <span className={`state-badge ${mr.state === 'merged' ? 'merged' : mr.state === 'closed' ? 'closed' : 'opened'}`}>
                            {mr.state}
                          </span>
                          {hasConflicts && (
                            <span className="conflict-badge" title="Merge conflicts detected with target branch">
                              <AlertTriangleIcon size={11} /> Conflicts
                            </span>
                          )}
                          {isReady && (
                            <span className="ready-badge" title="Ready to be merged cleanly">
                              <CheckIcon size={11} /> Ready
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '11.5px', height: '26px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setSelectedReviewMrId(mr.id)}
                          >
                            <GitMergeIcon size={12} /> Review & Merge
                          </button>
                          <a
                            href={mr.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-link"
                            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            GitLab <ExternalLinkIcon size={11} />
                          </a>
                        </div>
                      </div>

                      <div className="list-item-meta">
                        <span className="branch-path-pill">
                          <GitBranchIcon size={11} /> {mr.sourceBranch} → {mr.targetBranch}
                        </span>
                        <span>by <strong>{mr.author}</strong></span>
                        <span>{fmtDate(mr.updatedAt)}</span>
                      </div>

                      {mr.labels.length > 0 && (
                        <div className="label-list">
                          {mr.labels.map((l, i) => (
                            <span key={i} className="label-pill">{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* TAB 5: ISSUES */}
          {activeTab === 'issues' && (
            <div className="card detail-card">
              <div className="subtree-title">Open Issues</div>
              {issuesLoading && <div className="tab-loading">Loading issues...</div>}
              {issuesError && <p className="error-text">{issuesError}</p>}
              {!issuesLoading && !issuesError && issues.length === 0 && (
                <div className="tab-empty">No open issues 🎉</div>
              )}
              {!issuesLoading && issues.map((issue) => (
                <a key={issue.id} href={issue.webUrl} target="_blank" rel="noopener noreferrer" className="list-item">
                  <div className="list-item-head">
                    <span className="list-item-title">{issue.title}</span>
                    <span className={`state-badge ${issue.state === 'closed' ? 'closed' : 'opened'}`}>
                      {issue.state}
                    </span>
                  </div>
                  <div className="list-item-meta">
                    <span>#{issue.id}</span>
                    {issue.assignees.length > 0 && <span>→ {issue.assignees.join(', ')}</span>}
                    <span>by {issue.author}</span>
                    <span>{fmtDate(issue.updatedAt)}</span>
                  </div>
                  {issue.labels.length > 0 && (
                    <div className="label-list">
                      {issue.labels.map((l, i) => (
                        <span key={i} className="label-pill">{l}</span>
                      ))}
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* In-App MR Review & Diff & Merge Modal */}
      {selectedReviewMrId && (
        <MrReviewModal
          isOpen={!!selectedReviewMrId}
          onClose={() => setSelectedReviewMrId(null)}
          mrId={selectedReviewMrId}
          project={match}
          config={config}
          onMerged={() => {
            fetchMergeRequests();
          }}
        />
      )}

      {/* New Merge Request Creation Modal */}
      {showCreateMrModal && (
        <MrCreateModal
          isOpen={showCreateMrModal}
          onClose={() => setShowCreateMrModal(false)}
          project={match}
          config={config}
          branches={branches}
          tags={tags}
          onSuccess={() => {
            fetchMergeRequests();
          }}
        />
      )}

      {/* New Git Tag Creation Modal */}
      {showCreateTagModal && (
        <TagCreateModal
          isOpen={showCreateTagModal}
          onClose={() => setShowCreateTagModal(false)}
          project={match}
          config={config}
          branches={branches}
          tags={tags}
          currentRef={selectedBranch || match.defaultBranch}
          onSuccess={() => {
            fetchTags();
            fetchBranches();
          }}
        />
      )}

      {/* In-App Commit Detail & Diff Modal */}
      {selectedCommitSha && (
        <CommitDetailModal
          isOpen={!!selectedCommitSha}
          onClose={() => setSelectedCommitSha(null)}
          commitSha={selectedCommitSha}
          project={match}
          config={config}
          onSelectSha={(sha) => setSelectedCommitSha(sha)}
        />
      )}

      {/* Interactive Git Commands Guide Modal */}
      {showGitGuideModal && (
        <GitCheatsheetModal
          isOpen={showGitGuideModal}
          onClose={() => setShowGitGuideModal(false)}
        />
      )}
    </div>
  );
}

function DataRow({ label, value, dim }) {
  return (
    <div className="data-row">
      <span className="label">{label}</span>
      <span className={`value${dim ? ' dim' : ''}`}>{value}</span>
    </div>
  );
}

function SubtreeDetail({ subtree }) {
  if (subtree.error) {
    return (
      <div className="card status-warn detail-card">
        <div className="subtree-title">Base subtree</div>
        <p className="error-text">{subtree.error}</p>
      </div>
    );
  }

  const st = subtree;
  let statusHtml;
  if (st.upToDate === true) {
    statusHtml = <span style={{ color: 'var(--accent)' }}>up to date</span>;
  } else if (st.upToDate === false) {
    statusHtml = st.behindCount != null
      ? <span style={{ color: 'var(--warn)' }}>{st.behindCount} commit(s) behind</span>
      : <span style={{ color: 'var(--warn)' }}>out of date</span>;
  } else {
    statusHtml = <span className="dim">unknown (couldn't read a version)</span>;
  }

  return (
    <div className={`card ${st.upToDate === false ? 'status-warn' : 'status-ok'} detail-card`}>
      <div className="subtree-title">Base subtree · {st.baseProjectPath}</div>
      {st.pulledVersion != null && <DataRow label="Pulled version" value={st.pulledVersion || '—'} />}
      {st.baseLatestVersion != null && <DataRow label="Latest base version" value={st.baseLatestVersion || '—'} />}
      <div className="data-row">
        <span className="label">Status</span>
        <span className="value">{statusHtml}</span>
      </div>

      <div className="divider" style={{ margin: '14px 0' }}></div>
      <DataRow label="Pulled SHA" value={st.pulledSha || '—'} />
      <DataRow label="Pulled on" value={fmtDate(st.pulledAt)} dim />
      <DataRow label="Pulled commit title" value={st.pulledCommitTitle || '—'} dim />
      <div className="divider" style={{ margin: '14px 0' }}></div>
      <DataRow label="Base default branch" value={st.baseDefaultBranch || '—'} />
      <DataRow label="Base HEAD SHA" value={st.baseLatestSha || '—'} />
      <DataRow label="Base HEAD date" value={fmtDate(st.baseLatestDate)} dim />
      {st.squashCommitNote && <p className="error-text" style={{ marginTop: 10 }}>{st.squashCommitNote}</p>}

      {/* Unpulled Commits List */}
      {st.behindCommits && st.behindCommits.length > 0 && (
        <>
          <div className="subtree-title" style={{ marginTop: 18 }}>
            Commits not yet pulled ({st.behindCommits.length})
          </div>
          <div className="behind-list behind-list-full" style={{ marginTop: 10 }}>
            {st.behindCommits.map((c, i) => (
              <div
                className="behind-commit"
                key={i}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectCommit && onSelectCommit(c.sha)}
                title={`Click to view commit ${c.sha} diffs in-app`}
              >
                <span className="sha">{c.sha}</span>
                <span className="behind-title">{c.title}</span>
                <span className="behind-meta">{c.author || ''} · {fmtDate(c.date)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MonorepoDetail({ monorepo, webUrl, defaultBranch, onSelectCommit }) {
  if (monorepo.error) {
    return (
      <div className="card status-warn detail-card">
        <div className="subtree-title">Multi-Bank Workspaces</div>
        <p className="error-text">{monorepo.error}</p>
      </div>
    );
  }

  const allWorkspaces = monorepo.workspaces || [];
  const workspaces = allWorkspaces.filter((ws) => {
    const name = (ws.name || ws.path || '').toLowerCase();
    return !name.includes('nucleus') && !name.includes('xp-service');
  });

  if (workspaces.length === 0) {
    return (
      <div className="card status-ok detail-card">
        <div className="subtree-title">Multi-Bank Workspaces</div>
        <p className="dim">No bank workspace packages detected in root package.json.</p>
      </div>
    );
  }

  return (
    <div className="card status-ok detail-card">
      <div className="subtree-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span>Workspaces &amp; Multi-Bank Applications ({workspaces.length})</span>
        <span className="code-pill">Ref: {defaultBranch}</span>
      </div>

      <div className="monorepo-detail-grid" style={{ marginTop: 14 }}>
        {workspaces.map((ws, idx) => {
          const folderUrl = webUrl && defaultBranch ? `${webUrl}/-/tree/${encodeURIComponent(defaultBranch)}/${encodeURIComponent(ws.path)}` : null;
          return (
            <div key={ws.path || idx} className="monorepo-detail-item">
              <div className="monorepo-detail-header">
                <div>
                  <span className="monorepo-detail-name">{ws.name}</span>
                  <div className="card-path" style={{ marginTop: 2 }}>{ws.path}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {ws.version && <span className="monorepo-ws-version">v{ws.version}</span>}
                  {ws.latestTag && (
                    <span className="monorepo-ws-tag" title={`Matching Release Tag: ${ws.latestTag.name}`}>
                      <TagIcon size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                      {ws.latestTag.name}
                    </span>
                  )}
                  {folderUrl && (
                    <a
                      href={folderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-table-link"
                      style={{ padding: '2px 6px', fontSize: '11px' }}
                      title="Open workspace directory in GitLab"
                    >
                      browse ↗
                    </a>
                  )}
                </div>
              </div>

              {ws.latestCommit ? (
                <div
                  className="monorepo-detail-commit"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectCommit && onSelectCommit(ws.latestCommit.sha)}
                  title={`View commit ${ws.latestCommit.sha} diffs in-app`}
                >
                  <div className="monorepo-detail-commit-title">
                    <span className="code-pill" style={{ fontSize: '11px', marginRight: 6 }}>{ws.latestCommit.sha}</span>
                    <span>{ws.latestCommit.title}</span>
                  </div>
                  <div className="list-item-meta" style={{ marginTop: 4 }}>
                    <span>by <strong>{ws.latestCommit.author}</strong></span>
                    <span>{timeAgo(ws.latestCommit.date)} ({fmtDate(ws.latestCommit.date)})</span>
                  </div>
                </div>
              ) : (
                <div className="dim" style={{ fontSize: '11.5px', marginTop: 6 }}>No folder commits found</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
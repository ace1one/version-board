import React, { useState, useEffect, useRef } from 'react';
import {
  TerminalIcon,
  BookIcon,
  GitBranchIcon,
  GitMergeIcon,
  CommitIcon,
  CloudIcon,
  LayersIcon,
  CopyIcon,
  CheckIcon,
  PlayIcon,
  PauseIcon,
  RefreshIcon,
  SearchIcon,
  FileCodeIcon,
  GitLogoIcon,
} from './Icons';

export const GIT_COMMANDS = [
  {
    id: 'git-init',
    num: '01',
    cmd: 'git init',
    title: 'git init',
    category: 'setup',
    tag: 'SETUP',
    shortDesc: 'Create a repository',
    desc: 'Initializes a new, empty Git repository or reinitializes an existing one. Creates the hidden .git directory containing all metadata and version history.',
    whenToUse: 'When starting a brand new project locally or turning an existing project folder into a Git version-controlled repository.',
    output: `Initialized empty Git repository in /workspace/project/.git/
[main (root-commit)] Repository initialized`,
    zonesActive: ['working', 'local'],
    animationType: 'init',
    flags: [
      { flag: 'git init', desc: 'Initialize standard repository with a default working directory' },
      { flag: 'git init -b main', desc: 'Initialize with default initial branch name set to "main"' },
      { flag: 'git init --bare', desc: 'Create a bare repository (no working tree, used for central remotes)' },
    ],
    proTip: 'Configure your global default branch once with: `git config --global init.defaultBranch main` to avoid the legacy `master` naming.',
  },
  {
    id: 'git-status',
    num: '02',
    cmd: 'git status',
    title: 'git status',
    category: 'check',
    tag: 'CHECK',
    shortDesc: 'Inspect changes',
    desc: 'Displays the state of the working tree and the staging area. Shows which changes are staged for the next commit, which are unstaged, and which files are untracked.',
    whenToUse: 'Run frequently throughout your day to inspect what files you modified before staging or committing.',
    output: `On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
	modified:   src/App.jsx
	modified:   src/style.css

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	src/api/auth.js`,
    zonesActive: ['working', 'staging'],
    animationType: 'status',
    flags: [
      { flag: 'git status', desc: 'Full detailed status overview' },
      { flag: 'git status -s', desc: 'Short-format status (compact M, A, ?? indicators)' },
      { flag: 'git status -b', desc: 'Show branch and tracking info even in short-format' },
    ],
    proTip: 'Use `git status -s` for a lightning fast summary: `??` = untracked, ` M` = unstaged, `M ` = staged.',
  },
  {
    id: 'git-add',
    num: '03',
    cmd: 'git add',
    title: 'git add',
    category: 'stage',
    tag: 'STAGE',
    shortDesc: 'Move files to staging',
    desc: 'Adds file contents from the Working Tree into the Staging Area (the Index). Prepares the precise snapshot that will be saved in your next commit.',
    whenToUse: 'After making changes in your editor, stage the files that belong together in a logical commit.',
    output: `$ git add src/App.jsx src/api/auth.js
Staged 2 files for commit:
  + src/App.jsx (modified)
  + src/api/auth.js (new file)`,
    zonesActive: ['working', 'staging'],
    animationType: 'add',
    flags: [
      { flag: 'git add <file>', desc: 'Stage specific file(s)' },
      { flag: 'git add .', desc: 'Stage all modified and new files in the current directory' },
      { flag: 'git add -A', desc: 'Stage all modified, new, and deleted files across the whole repo' },
      { flag: 'git add -p', desc: 'Interactive patch mode: review and stage hunk by hunk!' },
    ],
    proTip: 'Use `git add -p` to stage specific line chunks instead of whole files when you did multiple tasks at once.',
  },
  {
    id: 'git-commit',
    num: '04',
    cmd: 'git commit',
    title: 'git commit',
    category: 'save',
    tag: 'SAVE',
    shortDesc: 'Save a snapshot',
    desc: 'Takes the staged snapshot from the Staging Area and permanently records it into the Local Repository history with an author, timestamp, and unique SHA-1 hash.',
    whenToUse: 'When you have completed a coherent unit of work, bug fix, or feature step.',
    output: `[main 4f9e1b2] feat(auth): integrate biometric login and token refresh
 2 files changed, 48 insertions(+), 6 deletions(-)
 create mode 100644 src/api/auth.js`,
    zonesActive: ['staging', 'local'],
    animationType: 'commit',
    flags: [
      { flag: 'git commit -m "msg"', desc: 'Record commit with inline commit message' },
      { flag: 'git commit -am "msg"', desc: 'Automatically stage modified tracked files and commit' },
      { flag: 'git commit --amend', desc: 'Modify the most recent commit (add staged files or edit message)' },
      { flag: 'git commit --amend --no-edit', desc: 'Add newly staged files into last commit without changing message' },
    ],
    proTip: 'Write commit messages in imperative present tense (e.g. "Add feature" not "Added feature" or "Adds feature").',
  },
  {
    id: 'git-branch',
    num: '05',
    cmd: 'git branch',
    title: 'git branch',
    category: 'branch',
    tag: 'BRANCH',
    shortDesc: 'Create a new line',
    desc: 'Lists, creates, renames, or deletes branches. A branch in Git is simply a lightweight movable pointer to a specific commit.',
    whenToUse: 'When starting a new feature, bugfix, or experiment without affecting the main production codebase.',
    output: `$ git branch feature/user-profile
* main
  feature/user-profile
  remotes/origin/main`,
    zonesActive: ['local'],
    animationType: 'branch',
    flags: [
      { flag: 'git branch', desc: 'List all local branches (* marks current HEAD branch)' },
      { flag: 'git branch -a', desc: 'List both local and remote-tracking branches' },
      { flag: 'git branch <name>', desc: 'Create a new branch from current HEAD' },
      { flag: 'git branch -d <name>', desc: 'Safely delete a merged branch' },
      { flag: 'git branch -D <name>', desc: 'Force delete a branch regardless of merge status' },
      { flag: 'git branch -m <new-name>', desc: 'Rename the current active branch' },
    ],
    proTip: 'Delete stale local branches whose remote PRs were merged using `git branch --merged | grep -v main | xargs git branch -d`.',
  },
  {
    id: 'git-switch',
    num: '06',
    cmd: 'git switch',
    title: 'git switch / checkout',
    category: 'branch',
    tag: 'MOVE',
    shortDesc: 'Move HEAD',
    desc: 'Switches to a specified branch, updating the Working Tree to match that branch’s latest commit snapshot. Modern Git uses `git switch` (introduced in Git 2.23) to separate branch switching from file discarding.',
    whenToUse: 'When switching between different feature branches, or creating and moving to a new branch.',
    output: `Switched to a new branch 'feature/user-profile'
HEAD is now at 4f9e1b2 feat(auth): integrate biometric login`,
    zonesActive: ['working', 'local'],
    animationType: 'switch',
    flags: [
      { flag: 'git switch <branch>', desc: 'Switch to an existing local branch' },
      { flag: 'git switch -c <name>', desc: 'Create a new branch AND switch to it immediately' },
      { flag: 'git switch -', desc: 'Quickly switch back to the previously checked-out branch' },
      { flag: 'git checkout <branch>', desc: 'Classic command: switch branch (same as git switch)' },
    ],
    proTip: 'Use `git switch -` to toggle back and forth between two branches effortlessly.',
  },
  {
    id: 'git-merge',
    num: '07',
    cmd: 'git merge',
    title: 'git merge',
    category: 'join',
    tag: 'JOIN',
    shortDesc: 'Combine histories',
    desc: 'Incorporates changes from the named branch into the current active branch. Creates a merge commit if histories have diverged (3-way merge), or advances pointer if fast-forward.',
    whenToUse: 'When your feature branch is tested and approved and you want to bring its commits into `main` or `develop`.',
    output: `$ git merge feature/user-profile
Updating 4f9e1b2..8b3c10a
Fast-forward (or Merge made by the 'ort' strategy)
 src/components/Profile.jsx | 120 +++++++++++++++++++++++++++++
 1 file changed, 120 insertions(+)`,
    zonesActive: ['local', 'working'],
    animationType: 'merge',
    flags: [
      { flag: 'git merge <branch>', desc: 'Merge named branch into current branch' },
      { flag: 'git merge --no-ff <branch>', desc: 'Always create a dedicated merge commit (preserves feature history)' },
      { flag: 'git merge --squash <branch>', desc: 'Combine all branch commits into a single staged change without commit' },
      { flag: 'git merge --abort', desc: 'Abort an in-progress merge conflict and restore original state' },
    ],
    proTip: 'If a merge conflict gets messy and you want to start over cleanly: run `git merge --abort`.',
  },
  {
    id: 'git-stash',
    num: '08',
    cmd: 'git stash',
    title: 'git stash',
    category: 'hold',
    tag: 'HOLD',
    shortDesc: 'Shelve work temporarily',
    desc: 'Takes your uncommitted changes (both staged and unstaged) and saves them on a temporary stack, reverting your working tree to match the clean HEAD commit.',
    whenToUse: 'When you need to urgently pull changes or switch branches to fix a bug, but your current feature code is half-finished.',
    output: `Saved working directory and index state WIP on main: 4f9e1b2 feat(auth)...
HEAD is now at 4f9e1b2 feat(auth)... (Working tree clean)`,
    zonesActive: ['working', 'staging', 'stash'],
    animationType: 'stash',
    flags: [
      { flag: 'git stash', desc: 'Stash all tracked modified & staged changes' },
      { flag: 'git stash -u', desc: 'Stash including untracked new files (`--include-untracked`)' },
      { flag: 'git stash pop', desc: 'Apply the latest stashed changes back and remove them from the stash stack' },
      { flag: 'git stash apply', desc: 'Apply the stashed changes back but keep them saved on the stack' },
      { flag: 'git stash list', desc: 'View all saved stashes with timestamps and branch names' },
      { flag: 'git stash drop', desc: 'Delete the most recent stash entry' },
    ],
    proTip: 'Always use `git stash -u` so you don\'t accidentally leave newly created files behind.',
  },
  {
    id: 'git-pull',
    num: '09',
    cmd: 'git pull',
    title: 'git pull',
    category: 'sync',
    tag: 'SYNC',
    shortDesc: 'Download + integrate',
    desc: 'Fetches from a remote repository (like GitLab or GitHub) and immediately integrates/merges those changes into the current local branch. Equivalent to `git fetch` + `git merge`.',
    whenToUse: 'At the start of your workday or before opening a Merge Request to keep your local branch up to date with teammates.',
    output: `$ git pull origin main
From gitlab.company.com:project/app
 * branch            main     -> FETCH_HEAD
Updating 4f9e1b2..d3a812e
Fast-forward
 src/services/api.js | 15 ++++++++++-----
 1 file changed, 10 insertions(+), 5 deletions(-)`,
    zonesActive: ['remote', 'local', 'working'],
    animationType: 'pull',
    flags: [
      { flag: 'git pull', desc: 'Pull from default configured upstream remote & branch' },
      { flag: 'git pull origin <branch>', desc: 'Pull from specific remote branch' },
      { flag: 'git pull --rebase', desc: 'Rebase local commits on top of incoming remote commits (linear graph, no merge bubbles!)' },
      { flag: 'git pull --ff-only', desc: 'Only pull if it can fast-forward cleanly without creating a merge commit' },
    ],
    proTip: 'Use `git pull --rebase` to prevent cluttering your git history with unnecessary "Merge branch main" commits.',
  },
  {
    id: 'git-push',
    num: '10',
    cmd: 'git push',
    title: 'git push',
    category: 'ship',
    tag: 'SHIP',
    shortDesc: 'Publish commits',
    desc: 'Uploads your local branch commits and references to the remote repository (GitLab). Shares your work with teammates and triggers CI/CD pipelines.',
    whenToUse: 'When you are ready to publish your local commits, open or update a Merge Request, or deploy code.',
    output: `Enumerating objects: 7, done.
Counting objects: 100% (7/7), done.
Writing objects: 100% (4/4), 1.28 KiB | 1.28 MiB/s, done.
To gitlab.company.com:project/app.git
 * [new branch]      feature/user-profile -> feature/user-profile`,
    zonesActive: ['local', 'remote'],
    animationType: 'push',
    flags: [
      { flag: 'git push', desc: 'Push current branch to configured remote upstream' },
      { flag: 'git push -u origin <branch>', desc: 'Push AND set upstream tracking (only needed the very first time)' },
      { flag: 'git push origin --tags', desc: 'Push all local git tags (version releases) to the remote' },
      { flag: 'git push --force-with-lease', desc: 'Safer force push: overwrites remote only if no one else pushed new commits in between' },
    ],
    proTip: 'Never use plain `git push --force` on shared branches. Always use `git push --force-with-lease`!',
  },
  {
    id: 'git-diff',
    num: '11',
    cmd: 'git diff',
    title: 'git diff',
    category: 'check',
    tag: 'DIFF',
    shortDesc: 'Inspect file differences',
    desc: 'Shows changes between commits, commit and working tree, or between staged and unstaged files line-by-line with additions and deletions.',
    whenToUse: 'Before staging with `git add` to review your code edits, or to compare two branches.',
    output: `diff --git a/src/App.jsx b/src/App.jsx
index e69de29..4f9e1b2 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -10,3 +10,4 @@ export default function App() {
-  const [token, setToken] = useState('');
+  const [token, setToken] = useState(sessionToken);
+  const [authReady, setAuthReady] = useState(true);`,
    zonesActive: ['working', 'staging'],
    animationType: 'diff',
    flags: [
      { flag: 'git diff', desc: 'Show differences between working tree and staging area' },
      { flag: 'git diff --staged', desc: 'Show differences between staging area and last commit (what will be committed)' },
      { flag: 'git diff branch1..branch2', desc: 'Compare differences between two branches' },
      { flag: 'git diff --stat', desc: 'Summary of changed files with insertion/deletion counts' },
    ],
    proTip: 'Always run `git diff --staged` before committing to do a self-code-review of your changes!',
  },
  {
    id: 'git-subtree',
    num: '12',
    cmd: 'git subtree',
    title: 'git subtree',
    category: 'advanced',
    tag: 'SUBTREE',
    shortDesc: 'Sync sub-project repository',
    desc: 'Embeds another repository as a sub-directory within your project while maintaining full Git history and enabling two-way sync (pull updates & push fixes).',
    whenToUse: 'In modular web architectures (like shared base clients or mono-repo sub-packages) where multiple apps share one common base core.',
    output: `$ git subtree pull --prefix=projects/base-client base-remote main --squash
From gitlab.company.com:fonebank/banksmart-client-web
 * branch            main     -> FETCH_HEAD
Squashed commit of the following:
  commit 9d8f1e2 (Base UI components v2.4.0 update)
Merge made by the 'ort' strategy.`,
    zonesActive: ['local', 'remote', 'working'],
    animationType: 'subtree',
    flags: [
      { flag: 'git subtree add --prefix=<dir> <url> <branch> --squash', desc: 'Add a new subtree repository at the given sub-directory' },
      { flag: 'git subtree pull --prefix=<dir> <url> <branch> --squash', desc: 'Pull and merge updates from the upstream base repository' },
      { flag: 'git subtree push --prefix=<dir> <url> <branch>', desc: 'Push local fixes from the subtree folder back to the upstream base' },
    ],
    proTip: 'Always use `--squash` on subtree pull/add to prevent thousands of external commits from bloating your application history.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Commands' },
  { id: 'setup', label: 'Setup' },
  { id: 'stage', label: 'Staging' },
  { id: 'save', label: 'Commits' },
  { id: 'branch', label: 'Branching' },
  { id: 'sync', label: 'Sync & Remote' },
  { id: 'check', label: 'Inspection' },
  { id: 'advanced', label: 'Subtree & Advanced' },
];

export default function GitCheatsheetModal({ isOpen, onClose }) {
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedCmd, setCopiedCmd] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animStep, setAnimStep] = useState(0); // 0, 1, 2 for animated progress stages
  const autoPlayTimerRef = useRef(null);

  const activeCmd = GIT_COMMANDS[selectedCmdIndex] || GIT_COMMANDS[0];

  // Filter commands by search & category
  const filteredCommands = GIT_COMMANDS.filter((cmd) => {
    const matchCategory = activeCategory === 'all' || cmd.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchCategory;
    const matchQuery =
      cmd.cmd.toLowerCase().includes(q) ||
      cmd.shortDesc.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.tag.toLowerCase().includes(q);
    return matchCategory && matchQuery;
  });

  // Cycle animation steps for visual feedback
  useEffect(() => {
    setAnimStep(0);
    const t1 = setTimeout(() => setAnimStep(1), 300);
    const t2 = setTimeout(() => setAnimStep(2), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedCmdIndex]);

  // Handle Autoplay walkthrough
  useEffect(() => {
    if (isPlaying) {
      autoPlayTimerRef.current = setInterval(() => {
        setSelectedCmdIndex((prev) => (prev + 1) % GIT_COMMANDS.length);
      }, 4500);
    } else {
      clearInterval(autoPlayTimerRef.current);
    }
    return () => clearInterval(autoPlayTimerRef.current);
  }, [isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        setSelectedCmdIndex((prev) => Math.min(prev + 1, GIT_COMMANDS.length - 1));
      } else if (e.key === 'ArrowUp') {
        setSelectedCmdIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCmd(key || text);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const handleSelectCmd = (cmd) => {
    const idx = GIT_COMMANDS.findIndex((c) => c.id === cmd.id);
    if (idx !== -1) setSelectedCmdIndex(idx);
  };

  return (
    <div className="modal-backdrop git-guide-backdrop" onClick={onClose}>
      <div className="modal-card git-guide-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="git-guide-header">
          <div className="git-guide-header-left">
            <div className="git-guide-badge-row">
              <span className="git-guide-mono-tag">&gt;_ DEVELOPER FIELD GUIDE</span>
              <span className="git-guide-pill-red">ESSENTIAL GIT</span>
            </div>
            <div className="git-guide-title-row">
              <span className="git-guide-logo-icon">
                <GitLogoIcon size={24} />
              </span>
              <h2 className="git-guide-title">
                10+ GIT COMMANDS <span className="git-guide-subtext">EVERY DEVELOPER SHOULD MASTER</span>
              </h2>
            </div>
          </div>

          <div className="git-guide-header-actions">
            <button
              type="button"
              className={`btn btn-toggle-autoplay ${isPlaying ? 'playing' : ''}`}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause auto-walkthrough' : 'Auto-play command walkthrough'}
            >
              {isPlaying ? (
                <>
                  <PauseIcon size={12} /> Pause Guide
                </>
              ) : (
                <>
                  <PlayIcon size={12} /> Auto-Walkthrough
                </>
              )}
            </button>

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              title="Close guide (Esc)"
            >
              &times;
            </button>
          </div>
        </div>

        {/* SEARCH & CATEGORY FILTER BAR */}
        <div className="git-guide-filter-bar">
          <div className="git-guide-search-wrap">
            <SearchIcon size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search git commands (e.g. commit, merge, stash, subtree)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="git-guide-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                &times;
              </button>
            )}
          </div>

          <div className="git-guide-category-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`git-guide-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN TWO-COLUMN WORKSPACE */}
        <div className="git-guide-body-layout">
          {/* LEFT COLUMN: COMMAND INDEX LIST */}
          <div className="git-guide-sidebar">
            <div className="git-guide-list">
              {filteredCommands.length === 0 && (
                <div className="tab-empty" style={{ padding: '30px 16px' }}>
                  No commands match &ldquo;{searchQuery}&rdquo;
                </div>
              )}
              {filteredCommands.map((cmd) => {
                const isSelected = activeCmd.id === cmd.id;
                return (
                  <div
                    key={cmd.id}
                    className={`git-guide-cmd-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectCmd(cmd)}
                  >
                    <div className="cmd-item-left">
                      <span className="cmd-item-num">{cmd.num}</span>
                      <div className="cmd-item-text-wrap">
                        <div className="cmd-item-title-row">
                          <span className="cmd-item-cmd">$ {cmd.cmd}</span>
                        </div>
                        <span className="cmd-item-desc">{cmd.shortDesc.toUpperCase()}</span>
                      </div>
                    </div>
                    <span className={`cmd-item-tag ${cmd.category}`}>{cmd.tag}</span>
                  </div>
                );
              })}
            </div>

            {/* FOOTER BREADCRUMB */}
            <div className="git-guide-sidebar-foot">
              <span className="foot-workflow-label">WORKING TREE &gt; STAGING &gt; LOCAL &gt; REMOTE</span>
              <span className="foot-step-counter">
                {activeCmd.num} / {String(GIT_COMMANDS.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE VISUAL SIMULATOR & EXPLANATION */}
          <div className="git-guide-viewer-area">
            {/* TERMINAL DISPLAY BOX */}
            <div className="git-terminal-card">
              <div className="terminal-topbar">
                <div className="terminal-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <span className="terminal-title">
                  <TerminalIcon size={12} /> REPOSITORY TERMINAL
                </span>
                <div className="terminal-actions">
                  <button
                    type="button"
                    className="btn-terminal-copy"
                    onClick={() => handleCopy(activeCmd.cmd, 'cmd-main')}
                    title="Copy command to clipboard"
                  >
                    {copiedCmd === 'cmd-main' ? (
                      <>
                        <CheckIcon size={11} /> Copied!
                      </>
                    ) : (
                      <>
                        <CopyIcon size={11} /> Copy Command
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-terminal-replay"
                    onClick={() => {
                      setAnimStep(0);
                      setTimeout(() => setAnimStep(1), 250);
                      setTimeout(() => setAnimStep(2), 700);
                    }}
                    title="Replay animation simulation"
                  >
                    <RefreshIcon size={11} /> Replay
                  </button>
                </div>
              </div>

              <div className="terminal-body">
                <div className="terminal-prompt-line">
                  <span className="term-prompt">$</span>
                  <span className="term-cmd">{activeCmd.cmd}</span>
                  <span className="term-cursor" />
                </div>
                <div className="terminal-subline">{activeCmd.shortDesc.toUpperCase()}</div>
                <div className="terminal-progress-bar">
                  <div
                    className="terminal-progress-fill"
                    style={{
                      width: animStep === 0 ? '25%' : animStep === 1 ? '70%' : '100%',
                    }}
                  />
                </div>
                <pre className="terminal-output-log">{activeCmd.output}</pre>
              </div>
            </div>

            {/* INTERACTIVE WORKFLOW CANVAS (4 ZONES) */}
            <div className="git-visual-canvas-card">
              <div className="visual-canvas-header">
                <span className="canvas-title">
                  <LayersIcon size={13} /> GIT ARCHITECTURE &amp; DATA FLOW
                </span>
                <span className="canvas-state-indicator">
                  Active Zones:{' '}
                  <strong>{activeCmd.zonesActive.map((z) => z.toUpperCase()).join(' ➔ ')}</strong>
                </span>
              </div>

              <div className="git-zones-grid">
                {/* ZONE 1: WORKING TREE */}
                <div
                  className={`git-zone-box zone-working ${activeCmd.zonesActive.includes('working') ? 'active-zone' : ''}`}
                >
                  <div className="zone-head">
                    <span className="zone-name">WORKING TREE</span>
                    <span className="zone-sub">Local filesystem files</span>
                  </div>
                  <div className="zone-content">
                    <div
                      className={`file-token ${activeCmd.animationType === 'add' && animStep >= 1 ? 'token-moving-out' : ''} ${activeCmd.animationType === 'status' ? 'token-modified' : ''}`}
                    >
                      <FileCodeIcon size={12} />
                      <span>App.jsx</span>
                      <span className="file-flag-pill">MODIFIED</span>
                    </div>
                    <div
                      className={`file-token ${activeCmd.animationType === 'add' && animStep >= 1 ? 'token-moving-out' : ''} ${activeCmd.animationType === 'status' ? 'token-untracked' : ''}`}
                    >
                      <FileCodeIcon size={12} />
                      <span>api.js</span>
                      <span className="file-flag-pill">UNTRACKED</span>
                    </div>
                    {activeCmd.animationType === 'init' && (
                      <div className="init-folder-pill">
                        <span>.git/ created</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ZONE 2: STAGING AREA (INDEX) */}
                <div
                  className={`git-zone-box zone-staging ${activeCmd.zonesActive.includes('staging') ? 'active-zone' : ''}`}
                >
                  <div className="zone-head">
                    <span className="zone-name">STAGING AREA</span>
                    <span className="zone-sub">Index / Prepared snapshot</span>
                  </div>
                  <div className="zone-content">
                    {(activeCmd.animationType === 'add' ||
                      activeCmd.animationType === 'commit' ||
                      activeCmd.animationType === 'diff') ? (
                      <div
                        className={`staged-group ${activeCmd.animationType === 'commit' && animStep >= 1 ? 'token-committed' : 'token-staged-pulse'}`}
                      >
                        <div className="staged-file-item">
                          <CheckIcon size={11} className="staged-icon" />
                          <span>App.jsx</span>
                          <span className="stage-badge">+42 -3</span>
                        </div>
                        <div className="staged-file-item">
                          <CheckIcon size={11} className="staged-icon" />
                          <span>api.js</span>
                          <span className="stage-badge">new</span>
                        </div>
                      </div>
                    ) : (
                      <div className="zone-empty-placeholder">
                        {activeCmd.animationType === 'stash'
                          ? 'Changes shelved to stash'
                          : 'Staged changes ready to commit'}
                      </div>
                    )}
                  </div>
                </div>

                {/* ZONE 3: LOCAL REPOSITORY (COMMIT GRAPH) */}
                <div
                  className={`git-zone-box zone-local ${activeCmd.zonesActive.includes('local') ? 'active-zone' : ''}`}
                >
                  <div className="zone-head">
                    <span className="zone-name">LOCAL REPOSITORY</span>
                    <span className="zone-sub">Commit history graph &amp; refs</span>
                  </div>
                  <div className="zone-content local-graph-content">
                    {/* Visual Commit Graph */}
                    <div className="mini-commit-graph">
                      <div className="graph-node node-root" title="Root commit (c1)">
                        <span className="node-dot" />
                        <span className="node-sha">c1 (root)</span>
                      </div>
                      <div className="graph-connector" />
                      <div className="graph-node node-mid" title="Previous commit (c2)">
                        <span className="node-dot" />
                        <span className="node-sha">c2</span>
                      </div>
                      <div className="graph-connector" />
                      <div
                        className={`graph-node node-head ${activeCmd.animationType === 'commit' ? 'node-new-pop' : ''}`}
                        title="Latest commit (c3 / HEAD)"
                      >
                        <span className="node-dot dot-head" />
                        <span className="node-sha">
                          {activeCmd.animationType === 'commit' ? 'c3 (NEW)' : 'c3'}
                        </span>
                        <span className="head-badge-pill">HEAD ➔ main</span>
                      </div>

                      {/* Feature branch line if branching / merging */}
                      {(activeCmd.animationType === 'branch' ||
                        activeCmd.animationType === 'switch' ||
                        activeCmd.animationType === 'merge') && (
                        <div
                          className={`feature-branch-line ${activeCmd.animationType === 'merge' ? 'branch-merged' : ''}`}
                        >
                          <div className="branch-split-curve" />
                          <div className="feature-node">
                            <span className="node-dot dot-feature" />
                            <span className="feature-branch-pill">feature/user-profile</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ZONE 4: REMOTE REPOSITORY (ORIGIN / CLOUD) */}
                <div
                  className={`git-zone-box zone-remote ${activeCmd.zonesActive.includes('remote') ? 'active-zone' : ''}`}
                >
                  <div className="zone-head">
                    <span className="zone-name">REMOTE REPO</span>
                    <span className="zone-sub">GitLab origin / upstream</span>
                  </div>
                  <div className="zone-content remote-content">
                    <div className="remote-cloud-badge">
                      <CloudIcon size={20} className="cloud-icon" />
                      <div className="remote-info">
                        <span className="remote-title">origin/main</span>
                        <span className="remote-url">gitlab.com/project</span>
                      </div>
                    </div>

                    {activeCmd.animationType === 'push' && (
                      <div className="packet-stream stream-push">
                        <span className="packet-dot" />
                        <span className="packet-dot" />
                        <span className="packet-label">Pushing ➔ origin</span>
                      </div>
                    )}

                    {activeCmd.animationType === 'pull' && (
                      <div className="packet-stream stream-pull">
                        <span className="packet-dot" />
                        <span className="packet-dot" />
                        <span className="packet-label">Pulling ➔ local</span>
                      </div>
                    )}

                    {activeCmd.animationType === 'subtree' && (
                      <div className="subtree-sync-badge">
                        <span className="sync-icon">🔄</span>
                        <span>Base Subtree Synced</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* EXPLANATION & FLAGS DEEP DIVE */}
            <div className="git-guide-detail-card">
              <div className="detail-section">
                <h4 className="detail-section-title">
                  <BookIcon size={14} /> Description &amp; Usage
                </h4>
                <p className="detail-desc-text">{activeCmd.desc}</p>
                <div className="when-to-use-box">
                  <strong className="when-label">💡 When to use:</strong>
                  <span>{activeCmd.whenToUse}</span>
                </div>
              </div>

              {/* COMMON FLAGS & OPTIONS */}
              {activeCmd.flags && activeCmd.flags.length > 0 && (
                <div className="detail-section" style={{ marginTop: '16px' }}>
                  <h4 className="detail-section-title">
                    <TerminalIcon size={14} /> Common Variations &amp; Flags
                  </h4>
                  <div className="flags-grid">
                    {activeCmd.flags.map((item, idx) => (
                      <div
                        key={idx}
                        className="flag-card"
                        onClick={() => handleCopy(item.flag, `flag-${idx}`)}
                        title="Click to copy command"
                      >
                        <div className="flag-top">
                          <code className="flag-code">{item.flag}</code>
                          <button type="button" className="btn-copy-chip">
                            {copiedCmd === `flag-${idx}` ? (
                              <CheckIcon size={11} />
                            ) : (
                              <CopyIcon size={11} />
                            )}
                          </button>
                        </div>
                        <p className="flag-desc">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRO TIP */}
              {activeCmd.proTip && (
                <div className="git-guide-pro-tip">
                  <span className="pro-tip-badge">PRO TIP</span>
                  <p className="pro-tip-text">{activeCmd.proTip}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

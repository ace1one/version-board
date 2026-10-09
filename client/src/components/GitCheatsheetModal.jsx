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
  RocketIcon,
} from './Icons';

export const GIT_COMMANDS = [
  {
    id: 'git-init',
    num: '01',
    cmd: 'git init',
    title: 'git init',
    category: 'setup',
    tag: 'SETUP',
    shortDesc: 'Create a new local repository',
    desc: 'Initializes a new, empty Git repository in the current folder. Creates the hidden .git directory containing all Git internal objects, refs, and version history.',
    whenToUse: 'When starting a brand new project locally or turning an existing project folder into a Git-controlled repository.',
    output: `Initialized empty Git repository in /workspace/project/.git/
[main (root-commit)] Repository initialized`,
    zonesActive: ['working', 'local'],
    animationType: 'init',
    fromZone: 'working',
    toZone: 'local',
    stepExplain: 'Creates the hidden .git metadata store and establishes the default initial branch.',
    flags: [
      { flag: 'git init', desc: 'Initialize standard repository in current folder' },
      { flag: 'git init -b main', desc: 'Initialize with default branch explicitly named "main"' },
      { flag: 'git init --bare', desc: 'Create a bare repository without a working directory (for remotes)' },
    ],
    proTip: 'Configure your global default branch with: git config --global init.defaultBranch main',
  },
  {
    id: 'git-status',
    num: '02',
    cmd: 'git status',
    title: 'git status',
    category: 'check',
    tag: 'CHECK',
    shortDesc: 'Inspect working tree & staging state',
    desc: 'Displays the state of the working tree and the staging area. Shows which modified files are staged for the next commit, which are unstaged, and untracked files.',
    whenToUse: 'Run frequently throughout development before staging, committing, or switching branches to prevent accidental commits.',
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
    fromZone: 'working',
    toZone: 'staging',
    stepExplain: 'Scans the working tree against the index to identify modified, deleted, and untracked files.',
    flags: [
      { flag: 'git status', desc: 'Full detailed status overview' },
      { flag: 'git status -s', desc: 'Short-format status (compact M, A, ?? indicators)' },
      { flag: 'git status -b', desc: 'Show branch and upstream tracking info in short-format' },
    ],
    proTip: 'Use `git status -s` for lightning-fast reads: `??` = untracked, ` M` = unstaged, `M ` = staged.',
  },
  {
    id: 'git-add',
    num: '03',
    cmd: 'git add',
    title: 'git add',
    category: 'stage',
    tag: 'STAGE',
    shortDesc: 'Move working changes to staging area',
    desc: 'Adds file contents from the Working Tree into the Staging Area (the Index). Prepares the precise snapshot that will be packaged in your next commit.',
    whenToUse: 'After making edits in your code editor, stage only the files and lines that belong together in a logical commit.',
    output: `$ git add src/App.jsx src/api/auth.js
Staged 2 files for commit:
  + src/App.jsx (modified: +42 -3 lines)
  + src/api/auth.js (new file: +120 lines)`,
    zonesActive: ['working', 'staging'],
    animationType: 'add',
    fromZone: 'working',
    toZone: 'staging',
    stepExplain: 'Copies modified file snapshots into the staging index, readying them for commit.',
    flags: [
      { flag: 'git add <file>', desc: 'Stage specific file(s)' },
      { flag: 'git add .', desc: 'Stage all modified and new files in the current folder' },
      { flag: 'git add -A', desc: 'Stage all modified, new, and deleted files across the whole repo' },
      { flag: 'git add -p', desc: 'Interactive patch mode: review and stage hunk by hunk!' },
    ],
    proTip: 'Use `git add -p` to stage specific line chunks instead of whole files when you made multiple unrelated edits.',
  },
  {
    id: 'git-commit',
    num: '04',
    cmd: 'git commit',
    title: 'git commit',
    category: 'save',
    tag: 'SAVE',
    shortDesc: 'Record staged changes in local repository',
    desc: 'Stores the current contents of the staging area in a new commit object with a unique SHA hash, author metadata, timestamp, and message, advancing the branch pointer.',
    whenToUse: 'When you complete a logical unit of work (bug fix, new component, refactor) that passes tests.',
    output: `[main 8a4c1f9] feat: add user authentication flow and login UI
 2 files changed, 162 insertions(+), 3 deletions(-)
 create mode 100644 src/api/auth.js`,
    zonesActive: ['staging', 'local'],
    animationType: 'commit',
    fromZone: 'staging',
    toZone: 'local',
    stepExplain: 'Creates a permanent cryptographic commit snapshot (SHA) in .git and advances HEAD pointer.',
    flags: [
      { flag: 'git commit -m "feat: message"', desc: 'Record commit with inline commit message' },
      { flag: 'git commit -am "fix: message"', desc: 'Shortcut: automatically stage tracked modified files and commit' },
      { flag: 'git commit --amend', desc: 'Modify the most recent commit (change message or add forgotten files)' },
    ],
    proTip: 'Follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:` for crystal-clear team changelogs.',
  },
  {
    id: 'git-branch',
    num: '05',
    cmd: 'git branch',
    title: 'git branch',
    category: 'branch',
    tag: 'BRANCH',
    shortDesc: 'Create, list, or delete branches',
    desc: 'Manages lightweight movable pointers to commits. Allows isolated parallel development for features, hotfixes, or experiments without affecting main.',
    whenToUse: 'Before starting any new task, create a dedicated branch off main so your work remains completely isolated.',
    output: `$ git branch feature/user-profile
$ git branch -a
* main
  feature/user-profile
  remotes/origin/main`,
    zonesActive: ['local'],
    animationType: 'branch',
    fromZone: 'local',
    toZone: 'local',
    stepExplain: 'Creates a new named pointer pointing to the current commit without switching to it yet.',
    flags: [
      { flag: 'git branch <name>', desc: 'Create a new branch pointing at current HEAD commit' },
      { flag: 'git branch -a', desc: 'List all local and remote-tracking branches' },
      { flag: 'git branch -d <name>', desc: 'Safely delete a branch that has already been merged' },
      { flag: 'git branch -D <name>', desc: 'Force delete a branch even if unmerged' },
    ],
    proTip: 'Use structured naming: `feature/login`, `bugfix/issue-123`, `chore/deps`, `hotfix/security`.',
  },
  {
    id: 'git-switch',
    num: '06',
    cmd: 'git switch',
    title: 'git switch',
    category: 'branch',
    tag: 'SWITCH',
    shortDesc: 'Switch active branch / working tree',
    desc: 'Updates files in the working tree to match the version indexed in the target branch, and updates HEAD to point to that branch.',
    whenToUse: 'When moving between tasks or starting work on a newly created branch.',
    output: `$ git switch -c feature/user-profile
Switched to a new branch 'feature/user-profile'`,
    zonesActive: ['local', 'working'],
    animationType: 'switch',
    fromZone: 'local',
    toZone: 'working',
    stepExplain: 'Moves HEAD pointer to target branch and updates working directory files to match.',
    flags: [
      { flag: 'git switch <branch>', desc: 'Switch to an existing local branch' },
      { flag: 'git switch -c <name>', desc: 'Create AND immediately switch to a new branch (Modern alternative to git checkout -b)' },
      { flag: 'git switch -', desc: 'Switch back to the previously active branch (fast toggle!)' },
    ],
    proTip: '`git switch` is the modern, safe alternative to `git checkout` designed specifically for branch navigation.',
  },
  {
    id: 'git-merge',
    num: '07',
    cmd: 'git merge',
    title: 'git merge',
    category: 'branch',
    tag: 'MERGE',
    shortDesc: 'Combine histories of two branches',
    desc: 'Integrates changes from a named branch into the currently checked-out branch by performing a fast-forward or creating a merge commit.',
    whenToUse: 'When integrating an approved feature branch back into main, or pulling main updates into your feature branch.',
    output: `$ git merge feature/user-profile
Updating 8a4c1f9..3d7b2e1
Fast-forward
 src/App.jsx         | 42 +++++++++++++++++++++++++++++++++++++++---
 src/api/auth.js     | 120 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 159 insertions(+), 3 deletions(-)`,
    zonesActive: ['local', 'working'],
    animationType: 'merge',
    fromZone: 'local',
    toZone: 'local',
    stepExplain: 'Combines the histories of two branches, creating a merge commit with two parent commits if diverging.',
    flags: [
      { flag: 'git merge <branch>', desc: 'Merge specified branch into current branch' },
      { flag: 'git merge --no-ff <branch>', desc: 'Always create a merge commit even if fast-forward is possible' },
      { flag: 'git merge --squash <branch>', desc: 'Squash all feature branch commits into a single staged change' },
      { flag: 'git merge --abort', desc: 'Abort an in-progress merge conflict and restore clean pre-merge state' },
    ],
    proTip: 'If conflicts occur during merge, resolve conflicts in files, stage them with `git add`, and run `git commit` to finalize.',
  },
  {
    id: 'git-stash',
    num: '08',
    cmd: 'git stash',
    title: 'git stash',
    category: 'stage',
    tag: 'STASH',
    shortDesc: 'Temporarily shelve uncommitted work',
    desc: 'Takes all your modified tracked files and staged changes, saves them on a stack of unfinished changes, and reverts your working tree to a clean HEAD state.',
    whenToUse: 'When you need to quickly switch branches to review a bug, but your current task is half-finished and not ready to commit.',
    output: `$ git stash push -m "WIP: auth modal layout"
Saved working directory and index state WIP on feature/login: WIP: auth modal layout
HEAD is now at 8a4c1f9 feat: initial commit`,
    zonesActive: ['working', 'staging', 'local'],
    animationType: 'stash',
    fromZone: 'working',
    toZone: 'local',
    stepExplain: 'Shelves all uncommitted changes into an internal vault and resets working tree to clean HEAD state.',
    flags: [
      { flag: 'git stash', desc: 'Save uncommitted tracked modifications to the stash list' },
      { flag: 'git stash push -m "msg"', desc: 'Save stash with a descriptive label for easy retrieval' },
      { flag: 'git stash pop', desc: 'Apply the latest stashed changes and remove them from the stash stack' },
      { flag: 'git stash list', desc: 'View all saved stashes with timestamps and branch names' },
    ],
    proTip: 'Use `git stash -u` to include untracked new files into the stash as well.',
  },
  {
    id: 'git-pull',
    num: '09',
    cmd: 'git pull',
    title: 'git pull',
    category: 'sync',
    tag: 'SYNC',
    shortDesc: 'Fetch & merge changes from remote',
    desc: 'Fetches commits from the remote repository (GitLab) and immediately merges them into the current local branch (equivalent to `git fetch` followed by `git merge`).',
    whenToUse: 'At the start of your workday or before opening a Merge Request, to sync with teammates’ latest changes.',
    output: `$ git pull origin main
remote: Enumerating objects: 18, done.
remote: Counting objects: 100% (18/18), done.
remote: Compressing objects: 100% (12/12), done.
Unpacking objects: 100% (18/18), 3.42 KiB | 1.14 MiB/s, done.
From gitlab.company.com:workspace/project
 * branch            main     -> FETCH_HEAD
Updating 8a4c1f9..e4f92a1
Fast-forward`,
    zonesActive: ['remote', 'local', 'working'],
    animationType: 'pull',
    fromZone: 'remote',
    toZone: 'local',
    stepExplain: 'Streams commits from GitLab remote into local repo and merges them into your active branch.',
    flags: [
      { flag: 'git pull', desc: 'Pull changes from the configured upstream tracking branch' },
      { flag: 'git pull origin <branch>', desc: 'Pull explicitly from specified remote branch' },
      { flag: 'git pull --rebase', desc: 'Rebase your local unpushed commits on top of incoming remote commits (keeps clean linear history)' },
    ],
    proTip: 'Use `git pull --rebase` to prevent cluttering history with unnecessary "Merge branch main" commits.',
  },
  {
    id: 'git-push',
    num: '10',
    cmd: 'git push',
    title: 'git push',
    category: 'sync',
    tag: 'SYNC',
    shortDesc: 'Upload local commits to GitLab remote',
    desc: 'Updates remote branch references using local commits. Publishes your local commits to the shared team repository on GitLab.',
    whenToUse: 'After making one or more commits locally, push them so teammates can review, collaborate, or trigger CI/CD pipelines.',
    output: `$ git push origin feature/user-profile
Enumerating objects: 14, done.
Counting objects: 100% (14/14), done.
Delta compression using up to 8 threads
Compressing objects: 100% (8/8), done.
Writing objects: 100% (8/8), 2.15 KiB | 2.15 MiB/s, done.
Total 8 (delta 5), reused 0 (delta 0)
To gitlab.company.com:workspace/project.git
 * [new branch]      feature/user-profile -> feature/user-profile`,
    zonesActive: ['local', 'remote'],
    animationType: 'push',
    fromZone: 'local',
    toZone: 'remote',
    stepExplain: 'Uploads new commit objects and updates the branch ref on the GitLab remote server.',
    flags: [
      { flag: 'git push', desc: 'Push commits to the configured upstream branch' },
      { flag: 'git push -u origin <branch>', desc: 'Push and establish upstream tracking association for the first time' },
      { flag: 'git push --force-with-lease', desc: 'Safe force push that verifies nobody else pushed in the meantime' },
    ],
    proTip: 'Never use plain `git push --force`. Always use `git push --force-with-lease` to prevent overwriting teammates’ work.',
  },
  {
    id: 'git-diff',
    num: '11',
    cmd: 'git diff',
    title: 'git diff',
    category: 'check',
    tag: 'DIFF',
    shortDesc: 'Inspect line-by-line file changes',
    desc: 'Shows changes between the working directory and staging area, between commits, or between branches using unified diff format.',
    whenToUse: 'Review every single line of code you wrote before running `git add` or `git commit`.',
    output: `$ git diff
diff --git a/src/App.jsx b/src/App.jsx
index 92d8f1e..e7b4a2c 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -14,3 +14,5 @@ export default function App() {
-  const [user, setUser] = useState(null);
+  const [user, setUser] = useState(() => loadCachedUser());
+  const [token, setToken] = useState(getStoredToken());`,
    zonesActive: ['working', 'staging'],
    animationType: 'diff',
    fromZone: 'working',
    toZone: 'staging',
    stepExplain: 'Compares text differences line-by-line with additions (+) and deletions (-).',
    flags: [
      { flag: 'git diff', desc: 'Show unstaged changes in working tree vs staging area' },
      { flag: 'git diff --staged', desc: 'Show staged changes (what will be included in the next commit)' },
      { flag: 'git diff branchA..branchB', desc: 'Compare entire commit diff between two branches' },
    ],
    proTip: 'Use `git diff --staged` right before committing to do a final self-code-review.',
  },
  {
    id: 'git-subtree',
    num: '12',
    cmd: 'git subtree',
    title: 'git subtree',
    category: 'advanced',
    tag: 'SUBTREE',
    shortDesc: 'Sync sub-project repository inside repo',
    desc: 'Embeds an external repository as a sub-directory inside your project while keeping full commit history and enabling two-way sync (pull updates & push fixes).',
    whenToUse: 'In modular multi-bank web architectures where multiple bank projects share one common base client or design system.',
    output: `$ git subtree pull --prefix=projects/base-client base-remote main --squash
From gitlab.company.com:fonebank/banksmart-client-web
 * branch            main     -> FETCH_HEAD
Squashed commit of the following:
  commit 9d8f1e2 (Base UI components v2.4.0 update)
Merge made by the 'ort' strategy.`,
    zonesActive: ['local', 'remote', 'working'],
    animationType: 'subtree',
    fromZone: 'remote',
    toZone: 'working',
    stepExplain: 'Synchronizes embedded sub-directory commits with the upstream base repository.',
    flags: [
      { flag: 'git subtree add --prefix=<dir> <url> <branch> --squash', desc: 'Add a new subtree repository at the given sub-directory' },
      { flag: 'git subtree pull --prefix=<dir> <url> <branch> --squash', desc: 'Pull and merge updates from the upstream base repository' },
      { flag: 'git subtree push --prefix=<dir> <url> <branch>', desc: 'Push local fixes from the subtree folder back to upstream base' },
    ],
    proTip: 'Always use `--squash` on subtree pull to prevent external commits from bloating your application history.',
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

const WORKFLOW_RECIPES = [
  {
    id: 'subtree-sync',
    title: '🚀 Subtree Sync Workflow (Base ➔ Bank Repo)',
    desc: 'How to safely pull shared base client updates into a bank-specific repo without breaking custom bank code.',
    steps: [
      {
        step: 1,
        title: 'Check working tree status',
        cmd: 'git status',
        explain: 'Ensure your working directory is clean before syncing subtrees.',
      },
      {
        step: 2,
        title: 'Pull latest updates from base repository',
        cmd: 'git subtree pull --prefix=projects/base-client https://gitlab.com/fonebank/banksmart-client-web.git main --squash',
        explain: 'Fetches base updates and merges them as a single clean squashed commit into projects/base-client.',
      },
      {
        step: 3,
        title: 'Review diff & test build',
        cmd: 'git diff HEAD~1 && npm run build',
        explain: 'Verify the squashed changes and confirm no regressions in your bank project.',
      },
      {
        step: 4,
        title: 'Push updated repo to GitLab',
        cmd: 'git push origin main',
        explain: 'Upload the synchronized subtree commit to your bank repository remote.',
      },
    ],
  },
  {
    id: 'feature-mr',
    title: '🔀 Feature Branch to Merge Request (Daily Standard)',
    desc: 'The best-practice GitLab flow from starting a new feature to merge request approval.',
    steps: [
      {
        step: 1,
        title: 'Create & switch to feature branch',
        cmd: 'git switch -c feature/user-profile',
        explain: 'Creates an isolated branch off the latest main.',
      },
      {
        step: 2,
        title: 'Stage and commit your work',
        cmd: 'git add . && git commit -m "feat(user): add profile settings page"',
        explain: 'Group logical changes into clean, descriptive commits.',
      },
      {
        step: 3,
        title: 'Push and set upstream tracking',
        cmd: 'git push -u origin feature/user-profile',
        explain: 'Uploads branch to GitLab and outputs the direct link to open a Merge Request.',
      },
      {
        step: 4,
        title: 'Review & merge via gitClone MR Drawer',
        cmd: '# Click "MRs" in gitClone top bar or project card to review & accept!',
        explain: 'Inspect commit diffs, approvals, and merge directly inside gitClone.',
      },
    ],
  },
  {
    id: 'undo-mistakes',
    title: '🚨 Undoing Mistakes (Without Panic)',
    desc: 'Quick reference for undoing actions safely depending on what stage your changes are in.',
    steps: [
      {
        step: 1,
        title: 'Discard unstaged changes in a file',
        cmd: 'git restore src/App.jsx',
        explain: 'Reverts the working copy of a file back to the last commit (discards unstaged edits).',
      },
      {
        step: 2,
        title: 'Unstage a staged file (keep your code)',
        cmd: 'git restore --staged src/App.jsx',
        explain: 'Removes file from staging index so it won\'t be committed, but preserves your edits in file.',
      },
      {
        step: 3,
        title: 'Undo last local commit (keep changes as staged)',
        cmd: 'git reset --soft HEAD~1',
        explain: 'Uncommits the latest commit, leaving all modified code safely staged in your editor.',
      },
      {
        step: 4,
        title: 'Revert a commit already pushed to GitLab',
        cmd: 'git revert <commit-sha>',
        explain: 'Creates a new inverse commit that safely undoes the previous commit without rewriting history.',
      },
    ],
  },
];

export default function GitCheatsheetModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator', 'graph', 'workflows', 'cheatsheet'
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedCmd, setCopiedCmd] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animProgress, setAnimProgress] = useState(0); // 0 to 100 for continuous smooth flow
  const [animStep, setAnimStep] = useState(1); // Step 1, 2, 3
  const [simSpeed, setSimSpeed] = useState(1); // 1x or 2x
  const animFrameRef = useRef(null);
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

  // Continuous animation progress loop
  useEffect(() => {
    let start = performance.now();
    const duration = 3000 / simSpeed;

    const tick = (now) => {
      const elapsed = (now - start) % duration;
      const progress = elapsed / duration;
      setAnimProgress(progress * 100);

      if (progress < 0.33) {
        setAnimStep(1);
      } else if (progress < 0.66) {
        setAnimStep(2);
      } else {
        setAnimStep(3);
      }

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, selectedCmdIndex, simSpeed]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        setSelectedCmdIndex((prev) => Math.min(prev + 1, GIT_COMMANDS.length - 1));
      } else if (e.key === 'ArrowUp') {
        setSelectedCmdIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
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
    if (idx !== -1) {
      setSelectedCmdIndex(idx);
      setAnimProgress(0);
      setAnimStep(1);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setAnimStep((prev) => (prev % 3) + 1);
    setAnimProgress(((animStep % 3) + 1) * 33);
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    setAnimStep((prev) => (prev === 1 ? 3 : prev - 1));
    setAnimProgress((prev === 1 ? 3 : prev - 1) * 33);
  };

  const handleRestartAnim = () => {
    setAnimProgress(0);
    setAnimStep(1);
    setIsPlaying(true);
  };

  return (
    <div className="modal-backdrop git-guide-backdrop" onClick={onClose}>
      <div className="modal-card git-guide-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="git-guide-header">
          <div className="git-guide-header-left">
            <div className="git-guide-badge-row">
              <span className="git-guide-mono-tag">&gt;_ INTERACTIVE GIT VISUALIZER</span>
              <span className="git-guide-pill-red">ANIMATED WORKFLOW</span>
            </div>
            <div className="git-guide-title-row">
              <span className="git-guide-logo-icon">
                <GitLogoIcon size={24} />
              </span>
              <h2 className="git-guide-title">
                Visual Git Guide <span className="git-guide-subtext">&amp; Architecture Simulator</span>
              </h2>
            </div>
          </div>

          <div className="git-guide-nav-tabs">
            <button
              type="button"
              className={`git-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulator')}
            >
              <RocketIcon size={14} /> Interactive Simulator
            </button>
            <button
              type="button"
              className={`git-tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
              onClick={() => setActiveTab('graph')}
            >
              <GitBranchIcon size={14} /> Commit Tree &amp; DAG
            </button>
            <button
              type="button"
              className={`git-tab-btn ${activeTab === 'workflows' ? 'active' : ''}`}
              onClick={() => setActiveTab('workflows')}
            >
              <LayersIcon size={14} /> Real-World Recipes
            </button>
            <button
              type="button"
              className={`git-tab-btn ${activeTab === 'cheatsheet' ? 'active' : ''}`}
              onClick={() => setActiveTab('cheatsheet')}
            >
              <BookIcon size={14} /> Cheatsheet Table
            </button>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose} title="Close guide (Esc)">
            &times;
          </button>
        </div>

        {/* TAB 1: INTERACTIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <>
            {/* SEARCH & FILTER BAR */}
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
                  <button type="button" className="search-clear" onClick={() => setSearchQuery('')}>
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

            {/* MAIN 2-COLUMN SIMULATOR WORKSPACE */}
            <div className="git-guide-body-layout">
              {/* LEFT COLUMN: COMMAND SELECTOR LIST */}
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

                <div className="git-guide-sidebar-foot">
                  <span className="foot-workflow-label">WORKING ➔ STAGING ➔ LOCAL ➔ REMOTE</span>
                  <span className="foot-step-counter">
                    {activeCmd.num} / {String(GIT_COMMANDS.length).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: INTERACTIVE VISUAL ENGINE & CANVA */}
              <div className="git-guide-viewer-area">
                {/* INTERACTIVE STAGE & ANIMATED FLOW CANVAS */}
                <div className="git-sim-stage-card">
                  {/* STAGE CONTROLS */}
                  <div className="stage-control-bar">
                    <div className="stage-control-left">
                      <button
                        type="button"
                        className="btn-sim-control"
                        onClick={() => setIsPlaying(!isPlaying)}
                        title={isPlaying ? 'Pause simulation (Space)' : 'Play simulation (Space)'}
                      >
                        {isPlaying ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-sim-control"
                        onClick={handleRestartAnim}
                        title="Restart simulation"
                      >
                        <RefreshIcon size={13} />
                        <span>Replay</span>
                      </button>
                      <button
                        type="button"
                        className="btn-sim-control"
                        onClick={handleStepForward}
                        title="Step Forward"
                      >
                        <span>Step ➔</span>
                      </button>
                      <button
                        type="button"
                        className={`btn-sim-speed ${simSpeed === 2 ? 'active' : ''}`}
                        onClick={() => setSimSpeed(simSpeed === 1 ? 2 : 1)}
                        title="Toggle speed (1x / 2x)"
                      >
                        {simSpeed}x Speed
                      </button>
                    </div>

                    <div className="stage-current-action">
                      <span className="action-pill">
                        RUNNING: <strong>{activeCmd.cmd}</strong>
                      </span>
                      <span className="step-indicator">
                        Step {animStep} / 3: {activeCmd.stepExplain}
                      </span>
                    </div>
                  </div>

                  {/* 4-ZONE ARCHITECTURE VISUALIZATION WITH ANIMATED FLOW PATHS */}
                  <div className="git-4zones-canvas">
                    {/* ZONE 1: WORKING TREE */}
                    <div
                      className={`canvas-zone-col zone-working ${activeCmd.zonesActive.includes('working') ? 'active-zone' : ''}`}
                    >
                      <div className="zone-header">
                        <span className="zone-tag">ZONE 1</span>
                        <h4 className="zone-title">Working Tree</h4>
                        <span className="zone-sub">Local filesystem files</span>
                      </div>
                      <div className="zone-body">
                        <div
                          className={`animated-file-card ${activeCmd.animationType === 'add' && animProgress > 15 ? 'file-sliding-right' : ''}`}
                        >
                          <div className="file-header">
                            <FileCodeIcon size={13} />
                            <span>App.jsx</span>
                          </div>
                          <div className="file-diff-pill mod">MODIFIED (+42)</div>
                        </div>

                        <div
                          className={`animated-file-card ${activeCmd.animationType === 'add' && animProgress > 25 ? 'file-sliding-right' : ''}`}
                        >
                          <div className="file-header">
                            <FileCodeIcon size={13} />
                            <span>auth.js</span>
                          </div>
                          <div className="file-diff-pill untracked">NEW UNTRACKED</div>
                        </div>

                        {activeCmd.animationType === 'init' && (
                          <div className="pulse-action-badge">
                            <span>.git folder initialized!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DYNAMIC FLOW CONNECTOR 1: Working -> Staging */}
                    <div className="zone-flow-connector">
                      <div className="connector-label">$ git add</div>
                      <div className="flowing-track">
                        <div
                          className={`flowing-particle ${activeCmd.animationType === 'add' && isPlaying ? 'animating' : ''}`}
                          style={{
                            transform: `translateX(${activeCmd.animationType === 'add' ? animProgress : 0}%)`,
                            opacity: activeCmd.animationType === 'add' ? 1 : 0.2,
                          }}
                        />
                      </div>
                    </div>

                    {/* ZONE 2: STAGING AREA */}
                    <div
                      className={`canvas-zone-col zone-staging ${activeCmd.zonesActive.includes('staging') ? 'active-zone' : ''}`}
                    >
                      <div className="zone-header">
                        <span className="zone-tag">ZONE 2</span>
                        <h4 className="zone-title">Staging Area</h4>
                        <span className="zone-sub">Index / Prepared snapshot</span>
                      </div>
                      <div className="zone-body">
                        {activeCmd.animationType === 'add' ||
                        activeCmd.animationType === 'commit' ||
                        activeCmd.animationType === 'status' ||
                        activeCmd.animationType === 'diff' ? (
                          <div
                            className={`staged-bundle-box ${activeCmd.animationType === 'commit' && animProgress > 30 ? 'bundle-moving-commit' : 'staged-glowing'}`}
                          >
                            <div className="staged-bundle-head">
                              <CheckIcon size={12} />
                              <span>Staged Snapshot</span>
                            </div>
                            <div className="staged-file-row">
                              <span>✓ App.jsx</span>
                              <span className="badge-plus">+42</span>
                            </div>
                            <div className="staged-file-row">
                              <span>✓ auth.js</span>
                              <span className="badge-plus">+120</span>
                            </div>
                          </div>
                        ) : (
                          <div className="zone-empty-hint">
                            {activeCmd.animationType === 'stash'
                              ? 'Changes stashed away in stash stack'
                              : 'No staged changes in index'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DYNAMIC FLOW CONNECTOR 2: Staging -> Local Repo */}
                    <div className="zone-flow-connector">
                      <div className="connector-label">$ git commit</div>
                      <div className="flowing-track">
                        <div
                          className={`flowing-particle ${activeCmd.animationType === 'commit' && isPlaying ? 'animating' : ''}`}
                          style={{
                            transform: `translateX(${activeCmd.animationType === 'commit' ? animProgress : 0}%)`,
                            opacity: activeCmd.animationType === 'commit' ? 1 : 0.2,
                          }}
                        />
                      </div>
                    </div>

                    {/* ZONE 3: LOCAL REPO (.git) */}
                    <div
                      className={`canvas-zone-col zone-local ${activeCmd.zonesActive.includes('local') ? 'active-zone' : ''}`}
                    >
                      <div className="zone-header">
                        <span className="zone-tag">ZONE 3</span>
                        <h4 className="zone-title">Local Repo (.git)</h4>
                        <span className="zone-sub">Commit DAG history</span>
                      </div>
                      <div className="zone-body">
                        <div className="dag-commit-chain">
                          <div className="dag-node">
                            <span className="commit-circle root">C1</span>
                            <span className="commit-label">Init</span>
                          </div>
                          <div className="dag-line" />
                          <div className="dag-node">
                            <span className="commit-circle mid">C2</span>
                            <span className="commit-label">Base</span>
                          </div>
                          <div className="dag-line" />
                          <div
                            className={`dag-node head ${activeCmd.animationType === 'commit' ? 'newly-created-commit' : ''}`}
                          >
                            <span className="commit-circle head-circle">C3</span>
                            <span className="commit-label">HEAD ➔ main</span>
                          </div>
                        </div>

                        {/* Branch / Merge Indicator */}
                        {(activeCmd.animationType === 'branch' ||
                          activeCmd.animationType === 'switch' ||
                          activeCmd.animationType === 'merge') && (
                          <div
                            className={`feature-branch-preview ${activeCmd.animationType === 'merge' ? 'merged-state' : ''}`}
                          >
                            <div className="branch-curve" />
                            <div className="feature-node-box">
                              <span className="commit-circle feat">C4</span>
                              <span className="branch-name-tag">feature/user-profile</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DYNAMIC FLOW CONNECTOR 3: Local -> Remote */}
                    <div className="zone-flow-connector">
                      <div className="connector-label">
                        {activeCmd.animationType === 'pull' ? '$ git pull ↙' : '$ git push ↗'}
                      </div>
                      <div className="flowing-track">
                        <div
                          className={`flowing-particle ${['push', 'pull', 'subtree'].includes(activeCmd.animationType) && isPlaying ? 'animating' : ''}`}
                          style={{
                            transform: `translateX(${['push', 'pull', 'subtree'].includes(activeCmd.animationType) ? animProgress : 0}%)`,
                            opacity: ['push', 'pull', 'subtree'].includes(activeCmd.animationType) ? 1 : 0.2,
                          }}
                        />
                      </div>
                    </div>

                    {/* ZONE 4: REMOTE GITLAB */}
                    <div
                      className={`canvas-zone-col zone-remote ${activeCmd.zonesActive.includes('remote') ? 'active-zone' : ''}`}
                    >
                      <div className="zone-header">
                        <span className="zone-tag">ZONE 4</span>
                        <h4 className="zone-title">GitLab Remote</h4>
                        <span className="zone-sub">origin / upstream</span>
                      </div>
                      <div className="zone-body">
                        <div className="remote-server-card">
                          <CloudIcon size={22} className="server-icon" />
                          <div className="server-info">
                            <span className="server-branch">origin/main</span>
                            <span className="server-url">gitlab.f1soft.com</span>
                          </div>
                        </div>

                        {activeCmd.animationType === 'push' && (
                          <div className="stream-badge push">
                            <span className="stream-dot" />
                            <span>Uploading commits to GitLab...</span>
                          </div>
                        )}

                        {activeCmd.animationType === 'pull' && (
                          <div className="stream-badge pull">
                            <span className="stream-dot" />
                            <span>Downloading latest team commits...</span>
                          </div>
                        )}

                        {activeCmd.animationType === 'subtree' && (
                          <div className="stream-badge subtree">
                            <span>🔄 Base Subtree Synchronized!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TERMINAL DISPLAY BOX */}
                <div className="git-terminal-card">
                  <div className="terminal-topbar">
                    <div className="terminal-dots">
                      <span className="dot dot-red" />
                      <span className="dot dot-yellow" />
                      <span className="dot dot-green" />
                    </div>
                    <span className="terminal-title">
                      <TerminalIcon size={12} /> REPOSITORY TERMINAL OUTPUT
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
                    </div>
                  </div>

                  <div className="terminal-body">
                    <div className="terminal-prompt-line">
                      <span className="term-prompt">$</span>
                      <span className="term-cmd">{activeCmd.cmd}</span>
                      <span className="term-cursor" />
                    </div>
                    <div className="terminal-subline">{activeCmd.shortDesc.toUpperCase()}</div>
                    <pre className="terminal-output-log">{activeCmd.output}</pre>
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
          </>
        )}

        {/* TAB 2: INTERACTIVE COMMIT TREE & DAG */}
        {activeTab === 'graph' && (
          <div className="git-tab-content-panel">
            <div className="graph-explainer-banner">
              <h3>Understanding the Git Commit DAG (Directed Acyclic Graph)</h3>
              <p>
                In Git, branches are simply lightweight pointers to commit objects. Commits link backwards to their parent commits.
              </p>
            </div>

            <div className="git-dag-full-visualizer">
              {/* MAIN BRANCH LINE */}
              <div className="dag-branch-row">
                <span className="branch-label main">main</span>
                <div className="dag-timeline">
                  <div className="timeline-node">
                    <span className="node-bubble">c1</span>
                    <span className="node-meta">Initial commit</span>
                  </div>
                  <div className="timeline-arrow">➔</div>
                  <div className="timeline-node">
                    <span className="node-bubble">c2</span>
                    <span className="node-meta">Setup routing</span>
                  </div>
                  <div className="timeline-arrow">➔</div>
                  <div className="timeline-node">
                    <span className="node-bubble">c3</span>
                    <span className="node-meta">Fix styling</span>
                  </div>
                  <div className="timeline-arrow">➔</div>
                  <div className="timeline-node merge-node">
                    <span className="node-bubble merge">c6 (Merge)</span>
                    <span className="node-meta">Merge MR #42</span>
                    <span className="tag-head">HEAD ➔ main</span>
                  </div>
                </div>
              </div>

              {/* FEATURE BRANCH LINE */}
              <div className="dag-branch-row feature-row">
                <span className="branch-label feat">feature/login</span>
                <div className="dag-timeline">
                  <div className="timeline-spacer" />
                  <div className="timeline-fork-curve">┌──</div>
                  <div className="timeline-node">
                    <span className="node-bubble feat">c4</span>
                    <span className="node-meta">Add auth API</span>
                  </div>
                  <div className="timeline-arrow">➔</div>
                  <div className="timeline-node">
                    <span className="node-bubble feat">c5</span>
                    <span className="node-meta">Add login form</span>
                  </div>
                  <div className="timeline-merge-curve">└───➔</div>
                </div>
              </div>

              {/* SUBTREE EMBEDDED BRANCH */}
              <div className="dag-branch-row subtree-row">
                <span className="branch-label subtree">projects/base-client (Subtree)</span>
                <div className="dag-timeline">
                  <div className="timeline-node subtree">
                    <span className="node-bubble sub">base-v2.3</span>
                    <span className="node-meta">Base client core</span>
                  </div>
                  <div className="timeline-arrow">➔</div>
                  <div className="timeline-node subtree">
                    <span className="node-bubble sub">base-v2.4</span>
                    <span className="node-meta">Squash merge into bank repo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dag-legend-grid">
              <div className="legend-card">
                <strong style={{ color: '#38bdf8' }}>HEAD Pointer</strong>
                <p>Indicates what branch/commit your working directory currently has checked out.</p>
              </div>
              <div className="legend-card">
                <strong style={{ color: '#a78bfa' }}>Fast-Forward Merge</strong>
                <p>If main has not moved since you branched, main pointer simply jumps forward with no merge commit.</p>
              </div>
              <div className="legend-card">
                <strong style={{ color: '#ec4899' }}>3-Way Merge Commit</strong>
                <p>If both main and feature had new commits, a merge commit (c6) is created with 2 parent commits.</p>
              </div>
              <div className="legend-card">
                <strong style={{ color: '#34d399' }}>Subtree Squash</strong>
                <p>Squashes upstream base commits into a single commit inside your bank project subfolder.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REAL WORLD RECIPES */}
        {activeTab === 'workflows' && (
          <div className="git-tab-content-panel">
            <div className="recipes-container">
              {WORKFLOW_RECIPES.map((recipe) => (
                <div key={recipe.id} className="recipe-card">
                  <div className="recipe-head">
                    <h3>{recipe.title}</h3>
                    <p>{recipe.desc}</p>
                  </div>
                  <div className="recipe-steps-list">
                    {recipe.steps.map((s) => (
                      <div key={s.step} className="recipe-step-item">
                        <div className="step-num-badge">{s.step}</div>
                        <div className="step-content-area">
                          <div className="step-title-text">{s.title}</div>
                          <div
                            className="step-cmd-box"
                            onClick={() => handleCopy(s.cmd, `recipe-${recipe.id}-${s.step}`)}
                            title="Click to copy command"
                          >
                            <code>$ {s.cmd}</code>
                            <button type="button" className="btn-copy-chip">
                              {copiedCmd === `recipe-${recipe.id}-${s.step}` ? (
                                <CheckIcon size={11} />
                              ) : (
                                <CopyIcon size={11} />
                              )}
                            </button>
                          </div>
                          <p className="step-explain-text">{s.explain}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CHEATSHEET TABLE */}
        {activeTab === 'cheatsheet' && (
          <div className="git-tab-content-panel">
            <div className="cheatsheet-table-container">
              <table className="cheatsheet-table">
                <thead>
                  <tr>
                    <th>Command</th>
                    <th>Category</th>
                    <th>What it does</th>
                    <th>When to run</th>
                    <th>Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {GIT_COMMANDS.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <code className="table-cmd">{c.cmd}</code>
                      </td>
                      <td>
                        <span className={`cmd-item-tag ${c.category}`}>{c.tag}</span>
                      </td>
                      <td>{c.shortDesc}</td>
                      <td style={{ color: '#94a3b8', fontSize: '12px' }}>{c.whenToUse}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-terminal-copy"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleCopy(c.cmd, `tbl-${c.id}`)}
                        >
                          {copiedCmd === `tbl-${c.id}` ? 'Copied!' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

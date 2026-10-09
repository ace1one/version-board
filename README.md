# gitClone

A local web app that shows, at a glance, the default-branch status of every GitLab project you care about — latest commit, latest tag, and a `package.json` version if present. It also has special support for projects that pull in a **base project via `git subtree`** (like `BankXP for Prabhu Bank` pulling `banksmart-client-web`), showing whether the subtree is up to date with the base project's `master` and, if not, how many commits behind and what they are.

## 1. Install

Requires Node.js 18+.

```bash
cd gitlab-version-tracker
npm install
```

## 2. Run

```bash
npm start
```

Then open **http://localhost:4545** in your browser.

## 3. Set up

On first load, the Settings panel opens automatically. Fill in:

- **GitLab base URL** — e.g. `https://gitlab-01.f1soft.com`
- **Personal Access Token** — create one under GitLab → *Preferences → Access Tokens* with the `read_api` scope. It's sent from your browser to the local server on each request and used to call GitLab; it's only saved in your browser's `localStorage` if you tick "Remember on this machine" (and even then, never leaves your machine — the Node server just proxies requests, it doesn't store anything to disk).
- **package.json path** — leave as `package.json` unless the file you want the version from lives somewhere else in the repo.
- **Projects** — click "+ Add project" for each GitLab project:
  - **Display name** — whatever label you want on the card.
  - **Project path** — the `namespace/project` path as it appears in the GitLab URL, e.g. `fonebank/prabhu-bankxp`.
  - **Normal** vs **Has subtree base** — pick "Has subtree base" for a project like BankXP that pulls in a base project via `git subtree`, and fill in:
    - **Subtree prefix** — e.g. `projects/base-client/`
    - **Base project path** — e.g. `fonebank/banksmart-client-web`

Click **Save & close** — the board refreshes automatically. Use **Refresh all** any time to re-pull the latest state.

## How the subtree check works

`git subtree add/pull --squash` writes a commit message like:

```
Squashed 'projects/base-client/' changes from a1b2c3d..e4f5a6b
```

The app scans the last 20 commits touching your subtree prefix for that pattern, pulls out the base commit SHA that was last squashed in, then compares it against the base project's current default-branch HEAD via GitLab's compare API. If they differ, it shows how many commits you're behind and lists them so you know what a `git subtree pull` would bring in.

If it can't find a squash commit in the last 20 commits touching that path (e.g. very deep history, or the prefix doesn't match), it'll say so on the card — you can widen the search by editing the `per_page=20` in `server.js`'s `getSubtreeStatus` if needed.

## Notes

- Nothing is sent anywhere except your GitLab instance — the Node server only proxies calls to `<gitlabUrl>/api/v4/...`.
- Your token is never written to disk on the server side.
- This is meant to be run locally on your own machine (`npm start`), not deployed publicly, since it accepts a raw PAT.

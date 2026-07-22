function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const params = new URLSearchParams(window.location.search);
const key = params.get('p');

const content = document.getElementById('detailContent');

function renderMissing() {
  document.getElementById('detailTitle').textContent = 'Project not found';
  content.innerHTML = `
    <div class="card status-error">
      <p class="error-text">
        No cached data for this project. Go back to the board and hit "Refresh all" first,
        then open "View details" again — this page reads from the last refresh, it doesn't
        re-query GitLab itself.
      </p>
    </div>`;
}

function renderDetail(r) {
  document.getElementById('detailTitle').textContent = r.label;
  document.getElementById('detailPath').textContent = r.key;

  if (!r.ok) {
    content.innerHTML = `<div class="card status-error"><p class="error-text">${escapeHtml(r.error)}</p></div>`;
    return;
  }

  let html = `
    <div class="card status-ok detail-card">
      <div class="subtree-title">Project</div>
      <div class="data-row"><span class="label">Branch</span><span class="value">${escapeHtml(r.defaultBranch || '—')}</span></div>
      <div class="data-row"><span class="label">Latest commit</span><span class="value">${escapeHtml(r.commitFullSha || r.commitSha || '—')}</span></div>
      <div class="data-row"><span class="label">Commit date</span><span class="value dim">${fmtDate(r.commitDate)}</span></div>
      <div class="data-row"><span class="label">Author</span><span class="value dim">${escapeHtml(r.commitAuthor || '—')}</span></div>
      <div class="data-row"><span class="label">Commit title</span><span class="value dim">${escapeHtml(r.commitTitle || '—')}</span></div>
      <div class="data-row"><span class="label">Latest tag</span><span class="value">${escapeHtml(r.latestTag || '—')}</span></div>
      <div class="data-row"><span class="label">package.json ver.</span><span class="value">${escapeHtml(r.packageVersion || '—')}</span></div>
      <div class="card-footer"><a class="card-link" href="${r.webUrl || '#'}" target="_blank" rel="noopener">open in gitlab →</a></div>
    </div>
  `;

  if (r.subtree) {
    if (r.subtree.error) {
      html += `
        <div class="card status-warn detail-card">
          <div class="subtree-title">Base subtree</div>
          <p class="error-text">${escapeHtml(r.subtree.error)}</p>
        </div>`;
    } else {
      const st = r.subtree;
      let statusHtml;
      if (st.upToDate === true) {
        statusHtml = '<span style="color:var(--accent)">up to date</span>';
      } else if (st.upToDate === false) {
        statusHtml = st.behindCount != null
          ? `<span style="color:var(--warn)">${st.behindCount} commit(s) behind</span>`
          : `<span style="color:var(--warn)">out of date</span>`;
      } else {
        statusHtml = '<span class="dim">unknown (couldn\'t read a version)</span>';
      }
      html += `
        <div class="card ${st.upToDate === false ? 'status-warn' : 'status-ok'} detail-card">
          <div class="subtree-title">Base subtree · ${escapeHtml(st.baseProjectPath)}</div>
          <div class="data-row"><span class="label">Pulled version</span><span class="value">${escapeHtml(st.pulledVersion || '—')}</span></div>
          <div class="data-row"><span class="label">Latest base version</span><span class="value">${escapeHtml(st.baseLatestVersion || '—')}</span></div>
          <div class="data-row"><span class="label">Status</span><span class="value">${statusHtml}</span></div>
          <div class="divider"></div>
          <div class="data-row"><span class="label">Pulled SHA</span><span class="value">${escapeHtml(st.pulledSha || '—')}</span></div>
          <div class="data-row"><span class="label">Pulled on</span><span class="value dim">${fmtDate(st.pulledAt)}</span></div>
          <div class="data-row"><span class="label">Pulled commit title</span><span class="value dim">${escapeHtml(st.pulledCommitTitle || '—')}</span></div>
          <div class="divider"></div>
          <div class="data-row"><span class="label">Base default branch</span><span class="value">${escapeHtml(st.baseDefaultBranch || '—')}</span></div>
          <div class="data-row"><span class="label">Base HEAD SHA</span><span class="value">${escapeHtml(st.baseLatestSha || '—')}</span></div>
          <div class="data-row"><span class="label">Base HEAD date</span><span class="value dim">${fmtDate(st.baseLatestDate)}</span></div>
          ${st.squashCommitNote ? `<p class="error-text" style="margin-top:10px;">${escapeHtml(st.squashCommitNote)}</p>` : ''}
          ${st.behindCommits && st.behindCommits.length ? `
            <div class="subtree-title" style="margin-top:14px;">Commits not yet pulled</div>
            <div class="behind-list behind-list-full">
              ${st.behindCommits.map(c => `
                <div class="behind-commit">
                  <span class="sha">${escapeHtml(c.sha)}</span>
                  <span class="behind-title">${escapeHtml(c.title)}</span>
                  <span class="behind-meta">${escapeHtml(c.author || '')} · ${fmtDate(c.date)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>`;
    }
  }

  content.innerHTML = html;
}

(function init() {
  if (!key) { renderMissing(); return; }
  let results = [];
  try {
    results = JSON.parse(sessionStorage.getItem('vb_last_results') || '[]');
  } catch (e) {
    results = [];
  }
  const match = results.find((r) => r.key === key);
  if (!match) { renderMissing(); return; }
  renderDetail(match);
})();
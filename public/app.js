// const STORAGE_KEY = 'vb_config_v1';

// const el = (id) => document.getElementById(id);

// const state = {
//   gitlabUrl: '',
//   token: '',
//   rememberToken: false,
//   packageJsonPath: 'package.json',
//   projects: [], // {name, path, type, subtreePath, basePath}
// };

// function loadConfig() {
//   try {
//     const raw = localStorage.getItem(STORAGE_KEY);
//     if (!raw) return;
//     const parsed = JSON.parse(raw);
//     Object.assign(state, parsed);
//     if (!state.rememberToken) state.token = ''; // never persist token unless opted in
//   } catch (e) {
//     console.warn('Failed to load config', e);
//   }
// }

// function saveConfig() {
//   const toStore = { ...state };
//   if (!state.rememberToken) toStore.token = '';
//   localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
// }

// // ---------- Settings drawer ----------

// function openSettings() {
//   el('gitlabUrl').value = state.gitlabUrl || '';
//   el('gitlabToken').value = state.token || '';
//   el('rememberToken').checked = !!state.rememberToken;
//   el('packageJsonPath').value = state.packageJsonPath || 'package.json';
//   renderProjectRows();
//   el('testConnResult').textContent = '';
//   el('settingsOverlay').classList.remove('hidden');
// }

// function closeSettings() {
//   el('settingsOverlay').classList.add('hidden');
// }

// function renderProjectRows() {
//   const list = el('projectList');
//   list.innerHTML = '';
//   state.projects.forEach((p, idx) => {
//     const tpl = el('projectRowTpl').content.cloneNode(true);
//     const row = tpl.querySelector('.project-row');
//     row.dataset.idx = idx;

//     row.querySelector('.p-name').value = p.name || '';
//     row.querySelector('.p-path').value = p.path || '';
//     const typeRadios = row.querySelectorAll('.p-type');
//     typeRadios.forEach((r) => {
//       r.name = `type-${idx}`;
//       r.checked = r.value === (p.type || 'normal');
//     });
//     const subtreeBlock = row.querySelector('.project-row-subtree');
//     subtreeBlock.classList.toggle('hidden', (p.type || 'normal') !== 'subtree');
//     row.querySelector('.p-subtreePath').value = p.subtreePath || '';
//     row.querySelector('.p-basePath').value = p.basePath || '';

//     typeRadios.forEach((r) => {
//       r.addEventListener('change', () => {
//         subtreeBlock.classList.toggle('hidden', r.value !== 'subtree' || !r.checked);
//       });
//     });

//     row.querySelector('.p-remove').addEventListener('click', () => {
//       state.projects.splice(idx, 1);
//       renderProjectRows();
//     });

//     list.appendChild(row);
//   });
// }

// function collectProjectRowsFromDOM() {
//   const rows = Array.from(document.querySelectorAll('.project-row'));
//   return rows.map((row) => {
//     const type = row.querySelector('.p-type:checked')?.value || 'normal';
//     return {
//       name: row.querySelector('.p-name').value.trim(),
//       path: row.querySelector('.p-path').value.trim(),
//       type,
//       subtreePath: row.querySelector('.p-subtreePath').value.trim(),
//       basePath: row.querySelector('.p-basePath').value.trim(),
//     };
//   }).filter((p) => p.path);
// }

// el('btnSettings').addEventListener('click', openSettings);
// el('btnCloseSettings').addEventListener('click', closeSettings);
// el('btnAddFirst').addEventListener('click', openSettings);

// el('btnAddProject').addEventListener('click', () => {
//   state.projects.push({ name: '', path: '', type: 'normal', subtreePath: '', basePath: '' });
//   renderProjectRows();
// });

// el('btnTestConn').addEventListener('click', async () => {
//   const gitlabUrl = el('gitlabUrl').value.trim();
//   const token = el('gitlabToken').value.trim();
//   const resultEl = el('testConnResult');
//   resultEl.textContent = 'Testing…';
//   resultEl.className = 'test-result';
//   try {
//     const res = await fetch('/api/test-connection', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ gitlabUrl, token }),
//     });
//     const data = await res.json();
//     if (data.ok) {
//       resultEl.textContent = `Connected as ${data.user.username}`;
//       resultEl.className = 'test-result ok';
//     } else {
//       resultEl.textContent = data.error || 'Failed';
//       resultEl.className = 'test-result err';
//     }
//   } catch (e) {
//     resultEl.textContent = e.message;
//     resultEl.className = 'test-result err';
//   }
// });

// el('btnSaveSettings').addEventListener('click', () => {
//   state.gitlabUrl = el('gitlabUrl').value.trim();
//   state.token = el('gitlabToken').value.trim();
//   state.rememberToken = el('rememberToken').checked;
//   state.packageJsonPath = el('packageJsonPath').value.trim() || 'package.json';
//   state.projects = collectProjectRowsFromDOM();
//   saveConfig();
//   closeSettings();
//   refreshAll();
// });

// // ---------- Board rendering ----------

// function fmtDate(iso) {
//   if (!iso) return '—';
//   const d = new Date(iso);
//   return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
//     ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
// }

// function cardStatusClass(result) {
//   if (!result.ok) return 'status-error';
//   if (result.subtree) {
//     if (result.subtree.error) return 'status-warn';
//     if (!result.subtree.upToDate) return 'status-warn';
//   }
//   return 'status-ok';
// }

// function renderBoard(results) {
//   const board = el('board');
//   board.innerHTML = '';
//   board.classList.remove('hidden');
//   el('emptyState').classList.add('hidden');

//   results.forEach((r) => {
//     const card = document.createElement('div');
//     card.className = `card ${cardStatusClass(r)}`;

//     if (!r.ok) {
//       card.innerHTML = `
//         <div class="card-head">
//           <div>
//             <p class="card-title">${escapeHtml(r.label)}</p>
//             <p class="card-path">${escapeHtml(r.key)}</p>
//           </div>
//           <span class="status-pill error">error</span>
//         </div>
//         <p class="error-text">${escapeHtml(r.error)}</p>
//       `;
//       board.appendChild(card);
//       return;
//     }

//     let subtreeHtml = '';
//     if (r.subtree) {
//       if (r.subtree.error) {
//         subtreeHtml = `
//           <div class="subtree-block">
//             <div class="subtree-title">Base subtree</div>
//             <p class="error-text">${escapeHtml(r.subtree.error)}</p>
//           </div>`;
//       } else {
//         const st = r.subtree;
//         subtreeHtml = `
//           <div class="subtree-block">
//             <div class="subtree-title">Base subtree · ${escapeHtml(st.baseProjectPath)}</div>
//             <div class="data-row"><span class="label">Pulled SHA</span><span class="value">${escapeHtml((st.pulledSha || '').slice(0, 10))}</span></div>
//             <div class="data-row"><span class="label">Pulled on</span><span class="value dim">${fmtDate(st.pulledAt)}</span></div>
//             <div class="data-row"><span class="label">Base HEAD</span><span class="value">${escapeHtml((st.baseLatestSha || '').slice(0, 10))}</span></div>
//             <div class="data-row"><span class="label">Base HEAD date</span><span class="value dim">${fmtDate(st.baseLatestDate)}</span></div>
//             <div class="data-row"><span class="label">Status</span><span class="value">${
//               st.upToDate
//                 ? '<span style="color:var(--accent)">up to date</span>'
//                 : `<span style="color:var(--warn)">${st.behindCount ?? '?'} commit(s) behind</span>`
//             }</span></div>
//             ${st.behindCommits && st.behindCommits.length ? `
//               <div class="behind-list">
//                 ${st.behindCommits.map(c => `
//                   <div class="behind-commit">
//                     <span class="sha">${escapeHtml(c.sha)}</span>
//                     <span>${escapeHtml(c.title)}</span>
//                   </div>
//                 `).join('')}
//               </div>
//             ` : ''}
//           </div>`;
//       }
//     }

//     card.innerHTML = `
//       <div class="card-head">
//         <div>
//           <p class="card-title">${escapeHtml(r.label)}</p>
//           <p class="card-path">${escapeHtml(r.key)}</p>
//         </div>
//         <span class="status-pill ${cardStatusClass(r) === 'status-ok' ? 'ok' : cardStatusClass(r) === 'status-warn' ? 'warn' : 'error'}">
//           ${cardStatusClass(r) === 'status-ok' ? 'ok' : cardStatusClass(r) === 'status-warn' ? 'attention' : 'error'}
//         </span>
//       </div>
//       <div class="card-body">
//         <div class="data-row"><span class="label">Branch</span><span class="value">${escapeHtml(r.defaultBranch || '—')}</span></div>
//         <div class="data-row"><span class="label">Latest commit</span><span class="value">${escapeHtml(r.commitSha || '—')}</span></div>
//         <div class="data-row"><span class="label">Commit date</span><span class="value dim">${fmtDate(r.commitDate)}</span></div>
//         <div class="data-row"><span class="label">Author</span><span class="value dim">${escapeHtml(r.commitAuthor || '—')}</span></div>
//         <div class="data-row"><span class="label">Latest tag</span><span class="value">${escapeHtml(r.latestTag || '—')}</span></div>
//         <div class="data-row"><span class="label">package.json ver.</span><span class="value">${escapeHtml(r.packageVersion || '—')}</span></div>
//         ${subtreeHtml}
//       </div>
//       <div class="card-footer">
//         <a class="card-link" href="${r.webUrl || '#'}" target="_blank" rel="noopener">open in gitlab →</a>
//       </div>
//     `;
//     board.appendChild(card);
//   });
// }

// function escapeHtml(str) {
//   if (str === null || str === undefined) return '';
//   return String(str)
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/"/g, '&quot;');
// }

// async function refreshAll() {
//   if (!state.gitlabUrl || !state.token || state.projects.length === 0) {
//     el('board').classList.add('hidden');
//     el('emptyState').classList.remove('hidden');
//     return;
//   }

//   el('connStatus').textContent = 'loading…';
//   el('connStatus').className = 'conn-status';

//   try {
//     const res = await fetch('/api/check-all', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         gitlabUrl: state.gitlabUrl,
//         token: state.token,
//         projects: state.projects,
//         packageJsonPath: state.packageJsonPath,
//       }),
//     });
//     const data = await res.json();
//     if (data.error) throw new Error(data.error);
//     renderBoard(data.results);
//     el('connStatus').textContent = `${data.results.length} project(s) · updated ${new Date().toLocaleTimeString()}`;
//     el('connStatus').className = 'conn-status ok';
//   } catch (e) {
//     el('connStatus').textContent = 'error: ' + e.message;
//     el('connStatus').className = 'conn-status err';
//   }
// }

// el('btnRefresh').addEventListener('click', refreshAll);

// // ---------- Init ----------

// loadConfig();
// if (!state.gitlabUrl || state.projects.length === 0) {
//   el('emptyState').classList.remove('hidden');
//   // auto-open settings on very first run
//   if (state.projects.length === 0) openSettings();
// } else {
//   refreshAll();
// }

const STORAGE_KEY = 'vb_config_v1';

const el = (id) => document.getElementById(id);

const state = {
  gitlabUrl: '',
  token: '',
  rememberToken: false,
  packageJsonPath: 'package.json',
  projects: [], // {name, path, type, subtreePath, basePath}
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
    if (!state.rememberToken) state.token = ''; // never persist token unless opted in
  } catch (e) {
    console.warn('Failed to load config', e);
  }
}

function saveConfig() {
  const toStore = { ...state };
  if (!state.rememberToken) toStore.token = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

// ---------- Settings drawer ----------

function openSettings() {
  el('gitlabUrl').value = state.gitlabUrl || '';
  el('gitlabToken').value = state.token || '';
  el('rememberToken').checked = !!state.rememberToken;
  el('packageJsonPath').value = state.packageJsonPath || 'package.json';
  renderProjectRows();
  el('testConnResult').textContent = '';
  el('settingsOverlay').classList.remove('hidden');
}

function closeSettings() {
  el('settingsOverlay').classList.add('hidden');
}

function renderProjectRows() {
  const list = el('projectList');
  list.innerHTML = '';
  state.projects.forEach((p, idx) => {
    const tpl = el('projectRowTpl').content.cloneNode(true);
    const row = tpl.querySelector('.project-row');
    row.dataset.idx = idx;

    row.querySelector('.p-name').value = p.name || '';
    row.querySelector('.p-path').value = p.path || '';

    row.querySelector('.p-remove').addEventListener('click', () => {
      state.projects.splice(idx, 1);
      renderProjectRows();
    });

    list.appendChild(row);
  });
}

function collectProjectRowsFromDOM() {
  const rows = Array.from(document.querySelectorAll('.project-row'));
  return rows.map((row) => {
    return {
      name: row.querySelector('.p-name').value.trim(),
      path: row.querySelector('.p-path').value.trim(),
      type: 'normal',
    };
  }).filter((p) => p.path);
}

el('btnSettings').addEventListener('click', openSettings);
el('btnCloseSettings').addEventListener('click', closeSettings);
el('btnAddFirst').addEventListener('click', openSettings);

el('btnAddProject').addEventListener('click', () => {
  state.projects.push({ name: '', path: '', type: 'normal', subtreePath: '', basePath: '' });
  renderProjectRows();
});

el('btnTestConn').addEventListener('click', async () => {
  const gitlabUrl = el('gitlabUrl').value.trim();
  const token = el('gitlabToken').value.trim();
  const resultEl = el('testConnResult');
  resultEl.textContent = 'Testing…';
  resultEl.className = 'test-result';
  try {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gitlabUrl, token }),
    });
    const data = await res.json();
    if (data.ok) {
      resultEl.textContent = `Connected as ${data.user.username}`;
      resultEl.className = 'test-result ok';
    } else {
      resultEl.textContent = data.error || 'Failed';
      resultEl.className = 'test-result err';
    }
  } catch (e) {
    resultEl.textContent = e.message;
    resultEl.className = 'test-result err';
  }
});

el('btnSaveSettings').addEventListener('click', () => {
  state.gitlabUrl = el('gitlabUrl').value.trim();
  state.token = el('gitlabToken').value.trim();
  state.rememberToken = el('rememberToken').checked;
  state.packageJsonPath = el('packageJsonPath').value.trim() || 'package.json';
  state.projects = collectProjectRowsFromDOM();
  saveConfig();
  closeSettings();
  refreshAll();
});

// ---------- Board rendering ----------

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function cardStatusClass(result) {
  if (!result.ok) return 'status-error';
  if (result.subtree) {
    if (result.subtree.error) return 'status-warn';
    if (result.subtree.upToDate === false) return 'status-warn';
  }
  return 'status-ok';
}

function renderBoard(results) {
  const board = el('board');
  board.innerHTML = '';
  board.classList.remove('hidden');
  el('emptyState').classList.add('hidden');

  results.forEach((r) => {
    const card = document.createElement('div');
    card.className = `card ${cardStatusClass(r)}`;

    if (!r.ok) {
      card.innerHTML = `
        <div class="card-head">
          <div>
            <p class="card-title">${escapeHtml(r.label)}</p>
            <p class="card-path">${escapeHtml(r.key)}</p>
          </div>
          <span class="status-pill error">error</span>
        </div>
        <p class="error-text">${escapeHtml(r.error)}</p>
      `;
      board.appendChild(card);
      return;
    }

    let subtreeHtml = '';
    if (r.subtree) {
      if (r.subtree.error) {
        subtreeHtml = `
          <div class="subtree-block">
            <div class="subtree-title">Base subtree</div>
            <p class="error-text">${escapeHtml(r.subtree.error)}</p>
          </div>`;
      } else {
        const st = r.subtree;
        const baseVersionLabel = st.pulledVersion || '—';
        let statusHtml;
        if (st.upToDate === true) {
          statusHtml = '<span style="color:var(--accent)">up to date</span>';
        } else if (st.upToDate === false) {
          statusHtml = st.behindCount != null
            ? `<span style="color:var(--warn)">${st.behindCount} commit(s) behind</span>`
            : `<span style="color:var(--warn)">out of date (${escapeHtml(st.baseLatestVersion || '?')} available)</span>`;
        } else {
          statusHtml = '<span class="dim">unknown (couldn\'t read a version)</span>';
        }
        subtreeHtml = `
          <div class="subtree-block">
            <div class="subtree-title-row">
              <div class="subtree-title">Base subtree · ${escapeHtml(st.baseProjectPath)}</div>
              <button type="button" class="subtree-detail-btn" data-detail-key="${escapeHtml(r.key)}">Details</button>
            </div>
            <div class="data-row"><span class="label">Base client version</span><span class="value">${escapeHtml(baseVersionLabel)}</span></div>
            <div class="data-row"><span class="label">Latest base version</span><span class="value">${escapeHtml(st.baseLatestVersion || '—')}</span></div>
            <div class="data-row"><span class="label">Status</span><span class="value">${statusHtml}</span></div>
          </div>`;
      }
    }

    card.innerHTML = `
      <div class="card-head">
        <div>
          <p class="card-title">${escapeHtml(r.label)}</p>
          <p class="card-path">${escapeHtml(r.key)}</p>
        </div>
        <span class="status-pill ${cardStatusClass(r) === 'status-ok' ? 'ok' : cardStatusClass(r) === 'status-warn' ? 'warn' : 'error'}">
          ${cardStatusClass(r) === 'status-ok' ? 'ok' : cardStatusClass(r) === 'status-warn' ? 'attention' : 'error'}
        </span>
      </div>
      <div class="card-body">
        <div class="data-row"><span class="label">Branch</span><span class="value">${escapeHtml(r.defaultBranch || '—')}</span></div>
        <div class="data-row"><span class="label">Latest commit</span><span class="value">${escapeHtml(r.commitSha || '—')}</span></div>
        <div class="data-row"><span class="label">Commit date</span><span class="value dim">${fmtDate(r.commitDate)}</span></div>
        <div class="data-row"><span class="label">Author</span><span class="value dim">${escapeHtml(r.commitAuthor || '—')}</span></div>
        <div class="data-row"><span class="label">Latest tag</span><span class="value">${escapeHtml(r.latestTag || '—')}</span></div>
        <div class="data-row"><span class="label">package.json ver.</span><span class="value">${escapeHtml(r.packageVersion || '—')}</span></div>
        ${subtreeHtml}
      </div>
      <div class="card-footer">
        <a class="card-link" href="${r.webUrl || '#'}" target="_blank" rel="noopener">open in gitlab →</a>
      </div>
    `;
    board.appendChild(card);
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function refreshAll() {
  if (!state.gitlabUrl || !state.token || state.projects.length === 0) {
    el('board').classList.add('hidden');
    el('emptyState').classList.remove('hidden');
    return;
  }

  el('connStatus').textContent = 'loading…';
  el('connStatus').className = 'conn-status';

  try {
    const res = await fetch('/api/check-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gitlabUrl: state.gitlabUrl,
        token: state.token,
        projects: state.projects,
        packageJsonPath: state.packageJsonPath,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    sessionStorage.setItem('vb_last_results', JSON.stringify(data.results));
    renderBoard(data.results);
    el('connStatus').textContent = `${data.results.length} project(s) · updated ${new Date().toLocaleTimeString()}`;
    el('connStatus').className = 'conn-status ok';
  } catch (e) {
    el('connStatus').textContent = 'error: ' + e.message;
    el('connStatus').className = 'conn-status err';
  }
}

el('btnRefresh').addEventListener('click', refreshAll);

el('board').addEventListener('click', (e) => {
  const btn = e.target.closest('.subtree-detail-btn');
  if (!btn) return;
  e.preventDefault();
  const key = btn.dataset.detailKey;
  window.location.href = `detail/detail.html?p=${encodeURIComponent(key)}`;
});

// ---------- Init ----------

loadConfig();
if (!state.gitlabUrl || state.projects.length === 0) {
  el('emptyState').classList.remove('hidden');
  // auto-open settings on very first run
  if (state.projects.length === 0) openSettings();
} else {
  refreshAll();
}
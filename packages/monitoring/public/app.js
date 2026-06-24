// ── State ──────────────────────────────────────────────────
let currentData = { checks: [], states: {}, summary: { total: 0, up: 0, down: 0, warning: 0, unknown: 0, lastRun: null } };
let responseChart = null;
let refreshTimer = null;

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchStatus();
  startAutoRefresh();
  lucide.createIcons();
});

// ── Theme ─────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    lucide.createIcons();
  }
}

// ── Fetch ─────────────────────────────────────────────────
async function fetchStatus() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'flex';
  renderSkeletons(); // Show skeletons immediately

  try {
    const res = await fetch('/api/status');
    currentData = await res.json();
    updateSummary();
    renderChecks();
  } catch (err) {
    console.error('Failed to fetch status:', err);
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

async function fetchIncidents() {
  try {
    const res = await fetch('/api/incidents');
    const incidents = await res.json();
    renderIncidents(incidents);
  } catch (err) { console.error(err); }
}

async function fetchAlerts() {
  try {
    const res = await fetch('/api/alerts');
    const alerts = await res.json();
    renderAlerts(alerts);
  } catch (err) { console.error(err); }
}

async function fetchHistory() {
  try {
    const res = await fetch('/api/history?hours=24');
    const history = await res.json();
    renderChart(history);
  } catch (err) { console.error(err); }
}

async function fetchLogs() {
  try {
    const res = await fetch('/api/logs');
    const logs = await res.json();
    renderLogs(logs);
  } catch (err) { console.error(err); }
}

// ── Summary ───────────────────────────────────────────────
function updateSummary() {
  const s = currentData.summary;
  document.getElementById('totalCount').textContent = s.total;
  document.getElementById('upCount').textContent = s.up;
  document.getElementById('downCount').textContent = s.down;
  document.getElementById('warnCount').textContent = s.warning + s.unknown;
  document.getElementById('lastRun').textContent = s.lastRun
    ? `Last run: ${new Date(s.lastRun).toLocaleTimeString()}`
    : 'Not run yet';
}

// ── Skeletons ─────────────────────────────────────────────
function renderSkeletons() {
  const grid = document.getElementById('checksGrid');
  let html = '';
  // Show 4 mock groups of skeletons to look realistic
  for(let i=0; i<4; i++) {
    html += `<div class="group-section">`;
    html += `<div class="skeleton skeleton-title"></div>`;
    html += `<div class="checks-grid">`;
    for(let j=0; j<3; j++) {
      html += `
        <div class="check-card" style="border:1px solid var(--border);">
          <div class="skeleton skeleton-title" style="width: 40%"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 60%"></div>
        </div>`;
    }
    html += `</div></div>`;
  }
  grid.innerHTML = html;
}

// ── Render Checks ─────────────────────────────────────────

// Global state to track which groups are expanded
const expandedGroups = new Set();

function renderChecks() {
  const grid = document.getElementById('checksGrid');
  const groupFilter = document.getElementById('filterGroup').value;
  const statusFilter = document.getElementById('filterStatus').value;

  let checks = currentData.checks || [];
  if (groupFilter !== 'all') checks = checks.filter(c => c.group === groupFilter);
  if (statusFilter !== 'all') checks = checks.filter(c => c.status === statusFilter);

  // Group by service group
  const groups = {};
  const groupOrder = ['backend-health', 'feature-api', 'frontend-api', 'database', 'redis', 's3', 'ec2', 'dns-tls'];
  checks.forEach(c => {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  });

  const groupLabels = {
    'backend-health': '<i data-lucide="server" style="width:16px;height:16px;"></i> Backend Health',
    'feature-api': '<i data-lucide="activity" style="width:16px;height:16px;"></i> Feature API Probes',
    'frontend-api': '<i data-lucide="layout-template" style="width:16px;height:16px;"></i> Frontend API Probes',
    'database': '<i data-lucide="database" style="width:16px;height:16px;"></i> Database (NeonDB)',
    'redis': '<i data-lucide="box" style="width:16px;height:16px;"></i> Redis',
    's3': '<i data-lucide="cloud" style="width:16px;height:16px;"></i> AWS S3',
    'ec2': '<i data-lucide="monitor" style="width:16px;height:16px;"></i> EC2 Instance',
    'dns-tls': '<i data-lucide="globe" style="width:16px;height:16px;"></i> DNS & TLS',
  };

  window.toggleGroupExpand = function(groupId) {
    if (expandedGroups.has(groupId)) expandedGroups.delete(groupId);
    else expandedGroups.add(groupId);
    renderChecks(); // re-render to apply the expansion
  };

  let html = '';
  groupOrder.forEach(g => {
    if (!groups[g] || groups[g].length === 0) return;
    
    // Sort failed checks to the top
    const groupChecks = groups[g].sort((a, b) => {
      const aFail = a.status !== 'UP' ? 1 : 0;
      const bFail = b.status !== 'UP' ? 1 : 0;
      return bFail - aFail; 
    });

    const up = groupChecks.filter(c => c.status === 'UP').length;
    const isExpanded = expandedGroups.has(g);
    
    // Limit to 6 by default
    const limit = 6;
    const visibleChecks = isExpanded ? groupChecks : groupChecks.slice(0, limit);
    const hiddenCount = groupChecks.length - visibleChecks.length;

    html += `<div class="group-section">`;
    html += `
      <div class="group-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span style="display:flex;align-items:center;gap:8px;">
          ${groupLabels[g] || g} 
          <span style="font-size:0.75rem;color:var(--text-dim);font-weight:500;text-transform:none;">(${up}/${groupChecks.length} up)</span>
        </span>
        ${hiddenCount > 0 || isExpanded ? `<button class="btn btn-secondary" onclick="toggleGroupExpand('${g}')" style="padding:4px 8px;font-size:0.7rem;"><i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width:14px;height:14px;"></i></button>` : ''}
      </div>
    `;
    
    html += `<div class="checks-grid">`;
    visibleChecks.forEach(c => {
      const safeId = CSS.escape(c.id);
      html += `
        <div class="check-card status-${c.status}" style="cursor:pointer;" onclick="showCheckDetail('${escAttr(c.id)}')">
          <div class="check-header">
            <span class="check-name">${c.name}</span>
            <span class="check-status ${c.status}" style="display:flex;align-items:center;gap:4px;">${statusIcon(c.status)} ${c.status}</span>
          </div>
          <div class="check-msg" title="${escHtml(c.message)}">${escHtml(truncate(c.message, 120))}</div>
          <div class="check-meta">
            <span>${c.responseTimeMs}ms</span>
            <span>${new Date(c.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>`;
    });
    html += `</div>`;

    if (!isExpanded && hiddenCount > 0) {
      html += `
        <button class="view-more-btn" onclick="toggleGroupExpand('${g}')">
          <i data-lucide="chevron-down" style="width:16px;height:16px;"></i> Show ${hiddenCount} more checks
        </button>
      `;
    }

    html += `</div>`;
  });

  grid.innerHTML = html || '<p style="color: var(--text-dim); text-align: center; padding: 40px;">No checks matching filter</p>';
  lucide.createIcons();
}

// ── Render Incidents ──────────────────────────────────────
function renderIncidents(incidents) {
  const tbody = document.querySelector('#incidentsTable tbody');
  if (!incidents.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);">No incidents recorded</td></tr>';
    return;
  }
  tbody.innerHTML = incidents.slice().reverse().map(inc => `
    <tr>
      <td>${new Date(inc.timestamp).toLocaleString()}</td>
      <td>${escHtml(inc.checkName)}</td>
      <td>${inc.group}</td>
      <td>${statusIconHtml(inc.from)} ${inc.from} → ${statusIconHtml(inc.to)} ${inc.to}</td>
      <td>${escHtml(inc.message)}</td>
    </tr>
  `).join('');
  lucide.createIcons();
}

// ── Render Alerts ─────────────────────────────────────────
function renderAlerts(alerts) {
  const tbody = document.querySelector('#alertsTable tbody');
  if (!alerts.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);">No alerts sent</td></tr>';
    return;
  }
  tbody.innerHTML = alerts.slice().reverse().map(a => `
    <tr>
      <td>${new Date(a.timestamp).toLocaleString()}</td>
      <td>${escHtml(a.checkName)}</td>
      <td>${severityBadge(a.severity)}</td>
      <td>${a.type === 'FAILURE' ? '<span style="color:var(--red);display:flex;align-items:center;gap:4px;"><i data-lucide="alert-circle" style="width:14px;height:14px;"></i> FAILURE</span>' : '<span style="color:var(--green);display:flex;align-items:center;gap:4px;"><i data-lucide="check-circle-2" style="width:14px;height:14px;"></i> RECOVERY</span>'}</td>
      <td>${escHtml(a.subject)}</td>
    </tr>
  `).join('');
  lucide.createIcons();
}

// ── Render Logs ───────────────────────────────────────────
function renderLogs(logsData) {
  const container = document.getElementById('logsContainer');
  if (!container) return;

  if (Object.keys(logsData).length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:20px;">No EC2 logs available yet (they are fetched every 15 mins)</p>';
    return;
  }

  let html = '';
  for (const [svc, data] of Object.entries(logsData)) {
    html += `
      <div style="margin-bottom: 24px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
        <div style="padding: 10px 14px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
          <strong style="color: var(--accent);">${svc}</strong>
          <span style="font-size: 0.8rem; color: var(--text-dim);">${new Date(data.timestamp).toLocaleString()}</span>
        </div>
        <pre style="padding: 14px; font-size: 0.8rem; color: #a8b2d1; overflow-x: auto; max-height: 400px; overflow-y: auto; white-space: pre-wrap; margin: 0; font-family: monospace;">${escHtml(data.logs || data.error || 'No logs found')}</pre>
      </div>
    `;
  }
  container.innerHTML = html;
}

// ── Render Chart ──────────────────────────────────────────
function renderChart(history) {
  const canvas = document.getElementById('responseChart');
  if (responseChart) responseChart.destroy();

  // Group by checkId, pick top 10 most-checked
  const byCheck = {};
  history.forEach(h => {
    if (!byCheck[h.checkId]) byCheck[h.checkId] = [];
    byCheck[h.checkId].push(h);
  });

  const topChecks = Object.entries(byCheck)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8);

  const colors = ['#ededed', '#17c964', '#f31260', '#f5a524', '#06b6d4', '#f97316', '#a855f7', '#ec4899'];

  const datasets = topChecks.map(([id, entries], i) => ({
    label: id,
    data: entries.map(e => ({ x: new Date(e.timestamp), y: e.responseTimeMs })),
    borderColor: colors[i % colors.length],
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 1,
    tension: 0.3,
  }));

  responseChart = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      scales: {
        x: { type: 'timeseries', time: { unit: 'hour' }, ticks: { color: '#a1a1aa' }, grid: { color: '#333333' } },
        y: { title: { display: true, text: 'Response Time (ms)', color: '#a1a1aa' }, ticks: { color: '#a1a1aa' }, grid: { color: '#333333' } },
      },
      plugins: {
        legend: { labels: { color: '#ededed', font: { size: 11, family: 'Inter' } } },
      },
    },
  });
}

// ── Tabs ──────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));

  if (name === 'incidents') fetchIncidents();
  if (name === 'alerts') fetchAlerts();
  if (name === 'chart') fetchHistory();
  if (name === 'logs') fetchLogs();
}

// ── Actions ──────────────────────────────────────────────
async function triggerCheck() {
  const btn = document.getElementById('runNow');
  btn.textContent = '⏳ Running...';
  btn.disabled = true;
  try {
    await fetch('/api/check/run', { method: 'POST' });
    await fetchStatus();
  } catch (err) { console.error(err); }
  btn.textContent = '⚡ Run Now';
  btn.disabled = false;
}

async function exportCSV() {
  try {
    const res = await fetch('/api/export/csv?hours=24');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monitoring-history.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Failed to export CSV', err);
  }
}

// ── Auto Refresh ─────────────────────────────────────────
function startAutoRefresh() {
  // 15 minutes interval = 900000 ms (matching backend check interval)
  refreshTimer = setInterval(() => {
    if (document.getElementById('autoRefresh').checked) {
      fetchStatus();
      const activeTab = document.querySelector('.tab.active').dataset.tab;
      if (activeTab === 'logs') fetchLogs();
      if (activeTab === 'chart') fetchHistory();
    }
  }, 900000);
}

function statusIcon(s) {
  const map = {
    UP: '<i data-lucide="check-circle-2" style="width:14px;height:14px;color:currentColor;"></i>',
    DOWN: '<i data-lucide="x-circle" style="width:14px;height:14px;color:currentColor;"></i>',
    WARNING: '<i data-lucide="alert-triangle" style="width:14px;height:14px;color:currentColor;"></i>',
    UNKNOWN: '<i data-lucide="help-circle" style="width:14px;height:14px;color:currentColor;"></i>'
  };
  return map[s] || map.UNKNOWN;
}

function statusIconHtml(s) {
  return statusIcon(s);
}

function severityBadge(s) {
  const colors = { CRITICAL: 'var(--red)', WARNING: 'var(--yellow)', NOTICE: '#f97316' };
  return `<span style="color:${colors[s] || 'var(--text-dim)'};font-weight:600;">${s}</span>`;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function truncate(str, len) {
  if (!str || str.length <= len) return str || '';
  return str.substring(0, len) + '…';
}

// ── Check Detail Modal ───────────────────────────────────
async function showCheckDetail(checkId) {
  const check = (currentData.checks || []).find(c => c.id === checkId);
  if (!check) return;

  const statusColor = { UP: '#22c55e', DOWN: '#ef4444', WARNING: '#eab308', UNKNOWN: '#6b7280' }[check.status] || '#6b7280';

  const modal = document.getElementById('checkDetailModal');
  const content = document.getElementById('checkDetailContent');

  // Show a loading state immediately
  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h3 style="margin:0;font-size:1.1rem;font-weight:600;">${escHtml(check.name)}</h3>
      <span style="color:${statusColor};font-weight:600;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.1);">${statusIcon(check.status)} ${check.status}</span>
    </div>
    <p style="color:var(--text-dim);font-size:0.85rem;display:flex;align-items:center;gap:6px;"><i data-lucide="loader-2" class="loading" style="width:14px;height:14px;"></i> Loading run log…</p>
  `;
  modal.style.display = 'flex';
  lucide.createIcons();

  // Fetch the log entry for this specific check
  let runLog = null;
  try {
    const res = await fetch(`/api/check-log/${encodeURIComponent(checkId)}`);
    if (res.ok) runLog = await res.json();
  } catch (_) {}

  // Build details section from the run log (falls back to in-memory data)
  const src = runLog || check;

  let detailsHtml = '';
  if (src.details && Object.keys(src.details).length > 0) {
    for (const [key, val] of Object.entries(src.details)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
      detailsHtml += `
        <div style="margin-top:12px;">
          <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${escHtml(key)}</div>
          <pre style="background:rgba(0,0,0,0.3);border-radius:6px;padding:10px;font-size:0.8rem;color:#a8b2d1;overflow-x:auto;white-space:pre-wrap;max-height:300px;overflow-y:auto;margin:0;">${escHtml(valStr)}</pre>
        </div>`;
    }
  }

  const logSectionHtml = runLog
    ? `<div style="margin-top:16px;">
        <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;display:flex;align-items:center;gap:6px;"><i data-lucide="file-json" style="width:14px;height:14px;"></i> Run Log Entry</div>
        <pre style="background:rgba(0,0,0,0.5);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:0.78rem;color:var(--text);overflow-x:auto;white-space:pre-wrap;max-height:350px;overflow-y:auto;margin:0;font-family:var(--font-mono);">${escHtml(JSON.stringify(runLog, null, 2))}</pre>
      </div>`
    : `<p style="color:var(--text-dim);font-size:0.8rem;margin-top:12px;display:flex;align-items:center;gap:6px;"><i data-lucide="info" style="width:14px;height:14px;"></i> No run log file found yet. Logs are written after each check cycle.</p>`;

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h3 style="margin:0;font-size:1.1rem;font-weight:600;">${escHtml(check.name)}</h3>
      <span style="color:${statusColor};font-weight:600;font-size:0.9rem;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.1);">${statusIcon(check.status)} ${check.status}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:10px;">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">GROUP</div>
        <div style="font-size:0.9rem;">${escHtml(check.group)}</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:10px;">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">SEVERITY</div>
        <div>${severityBadge(check.severity)}</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:10px;">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">RESPONSE TIME</div>
        <div style="font-size:0.9rem;">${check.responseTimeMs}ms</div>
      </div>
      <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:10px;">
        <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">TIMESTAMP</div>
        <div style="font-size:0.9rem;">${new Date(check.timestamp).toLocaleString()}</div>
      </div>
    </div>
    <div style="margin-bottom:12px;">
      <div style="font-size:0.7rem;color:var(--text-dim);margin-bottom:4px;">MESSAGE</div>
      <pre style="background:rgba(0,0,0,0.5);border:1px solid var(--border);border-radius:6px;padding:10px;font-size:0.85rem;color:var(--text);overflow-x:auto;white-space:pre-wrap;max-height:250px;overflow-y:auto;margin:0;font-family:var(--font-mono);">${escHtml(src.message || check.message)}</pre>
    </div>
    ${detailsHtml}
    ${logSectionHtml}
  `;
  lucide.createIcons();
}

function closeCheckDetail() {
  document.getElementById('checkDetailModal').style.display = 'none';
}

// Close modal on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('checkDetailModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCheckDetail();
    });
  }
});

// ── State ──────────────────────────────────────────────────
let currentData = { checks: [], states: {}, summary: { total: 0, up: 0, down: 0, warning: 0, unknown: 0, lastRun: null } };
let responseChart = null;
let refreshTimer = null;

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  fetchStatus();
  startAutoRefresh();
});

// ── Fetch ─────────────────────────────────────────────────
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    currentData = await res.json();
    updateSummary();
    renderChecks();
  } catch (err) {
    console.error('Failed to fetch status:', err);
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

// ── Render Checks ─────────────────────────────────────────
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
    'backend-health': '🏥 Backend Health',
    'feature-api': '🔌 Feature API Probes',
    'frontend-api': '🌐 Frontend API Probes',
    'database': '🗄️ Database (NeonDB)',
    'redis': '📦 Redis',
    's3': '☁️ AWS S3',
    'ec2': '🖥️ EC2 Instance',
    'dns-tls': '🌍 DNS & TLS',
  };

  let html = '';
  groupOrder.forEach(g => {
    if (!groups[g] || groups[g].length === 0) return;
    const groupChecks = groups[g];
    const up = groupChecks.filter(c => c.status === 'UP').length;
    html += `<div class="group-section">`;
    html += `<div class="group-title">${groupLabels[g] || g} (${up}/${groupChecks.length} up)</div>`;
    html += `<div class="checks-grid">`;
    groupChecks.forEach(c => {
      html += `
        <div class="check-card status-${c.status}">
          <div class="check-header">
            <span class="check-name">${c.name}</span>
            <span class="check-status ${c.status}">${statusIcon(c.status)} ${c.status}</span>
          </div>
          <div class="check-msg" title="${escHtml(c.message)}">${escHtml(c.message)}</div>
          <div class="check-meta">
            <span>${c.responseTimeMs}ms</span>
            <span>${new Date(c.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>`;
    });
    html += `</div></div>`;
  });

  grid.innerHTML = html || '<p style="color: var(--text-dim); text-align: center; padding: 40px;">No checks matching filter</p>';
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
      <td>${statusIcon(inc.from)} ${inc.from} → ${statusIcon(inc.to)} ${inc.to}</td>
      <td>${escHtml(inc.message)}</td>
    </tr>
  `).join('');
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
      <td>${a.type === 'FAILURE' ? '🔴 FAILURE' : '🟢 RECOVERY'}</td>
      <td>${escHtml(a.subject)}</td>
    </tr>
  `).join('');
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

  const colors = ['#6366f1', '#22c55e', '#ef4444', '#eab308', '#06b6d4', '#f97316', '#a855f7', '#ec4899'];

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
        x: { type: 'timeseries', time: { unit: 'hour' }, ticks: { color: '#8892b0' }, grid: { color: '#1e2d50' } },
        y: { title: { display: true, text: 'Response Time (ms)', color: '#8892b0' }, ticks: { color: '#8892b0' }, grid: { color: '#1e2d50' } },
      },
      plugins: {
        legend: { labels: { color: '#e2e8f0', font: { size: 11 } } },
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

// ── Helpers ──────────────────────────────────────────────
function statusIcon(s) {
  return { UP: '✅', DOWN: '❌', WARNING: '⚠️', UNKNOWN: '❔' }[s] || '❔';
}

function severityBadge(s) {
  const colors = { CRITICAL: 'var(--red)', WARNING: 'var(--yellow)', NOTICE: '#f97316' };
  return `<span style="color:${colors[s] || 'var(--text-dim)'};font-weight:600;">${s}</span>`;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

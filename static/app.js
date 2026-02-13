/* Fire Safety Compliance Platform - Frontend Application */

const API = '';
let currentPage = 'dashboard';
let filterOptions = {};
let docCategories = [];

// ─── Utilities ──────────────────────────────────────────────────
async function api(path, opts) {
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.headers.get('content-type')?.includes('json')) return res.json();
  return res.text();
}

function $(id) { return document.getElementById(id); }
function esc(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
function fmt$(n) { if (n == null) return '-'; return '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n) { if (n == null) return '0'; return Number(n).toLocaleString(); }
function fmtSize(b) { if (!b) return '-'; if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; }

function badge(type, text) {
  const cls = type.toLowerCase().replace(/\s+/g, '-');
  return `<span class="badge badge-${cls}">${esc(text)}</span>`;
}

function priorityBadge(p) { return badge(p || 'medium', p || 'Medium'); }
function fscBadge(s) { return badge(s === 'Pending' ? 'pending' : s === 'Outstanding' ? 'outstanding' : (s === 'Received' || s === 'Compliant') ? 'compliant' : 'info', s || 'Pending'); }
function riskBadge(r) { return badge(r === 'Major' ? 'critical' : r === 'Medium' ? 'high' : r === 'Minor' ? 'medium' : 'low', r || '-'); }
function progressBadge(p) { return badge(p === 'Completed' ? 'compliant' : p === 'Outstanding' ? 'outstanding' : p === 'In Progress' ? 'pending' : 'info', p || '-'); }
function fssBadge(has) { return has ? badge('yes', 'FSS') : badge('no', 'No FSS'); }

function measureStatus(val) {
  if (!val || val === 'N/A' || val === 'Not Installed') return 'na';
  if (val === 'Operational' || val === 'Yes') return 'ok';
  if (val === 'Defective') return 'bad';
  return 'warn';
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showModal(title, bodyHtml, footerHtml) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHtml;
  $('modalFooter').innerHTML = footerHtml || '';
  $('modalOverlay').classList.add('show');
}

function closeModal() { $('modalOverlay').classList.remove('show'); }

function loading() { return '<div class="loading-overlay"><div class="spinner"></div> Loading...</div>'; }

function complianceColor(rate) {
  if (rate >= 80) return 'var(--success)';
  if (rate >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

// ─── Navigation ─────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    navigate(item.dataset.page);
    document.getElementById('sidebar').classList.remove('open');
  });
});

function navigate(page, params) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  const titles = { dashboard: 'Dashboard', stations: 'Stations', tenants: 'Tenants', afss: 'AFSS Schedule', fss: 'Fire Safety Schedule', defects: 'Defects', analytics: 'Analytics', reports: 'Monthly Reports' };
  $('pageTitle').textContent = titles[page] || page;
  window.location.hash = params ? `${page}/${params}` : page;
  renderPage(page, params);
}

window.addEventListener('hashchange', () => {
  const [page, ...rest] = window.location.hash.slice(1).split('/');
  if (page && page !== currentPage) navigate(page, rest.join('/'));
  else if (rest.length) renderPage(page, rest.join('/'));
});

async function init() {
  try { filterOptions = await api('/api/filters'); docCategories = filterOptions.document_categories || []; } catch (e) { console.warn('filters failed', e); }
  const hash = window.location.hash.slice(1);
  if (hash) { const [p, ...r] = hash.split('/'); navigate(p, r.join('/')); }
  else navigate('dashboard');
}

// ─── Page Router ────────────────────────────────────────────────
function renderPage(page, params) {
  const c = $('content');
  c.innerHTML = loading();
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'stations': params ? renderStationDetail(params) : renderStations(); break;
    case 'tenants': params ? renderTenantDetail(params) : renderTenants(); break;
    case 'afss': renderAFSS(); break;
    case 'fss': renderFSS(); break;
    case 'defects': renderDefects(); break;
    case 'analytics': renderAnalytics(); break;
    case 'reports': renderReports(); break;
    case 'search': renderSearchResults(params); break;
    default: renderDashboard();
  }
}

// ─── Dashboard ──────────────────────────────────────────────────
async function renderDashboard() {
  try {
    const d = await api('/api/dashboard');
    $('content').innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card primary"><div class="kpi-label">Total Stations</div><div class="kpi-value">${fmtN(d.total_stations)}</div><div class="kpi-sub">${d.afss_stations} with AFSS schedule</div></div>
        <div class="kpi-card primary"><div class="kpi-label">Total Tenants</div><div class="kpi-value">${fmtN(d.total_tenants)}</div><div class="kpi-sub">${d.active_tenants} active leases</div></div>
        <div class="kpi-card ${d.compliance_rate > 50 ? 'success' : 'warning'}"><div class="kpi-label">Compliance Rate</div><div class="kpi-value">${d.compliance_rate}%</div><div class="kpi-sub">${d.fsc_received + d.fsc_compliant} of ${d.active_tenants} compliant</div></div>
        <div class="kpi-card danger"><div class="kpi-label">Open Defects</div><div class="kpi-value">${fmtN(d.open_defects)}</div><div class="kpi-sub">${d.major_defects} major, ${d.total_defects} total</div></div>
        <div class="kpi-card info"><div class="kpi-label">FSC Received</div><div class="kpi-value">${d.fsc_pct}%</div><div class="kpi-sub">${d.fsc_received + d.fsc_compliant} received / compliant</div></div>
        <div class="kpi-card primary"><div class="kpi-label">Fire Safety Schedules</div><div class="kpi-value">${fmtN(d.fss_stations)}</div><div class="kpi-sub">${d.fss_tenants} tenants with FSS</div></div>
      </div>
      <div class="chart-grid">
        <div class="card"><div class="card-header"><h3>Priority Distribution</h3></div><div class="card-body">
          ${barChart([
            { label: 'Critical', value: d.critical, color: 'red' },
            { label: 'High', value: d.high, color: 'amber' },
            { label: 'Medium', value: d.medium, color: 'blue' },
            { label: 'Low', value: d.low, color: 'green' }
          ])}
        </div></div>
        <div class="card"><div class="card-header"><h3>FSC Status</h3></div><div class="card-body">
          ${barChart([
            { label: 'Compliant', value: d.fsc_compliant, color: 'green' },
            { label: 'Received', value: d.fsc_received, color: 'teal' },
            { label: 'Pending', value: d.fsc_pending, color: 'amber' },
            { label: 'Outstanding', value: d.fsc_outstanding, color: 'red' }
          ])}
        </div></div>
      </div>
      <div class="chart-grid">
        <div class="card"><div class="card-header"><h3>AFSS Due by Month</h3></div><div class="card-body">
          ${barChart(Object.entries(d.afss_by_month).map(([m, v]) => ({ label: m.slice(0, 3), value: v, color: 'blue' })))}
        </div></div>
        <div class="card"><div class="card-header"><h3>Recent Activity</h3></div><div class="card-body">
          ${d.recent_activities.length ? d.recent_activities.map(a => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px"><strong>${esc(a.action)}</strong> ${esc(a.description || '')}<div class="text-muted">${a.created_at ? new Date(a.created_at).toLocaleString() : ''}</div></div>`).join('') : '<p class="text-muted">No recent activity</p>'}
        </div></div>
      </div>
      <div class="card mt-4"><div class="card-header"><h3>Priority Actions Required</h3></div><div class="card-body table-wrap">
        <table><thead><tr><th>Station</th><th>Tenant</th><th>Priority</th><th>FSC Status</th><th>Open Defects</th><th>Major</th></tr></thead><tbody>
          ${d.priority_actions.map(t => `<tr class="clickable" onclick="navigate('tenants','${t.id}')">
            <td>${esc(t.station_name)}</td><td>${esc(t.tenant_name)}</td><td>${priorityBadge(t.priority)}</td>
            <td>${fscBadge(t.fsc_status)}</td><td>${t.open_defects || 0}</td><td>${t.major_defects || 0}</td>
          </tr>`).join('')}
        </tbody></table>
      </div></div>
    `;
  } catch (e) { $('content').innerHTML = `<p>Error loading dashboard: ${e.message}</p>`; }
}

function barChart(items) {
  const max = Math.max(...items.map(i => i.value), 1);
  return `<div class="bar-chart">${items.map(i => `
    <div class="bar-row"><span class="bar-label">${esc(i.label)}</span>
    <div class="bar-track"><div class="bar-fill ${i.color}" style="width:${Math.max((i.value / max) * 100, i.value > 0 ? 5 : 0)}%">${i.value > 0 ? i.value : ''}</div></div>
    <span class="bar-count">${i.value}</span></div>
  `).join('')}</div>`;
}

// ─── Stations ───────────────────────────────────────────────────
async function renderStations() {
  $('pageTitle').textContent = 'Stations';
  try {
    const stations = await api('/api/stations');
    $('content').innerHTML = `
      <div class="filters">
        <input type="text" id="stationSearch" placeholder="Search stations..." value="" oninput="filterStationCards()">
        <select id="stationRegion" onchange="filterStationCards()"><option value="">All Regions</option>${(filterOptions.regions || []).map(r => `<option>${esc(r)}</option>`).join('')}</select>
        <label style="font-size:13px;display:flex;align-items:center;gap:4px"><input type="checkbox" id="stationAFSS" onchange="filterStationCards()"> AFSS Only</label>
        <label style="font-size:13px;display:flex;align-items:center;gap:4px"><input type="checkbox" id="stationFSS" onchange="filterStationCards()"> Has FSS</label>
        <span class="text-muted text-sm" id="stationCount">${stations.length} stations</span>
      </div>
      <div class="station-cards" id="stationGrid">
        ${stations.map(s => stationCard(s)).join('')}
      </div>
    `;
    window._stations = stations;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

function stationCard(s) {
  const rate = s.compliance_rate || 0;
  const color = complianceColor(rate);
  return `<div class="station-card" onclick="navigate('stations','${s.id}')" data-search="${(s.name + ' ' + (s.region || '') + ' ' + (s.council || '') + ' ' + (s.code || '')).toLowerCase()}" data-region="${s.region || ''}" data-afss="${s.afss_due_month ? '1' : ''}" data-fss="${s.has_fire_safety_schedule ? '1' : ''}">
    <div class="station-card-header">
      <h4>${esc(s.name)}</h4>
      <div class="flex gap-2">${s.has_fire_safety_schedule ? '<span class="badge badge-fss">FSS</span>' : ''}${s.code ? `<span class="badge badge-info">${esc(s.code)}</span>` : ''}</div>
    </div>
    <div class="station-card-body">
      <div class="station-card-stats">
        <div class="station-card-stat"><span class="stat-value" style="color:var(--primary)">${s.tenant_count || 0}</span>Tenants</div>
        <div class="station-card-stat"><span class="stat-value" style="color:${color}">${rate}%</span>Compliance</div>
        <div class="station-card-stat"><span class="stat-value" style="color:var(--danger)">${(s.critical_count || 0) + (s.high_count || 0)}</span>Critical/High</div>
      </div>
      <div class="compliance-bar"><div class="compliance-bar-fill" style="width:${rate}%;background:${color}"></div></div>
    </div>
    <div class="station-card-footer">
      <span>${esc(s.region || '-')}</span>
      <span>AFSS: ${s.afss_due_month_name || '-'}</span>
    </div>
  </div>`;
}

function filterStationCards() {
  const search = ($('stationSearch')?.value || '').toLowerCase();
  const region = $('stationRegion')?.value || '';
  const afssOnly = $('stationAFSS')?.checked || false;
  const fssOnly = $('stationFSS')?.checked || false;
  let count = 0;
  document.querySelectorAll('#stationGrid .station-card').forEach(el => {
    const show = (!search || el.dataset.search.includes(search))
      && (!region || el.dataset.region === region)
      && (!afssOnly || el.dataset.afss === '1')
      && (!fssOnly || el.dataset.fss === '1');
    el.style.display = show ? '' : 'none';
    if (show) count++;
  });
  const el = $('stationCount');
  if (el) el.textContent = `${count} stations`;
}

// ─── Station Detail ─────────────────────────────────────────────
async function renderStationDetail(id) {
  try {
    const s = await api(`/api/stations/${id}`);
    $('pageTitle').textContent = s.name;
    const tenants = s.tenants || [];
    const active = tenants.filter(t => ['Current','Holdover','Leased'].includes(t.lease_status));
    const rate = s.compliance_rate || 0;

    $('content').innerHTML = `
      <div class="detail-header">
        <span class="back-btn" onclick="navigate('stations')">&#8592;</span>
        <div style="flex:1">
          <h2>${esc(s.name)}</h2>
          <span class="text-muted">${esc(s.region || '')} ${s.council ? '| ' + esc(s.council) : ''}</span>
        </div>
        <div class="flex gap-2">
          ${s.code ? `<span class="badge badge-info">${esc(s.code)}</span>` : ''}
          ${s.has_fire_safety_schedule ? '<span class="badge badge-fss">Fire Safety Schedule</span>' : '<span class="badge badge-no">No FSS</span>'}
        </div>
      </div>

      <div class="tabs" id="stationTabs">
        <div class="tab active" data-tab="overview">Overview</div>
        <div class="tab" data-tab="tenancies">Tenancies (${tenants.length})</div>
        <div class="tab" data-tab="defectsTab">Defects (${(s.defects||[]).length})</div>
        <div class="tab" data-tab="docsTab">Documents</div>
        <div class="tab" data-tab="notesTab">Notes</div>
        <div class="tab" data-tab="timelineTab">Timeline</div>
      </div>

      <div class="tab-content active" id="tab-overview">
        <div class="kpi-grid">
          <div class="kpi-card primary"><div class="kpi-label">Total Tenants</div><div class="kpi-value">${tenants.length}</div><div class="kpi-sub">${active.length} active</div></div>
          <div class="kpi-card ${rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger'}"><div class="kpi-label">Compliance</div><div class="kpi-value">${rate}%</div><div class="kpi-sub">${s.fsc_received || 0} of ${active.length} compliant</div></div>
          <div class="kpi-card danger"><div class="kpi-label">Critical/High</div><div class="kpi-value">${(s.critical_count||0) + (s.high_count||0)}</div><div class="kpi-sub">${s.critical_count||0} critical, ${s.high_count||0} high</div></div>
          <div class="kpi-card warning"><div class="kpi-label">Defects</div><div class="kpi-value">${(s.defects||[]).length}</div><div class="kpi-sub">${(s.defects||[]).filter(d=>d.progress!=='Completed').length} open</div></div>
        </div>
        <div class="detail-grid">
          <div class="card"><div class="card-header"><h3>Station Info</h3><button class="btn btn-secondary btn-sm" onclick="editStation(${s.id})">Edit</button></div><div class="card-body">
            ${infoRow('Region', s.region)}${infoRow('Building', s.building_name)}${infoRow('Address', s.address)}
            ${infoRow('Council', s.council)}${infoRow('ICOMPLY Contact', s.icomply_contact)}
            ${infoRow('Lease Type', s.lease_type_category)}
          </div></div>
          <div class="card"><div class="card-header"><h3>AFSS & Compliance</h3></div><div class="card-body">
            ${infoRow('AFSS Due Month', s.afss_due_month_name)}
            ${infoRow('FSC Due Month', s.tenant_fsc_due_month_name)}
            ${infoRow('Inspection Month', s.inspection_month_name)}
            ${infoRow('AFSS Likely', s.afss_likely)}
            ${infoRow('Fire Safety Schedule', s.has_fire_safety_schedule ? 'Yes' : 'No')}
            ${s.fire_safety_schedule_notes ? infoRow('FSS Notes', s.fire_safety_schedule_notes) : ''}
          </div></div>
        </div>
      </div>

      <div class="tab-content" id="tab-tenancies">
        <div class="flex justify-between items-center mb-4">
          <input type="text" id="stationTenantSearch" placeholder="Filter tenancies..." oninput="filterStationTenants()" style="padding:7px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;width:260px">
        </div>
        <div id="tenantCards">
          ${tenants.map(t => tenantExpandCard(t, s.id)).join('')}
        </div>
      </div>

      <div class="tab-content" id="tab-defectsTab">
        <div class="card"><div class="card-header"><h3>Defects</h3><button class="btn btn-primary btn-sm" onclick="addDefectForStation(${s.id},'${esc(s.name)}')">Add Defect</button></div><div class="card-body table-wrap">
          ${(s.defects||[]).length ? `<table><thead><tr><th>Category</th><th>Risk</th><th>Progress</th><th>Audit Date</th><th>Actions</th></tr></thead><tbody>
            ${s.defects.map(d => `<tr class="clickable" onclick="editDefect(${d.id})"><td>${esc(d.category || '-')}</td><td>${riskBadge(d.risk)}</td><td>${progressBadge(d.progress)}</td><td>${esc(d.audit_date || '-')}</td>
              <td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();editDefect(${d.id})">Edit</button></td></tr>`).join('')}
          </tbody></table>` : '<p class="text-muted">No defects recorded</p>'}
        </div></div>
      </div>

      <div class="tab-content" id="tab-docsTab">
        <div class="card"><div class="card-header"><h3>Documents</h3><button class="btn btn-primary btn-sm" onclick="uploadDoc(${s.id},null,null)">Upload Document</button></div><div class="card-body">
          ${renderDocsByCategory(s.documents_by_category || {})}
        </div></div>
      </div>

      <div class="tab-content" id="tab-notesTab">
        <div class="card"><div class="card-header"><h3>Notes</h3><button class="btn btn-primary btn-sm" onclick="addNote(${s.id},null)">Add Note</button></div><div class="card-body" id="notesList">
          ${renderNotes(s.notes || [])}
        </div></div>
      </div>

      <div class="tab-content" id="tab-timelineTab">
        <div class="card"><div class="card-header"><h3>Timeline</h3></div><div class="card-body" id="timelineContent">
          <div class="loading-overlay"><div class="spinner"></div> Loading...</div>
        </div></div>
      </div>
    `;
    window._currentStation = s;
    window._allDefects = s.defects || [];
    setupTabs('stationTabs');
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

function tenantExpandCard(t, stationId) {
  return `<div class="tenant-card" data-search="${(t.tenant_name + ' ' + (t.trading_name||'') + ' ' + (t.file_number||'')).toLowerCase()}">
    <div class="tenant-card-header" onclick="toggleTenantCard(this)">
      <div style="flex:1;min-width:0">
        <strong style="font-size:13px">${esc(t.tenant_name)}</strong>
        ${t.trading_name ? `<span class="text-muted text-sm"> - ${esc(t.trading_name)}</span>` : ''}
      </div>
      <div class="flex gap-2 items-center">
        ${priorityBadge(t.priority)} ${fscBadge(t.fsc_status)}
        ${t.has_fire_safety_schedule ? '<span class="badge badge-fss">FSS</span>' : ''}
        <span class="arrow">&#9654;</span>
      </div>
    </div>
    <div class="tenant-card-body">
      <div class="tenant-card-info">
        <div><span class="info-label">File #:</span> ${esc(t.file_number || '-')}</div>
        <div><span class="info-label">Lease:</span> ${esc(t.lease_status || '-')}</div>
        <div><span class="info-label">Industry:</span> ${esc(t.standard_industry_class || '-')}</div>
        <div><span class="info-label">Defects:</span> ${t.open_defects || 0} open, ${t.major_defects || 0} major</div>
        <div><span class="info-label">Contact:</span> ${esc(t.contact_name || '-')}</div>
        <div><span class="info-label">Email:</span> ${esc(t.contact_email || '-')}</div>
      </div>
      <div class="flex gap-2 mt-4">
        <button class="btn btn-primary btn-sm" onclick="navigate('tenants','${t.id}')">View Full Details</button>
        <button class="btn btn-secondary btn-sm" onclick="editTenantFSCQuick(${t.id},'${esc(t.fsc_status)}','${esc(t.priority)}')">Update FSC</button>
      </div>
    </div>
  </div>`;
}

function toggleTenantCard(header) {
  header.classList.toggle('open');
  header.nextElementSibling.classList.toggle('open');
}

function filterStationTenants() {
  const search = ($('stationTenantSearch')?.value || '').toLowerCase();
  document.querySelectorAll('#tenantCards .tenant-card').forEach(el => {
    el.style.display = (!search || el.dataset.search.includes(search)) ? '' : 'none';
  });
}

// ─── Tenants ────────────────────────────────────────────────────
let tenantPage = 0;
const PAGE_SIZE = 50;

async function renderTenants(keepFilters) {
  $('pageTitle').textContent = 'Tenants';
  if (!keepFilters) tenantPage = 0;
  const params = new URLSearchParams();
  params.set('limit', PAGE_SIZE);
  params.set('offset', tenantPage * PAGE_SIZE);

  const search = keepFilters ? ($('tenantSearch')?.value || '') : '';
  const priority = keepFilters ? ($('tenantPriority')?.value || '') : '';
  const fsc = keepFilters ? ($('tenantFSC')?.value || '') : '';
  const region = keepFilters ? ($('tenantRegion')?.value || '') : '';
  const pm = keepFilters ? ($('tenantPM')?.value || '') : '';
  const ls = keepFilters ? ($('tenantLease')?.value || '') : '';

  if (search) params.set('search', search);
  if (priority) params.set('priority', priority);
  if (fsc) params.set('fsc_status', fsc);
  if (region) params.set('region', region);
  if (pm) params.set('property_manager', pm);
  if (ls) params.set('lease_status', ls);

  try {
    const data = await api(`/api/tenants?${params}`);
    const total = data.total;
    const tenants = data.tenants;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    if (!keepFilters) {
      $('content').innerHTML = `
        <div class="filters">
          <input type="text" id="tenantSearch" placeholder="Search tenants..." value="${esc(search)}" onkeyup="if(event.key==='Enter'){tenantPage=0;renderTenants(true)}">
          <select id="tenantPriority" onchange="tenantPage=0;renderTenants(true)"><option value="">All Priorities</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
          <select id="tenantFSC" onchange="tenantPage=0;renderTenants(true)"><option value="">All FSC</option><option value="Pending">Pending</option><option value="Outstanding">Outstanding</option><option value="Received">Received</option><option value="Compliant">Compliant</option></select>
          <select id="tenantRegion" onchange="tenantPage=0;renderTenants(true)"><option value="">All Regions</option>${(filterOptions.regions || []).map(r => `<option>${esc(r)}</option>`).join('')}</select>
          <select id="tenantPM" onchange="tenantPage=0;renderTenants(true)"><option value="">All Managers</option>${(filterOptions.property_managers || []).map(p => `<option>${esc(p)}</option>`).join('')}</select>
          <select id="tenantLease" onchange="tenantPage=0;renderTenants(true)"><option value="">All Lease Status</option>${(filterOptions.lease_statuses || []).map(s => `<option>${esc(s)}</option>`).join('')}</select>
          <a href="/api/export/tenants" class="btn btn-secondary btn-sm" download>Export CSV</a>
        </div>
        <div id="tenantResults"></div>
      `;
    }

    $('tenantResults').innerHTML = `
      <div class="flex justify-between items-center mb-2"><span class="text-muted text-sm">${fmtN(total)} tenants found</span></div>
      <div class="card"><div class="card-body table-wrap">
        <table><thead><tr><th>Station</th><th>Tenant</th><th>File #</th><th>Lease Status</th><th>Priority</th><th>FSC</th><th>FSS</th><th>Defects</th></tr></thead><tbody>
          ${tenants.map(t => `<tr class="clickable" onclick="navigate('tenants','${t.id}')">
            <td>${esc(t.station_name)}</td>
            <td><strong>${esc(t.tenant_name)}</strong>${t.trading_name ? `<br><span class="text-muted text-sm">${esc(t.trading_name)}</span>` : ''}</td>
            <td>${esc(t.file_number || '-')}</td><td>${esc(t.lease_status || '-')}</td>
            <td>${priorityBadge(t.priority)}</td><td>${fscBadge(t.fsc_status)}</td>
            <td>${t.has_fire_safety_schedule ? badge('yes','Yes') : badge('no','No')}</td>
            <td>${t.open_defects || 0}</td>
          </tr>`).join('')}
        </tbody></table>
      </div></div>
      <div class="pagination">
        <button ${tenantPage === 0 ? 'disabled' : ''} onclick="tenantPage--;renderTenants(true)">Previous</button>
        <span class="page-info">Page ${tenantPage + 1} of ${totalPages || 1}</span>
        <button ${tenantPage >= totalPages - 1 ? 'disabled' : ''} onclick="tenantPage++;renderTenants(true)">Next</button>
      </div>
    `;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

// ─── Tenant Detail ──────────────────────────────────────────────
async function renderTenantDetail(id) {
  try {
    const t = await api(`/api/tenants/${id}`);
    $('pageTitle').textContent = t.tenant_name;
    const fireMeasures = ['fire_detection','fire_sprinklers','fire_hydrants','fire_extinguishers','exit_lighting','emergency_lighting','evacuation_diagrams','emergency_pathway','fire_doors','fire_walls','mechanical_ventilation'];

    $('content').innerHTML = `
      <div class="detail-header">
        <span class="back-btn" onclick="navigate('stations','${t.station_id}')">&#8592;</span>
        <div style="flex:1">
          <h2>${esc(t.tenant_name)}</h2>
          <span class="text-muted">${esc(t.station_name)} | ${esc(t.zone || '')}</span>
        </div>
        <div class="flex gap-2">${priorityBadge(t.priority)} ${fscBadge(t.fsc_status)} ${t.has_fire_safety_schedule ? '<span class="badge badge-fss">FSS</span>' : ''}</div>
      </div>

      <div class="tabs" id="tenantTabs">
        <div class="tab active" data-tab="details">Details</div>
        <div class="tab" data-tab="fire">Fire Safety</div>
        <div class="tab" data-tab="contact">Contact</div>
        <div class="tab" data-tab="financial">Financial</div>
        <div class="tab" data-tab="defectsTab">Defects (${(t.defects||[]).length})</div>
        <div class="tab" data-tab="docsTab">Documents</div>
        <div class="tab" data-tab="notesTab">Notes</div>
        <div class="tab" data-tab="commsTab">Communications</div>
        <div class="tab" data-tab="timelineTab">Timeline</div>
      </div>

      <div class="tab-content active" id="tab-details">
        <div class="detail-grid">
          <div class="card"><div class="card-header"><h3>Lease Information</h3><button class="btn btn-primary btn-sm" onclick="editTenantFSC(${t.id})">Update FSC</button></div><div class="card-body">
            ${infoRow('Tenant Name', t.tenant_name)}${infoRow('Trading Name', t.trading_name)}
            ${infoRow('File Number', t.file_number)}${infoRow('Lease ID', t.lease_id)}
            ${infoRow('Agreement #', t.agreement_number)}${infoRow('Region', t.region)}
            ${infoRow('Lease Status', t.lease_status)}${infoRow('Lease Type', t.lease_type)}
            ${infoRow('Lease Start', t.lease_start)}${infoRow('Lease Expiry', t.lease_expiry)}
            ${infoRow('Lease Terms', t.lease_terms)}${infoRow('Industry', t.standard_industry_class)}
            ${infoRow('Property Manager', t.property_manager)}${infoRow('Heritage', t.heritage)}
          </div></div>
          <div class="card"><div class="card-header"><h3>Compliance Status</h3></div><div class="card-body">
            ${infoRow('Priority', t.priority)}${infoRow('FSC Status', t.fsc_status)}
            ${infoRow('FSC Requested', t.fsc_requested_date)}${infoRow('FSC Received', t.fsc_received_date)}
            ${infoRow('AFSS Month', t.afss_month_name)}${infoRow('FSC Due Month', t.fsc_due_month_name)}
            ${infoRow('Fire Safety Schedule', t.has_fire_safety_schedule ? 'Yes' : 'No')}
            ${t.fire_safety_schedule_notes ? infoRow('FSS Notes', t.fire_safety_schedule_notes) : ''}
            ${infoRow('Open Defects', t.open_defects)}${infoRow('Major Defects', t.major_defects)}
            ${infoRow('Premises', t.premises_description)}${infoRow('Lots/DP', t.lots_dp_numbers)}
          </div></div>
        </div>
      </div>

      <div class="tab-content" id="tab-fire">
        <div class="card"><div class="card-header"><h3>Fire Safety Measures</h3><button class="btn btn-primary btn-sm" onclick="editFireSafety(${t.id})">Edit</button></div><div class="card-body">
          <div class="measures-grid">
            ${fireMeasures.map(f => {
              const val = t[f] || '';
              const st = measureStatus(val);
              return `<div class="measure-item"><div class="measure-status ${st}"></div><span>${f.replace(/_/g,' ')}</span><strong style="margin-left:auto">${esc(val || '-')}</strong></div>`;
            }).join('')}
          </div>
          <div class="detail-grid mt-4">
            <div>${infoRow('Last Inspection', t.last_inspection_date)}${infoRow('Fire Equip Service Date', t.fire_equipment_service_date)}${infoRow('Fire Equip Service Due', t.fire_equipment_service_due)}</div>
            <div>${t.possible_afss_issues ? `<div class="mt-2"><strong class="text-sm">Possible AFSS Issues:</strong><p class="text-sm mt-2">${esc(t.possible_afss_issues)}</p></div>` : ''}
            ${t.comments_to_site_staff ? `<div class="mt-2"><strong class="text-sm">Comments to Site Staff:</strong><p class="text-sm mt-2">${esc(t.comments_to_site_staff)}</p></div>` : ''}</div>
          </div>
        </div></div>
      </div>

      <div class="tab-content" id="tab-contact">
        <div class="card"><div class="card-header"><h3>Contact Information</h3></div><div class="card-body">
          <div class="detail-grid">
            <div>${infoRow('Contact Name', t.contact_name)}${infoRow('Phone', t.contact_phone)}${infoRow('Phone 2', t.contact_phone2)}${infoRow('Mobile', t.contact_mobile)}${infoRow('Email', t.contact_email)}${infoRow('Billing Email', t.billing_email)}</div>
            <div>${infoRow('ABN', t.abn)}${infoRow('Billing Name', t.billing_name)}${infoRow('Billing Address', t.billing_address)}${infoRow('Billing City', t.billing_city)}${infoRow('Billing State', t.billing_state)}${infoRow('Billing Postcode', t.billing_postcode)}</div>
          </div>
        </div></div>
      </div>

      <div class="tab-content" id="tab-financial">
        <div class="card"><div class="card-header"><h3>Financial</h3></div><div class="card-body">
          ${infoRow('Area (m2)', t.area_m2)}${infoRow('Base Rent p.a.', fmt$(t.base_rent_pa))}${infoRow('$/psm p.a.', fmt$(t.rent_psm_pa))}
          ${infoRow('Total Passing Rent p.a.', fmt$(t.total_passing_rent_pa))}${infoRow('Rent Income Code', t.rent_income_code)}
        </div></div>
      </div>

      <div class="tab-content" id="tab-defectsTab">
        <div class="card"><div class="card-header"><h3>Defects</h3><button class="btn btn-primary btn-sm" onclick="addDefectForTenant()">Add Defect</button></div><div class="card-body">
          ${renderDefectTable(t.defects || [])}
        </div></div>
      </div>

      <div class="tab-content" id="tab-docsTab">
        <div class="card"><div class="card-header"><h3>Documents</h3><button class="btn btn-primary btn-sm" onclick="uploadDoc(null,${t.id},null)">Upload Document</button></div><div class="card-body">
          ${renderDocsByCategory(t.documents_by_category || {})}
        </div></div>
      </div>

      <div class="tab-content" id="tab-notesTab">
        <div class="card"><div class="card-header"><h3>Notes</h3><button class="btn btn-primary btn-sm" onclick="addNote(null,${t.id})">Add Note</button></div><div class="card-body" id="notesList">
          ${renderNotes(t.notes || [])}
        </div></div>
      </div>

      <div class="tab-content" id="tab-commsTab">
        <div class="card"><div class="card-header"><h3>Communications</h3><button class="btn btn-primary btn-sm" onclick="addComm(${t.id})">Log Communication</button></div><div class="card-body" id="commsList">
          ${renderComms(t.communications || [])}
        </div></div>
      </div>

      <div class="tab-content" id="tab-timelineTab">
        <div class="card"><div class="card-header"><h3>Timeline</h3></div><div class="card-body" id="timelineContent">
          <div class="loading-overlay"><div class="spinner"></div> Loading...</div>
        </div></div>
      </div>
    `;
    window._currentTenant = t;
    window._allDefects = t.defects || [];
    setupTabs('tenantTabs');
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

// ─── Shared Render Helpers ──────────────────────────────────────
function infoRow(label, value) {
  return `<div class="info-row"><span class="label">${esc(label)}</span><span class="value">${esc(value != null ? value : '-')}</span></div>`;
}

function renderNotes(notes) {
  if (!notes.length) return '<p class="text-muted">No notes</p>';
  return notes.map(n => `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
    <p style="font-size:13px">${esc(n.content)}</p>
    <div class="flex justify-between items-center mt-2">
      <small class="text-muted">${n.created_at ? new Date(n.created_at).toLocaleString() : ''} ${n.created_by ? '- ' + esc(n.created_by) : ''}</small>
      <button class="btn btn-danger btn-sm" onclick="deleteNote(${n.id})" style="padding:2px 8px;font-size:11px">Delete</button>
    </div>
  </div>`).join('');
}

function renderComms(comms) {
  if (!comms.length) return '<p class="text-muted">No communications logged</p>';
  return comms.map(c => `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
    <div class="flex justify-between"><strong style="font-size:13px">${esc(c.subject || c.comm_type)}</strong><span class="badge badge-info">${esc(c.comm_type)}</span></div>
    <p class="text-sm mt-2" style="color:var(--text-light)">${esc(c.content || '')}</p>
    <small class="text-muted">${esc(c.direction || '')} | ${esc(c.contact_person || '')} | ${c.created_at ? new Date(c.created_at).toLocaleString() : ''}</small>
    ${c.followup_required ? `<div class="mt-2"><span class="badge badge-${c.followup_completed ? 'compliant' : 'pending'}">${c.followup_completed ? 'Follow-up complete' : 'Follow-up required'}</span></div>` : ''}
  </div>`).join('');
}

function renderDocsByCategory(groups) {
  const cats = Object.keys(groups);
  if (!cats.length) return '<p class="text-muted">No documents uploaded yet</p>';
  return cats.map(cat => `<div class="doc-category">
    <div class="doc-category-header"><span class="badge badge-doc">${esc(cat)}</span> (${groups[cat].length})</div>
    ${groups[cat].map(d => `<div class="doc-item">
      <span class="doc-name">${esc(d.original_filename)}</span>
      <span class="doc-meta">${fmtSize(d.file_size)} | ${d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : ''}</span>
      <a href="/api/documents/${d.id}/download" class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:11px" download>Download</a>
      <button class="btn btn-danger btn-sm" onclick="deleteDoc(${d.id})" style="padding:2px 8px;font-size:11px">Delete</button>
    </div>`).join('')}
  </div>`).join('');
}

function renderDefectTable(defects) {
  if (!defects.length) return '<p class="text-muted">No defects recorded</p>';
  return `<div class="table-wrap"><table><thead><tr><th>Site</th><th>Category</th><th>Risk</th><th>Progress</th><th>Assigned To</th><th>Files</th><th>Actions</th></tr></thead><tbody>
    ${defects.map(d => `<tr class="clickable" onclick="editDefect(${d.id})">
      <td>${esc(d.site_name || '-')}</td><td>${esc(d.category || '-')}</td><td>${riskBadge(d.risk)}</td>
      <td>${progressBadge(d.progress)}</td><td>${esc(d.assigned_to || '-')}</td>
      <td>${(d.documents||[]).length ? `<span class="badge badge-doc">${(d.documents||[]).length} files</span>` : '-'}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();editDefect(${d.id})">Edit</button>
      <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();uploadDoc(null,null,${d.id})">Attach</button></td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

// ─── Tab System ─────────────────────────────────────────────────
function setupTabs(containerId) {
  const container = $(containerId);
  if (!container) return;
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const target = $('tab-' + tab.dataset.tab);
      if (target) target.classList.add('active');
      // Load timeline on demand
      if (tab.dataset.tab === 'timelineTab') {
        const s = window._currentStation;
        const t = window._currentTenant;
        if (t) loadTimeline(null, t.id);
        else if (s) loadTimeline(s.id, null);
      }
    });
  });
}

// ─── Edit Modals ────────────────────────────────────────────────
function editTenantFSC(id) {
  const t = window._currentTenant;
  showModal('Update FSC Status', `
    <div class="form-row">
      <div class="form-group"><label>FSC Status</label><select class="form-control" id="editFSC">
        ${['Pending','Received','Compliant','Outstanding','Not Applicable'].map(s => `<option ${t.fsc_status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Priority</label><select class="form-control" id="editPriority">
        ${['Critical','High','Medium','Low'].map(s => `<option ${t.priority === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>FSC Requested Date</label><input class="form-control" type="date" id="editFSCReq" value="${t.fsc_requested_date || ''}"></div>
      <div class="form-group"><label>FSC Received Date</label><input class="form-control" type="date" id="editFSCRcv" value="${t.fsc_received_date || ''}"></div>
    </div>
    <div class="form-group"><label class="form-check"><input type="checkbox" id="editHasFSS" ${t.has_fire_safety_schedule ? 'checked' : ''}> Has Fire Safety Schedule</label></div>
    <div class="form-group"><label>FSS Notes</label><textarea class="form-control" id="editFSSNotes" rows="2">${esc(t.fire_safety_schedule_notes || '')}</textarea></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTenantFSC(${id})">Save</button>`);
}

function editTenantFSCQuick(id, fsc, priority) {
  showModal('Update FSC Status', `
    <div class="form-row">
      <div class="form-group"><label>FSC Status</label><select class="form-control" id="editFSC">
        ${['Pending','Received','Compliant','Outstanding','Not Applicable'].map(s => `<option ${fsc === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Priority</label><select class="form-control" id="editPriority">
        ${['Critical','High','Medium','Low'].map(s => `<option ${priority === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTenantFSC(${id})">Save</button>`);
}

async function saveTenantFSC(id) {
  const data = { fsc_status: $('editFSC').value, priority: $('editPriority').value };
  if ($('editFSCReq')) data.fsc_requested_date = $('editFSCReq').value || null;
  if ($('editFSCRcv')) data.fsc_received_date = $('editFSCRcv').value || null;
  if ($('editHasFSS')) data.has_fire_safety_schedule = $('editHasFSS').checked;
  if ($('editFSSNotes')) data.fire_safety_schedule_notes = $('editFSSNotes').value || null;
  try {
    await api(`/api/tenants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    closeModal(); toast('FSC status updated');
    if (window._currentTenant) renderTenantDetail(id);
    else if (window._currentStation) renderStationDetail(window._currentStation.id);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function editFireSafety(id) {
  const t = window._currentTenant;
  const fields = ['exit_lighting','evacuation_diagrams','emergency_pathway','fire_detection','fire_sprinklers','fire_hydrants','fire_extinguishers','emergency_lighting','fire_doors','fire_walls','mechanical_ventilation'];
  const opts = ['','Operational','Yes','No','N/A','Defective','Not Installed'];
  showModal('Edit Fire Safety Observations', `
    <div class="form-row">${fields.map(f => `<div class="form-group"><label>${f.replace(/_/g, ' ')}</label>
      <select class="form-control" id="edit_${f}">${opts.map(o => `<option ${(t[f] || '') === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
    </div>`).join('')}</div>
    <div class="form-group"><label>Possible AFSS Issues</label><textarea class="form-control" id="edit_possible_afss_issues">${esc(t.possible_afss_issues || '')}</textarea></div>
    <div class="form-group"><label>Comments to Site Staff</label><textarea class="form-control" id="edit_comments_to_site_staff">${esc(t.comments_to_site_staff || '')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Last Inspection Date</label><input class="form-control" type="date" id="edit_last_inspection_date" value="${t.last_inspection_date || ''}"></div>
      <div class="form-group"><label>Fire Equip Service Due</label><input class="form-control" type="date" id="edit_fire_equipment_service_due" value="${t.fire_equipment_service_due || ''}"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveFireSafety(${id})">Save</button>`);
}

async function saveFireSafety(id) {
  const fields = ['exit_lighting','evacuation_diagrams','emergency_pathway','fire_detection','fire_sprinklers','fire_hydrants','fire_extinguishers','emergency_lighting','fire_doors','fire_walls','mechanical_ventilation','possible_afss_issues','comments_to_site_staff','last_inspection_date','fire_equipment_service_due'];
  const data = {};
  fields.forEach(f => { const el = $('edit_' + f); if (el) data[f] = el.value || null; });
  try {
    await api(`/api/tenants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    closeModal(); toast('Fire safety observations updated'); renderTenantDetail(id);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function editStation(id) {
  const s = window._currentStation;
  showModal('Edit Station', `
    <div class="form-group"><label class="form-check"><input type="checkbox" id="editStFSS" ${s.has_fire_safety_schedule ? 'checked' : ''}> Has Fire Safety Schedule</label></div>
    <div class="form-group"><label>FSS Notes</label><textarea class="form-control" id="editStFSSNotes" rows="2">${esc(s.fire_safety_schedule_notes || '')}</textarea></div>
    <div class="form-group"><label>ICOMPLY Contact</label><input class="form-control" id="editStContact" value="${esc(s.icomply_contact || '')}"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveStation(${id})">Save</button>`);
}

async function saveStation(id) {
  try {
    await api(`/api/stations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        has_fire_safety_schedule: $('editStFSS').checked,
        fire_safety_schedule_notes: $('editStFSSNotes').value || null,
        icomply_contact: $('editStContact').value || null,
      })
    });
    closeModal(); toast('Station updated'); renderStationDetail(id);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

// ─── Notes ──────────────────────────────────────────────────────
function addNote(stationId, tenantId) {
  showModal('Add Note', `
    <div class="form-group"><label>Note</label><textarea class="form-control" id="noteContent" rows="4" placeholder="Enter note..."></textarea></div>
    <div class="form-group"><label>Created By</label><input class="form-control" id="noteBy" placeholder="Your name"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNote(${stationId},${tenantId})">Save</button>`);
}

async function saveNote(stationId, tenantId) {
  try {
    await api('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_id: stationId, tenant_id: tenantId, content: $('noteContent').value, created_by: $('noteBy').value })
    });
    closeModal(); toast('Note added');
    if (tenantId && tenantId !== 'null') renderTenantDetail(tenantId);
    else if (stationId && stationId !== 'null') renderStationDetail(stationId);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  try {
    await api(`/api/notes/${id}`, { method: 'DELETE' });
    toast('Note deleted');
    if (window._currentTenant) renderTenantDetail(window._currentTenant.id);
    else if (window._currentStation) renderStationDetail(window._currentStation.id);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

// ─── Communications ─────────────────────────────────────────────
function addComm(tenantId) {
  showModal('Log Communication', `
    <div class="form-row">
      <div class="form-group"><label>Type</label><select class="form-control" id="commType"><option>Email</option><option>Phone</option><option>Letter</option><option>Site Visit</option><option>Meeting</option></select></div>
      <div class="form-group"><label>Direction</label><select class="form-control" id="commDir"><option>Outbound</option><option>Inbound</option></select></div>
    </div>
    <div class="form-group"><label>Subject</label><input class="form-control" id="commSubject" placeholder="Subject"></div>
    <div class="form-group"><label>Content</label><textarea class="form-control" id="commContent" rows="4" placeholder="Details..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Contact Person</label><input class="form-control" id="commPerson" placeholder="Contact name"></div>
      <div class="form-group"><label>Follow-up Date</label><input class="form-control" type="date" id="commFollowup"></div>
    </div>
    <div class="form-group"><label class="form-check"><input type="checkbox" id="commFollowupReq"> Follow-up Required</label></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveComm(${tenantId})">Save</button>`);
}

async function saveComm(tenantId) {
  try {
    await api('/api/communications', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, comm_type: $('commType').value, direction: $('commDir').value, subject: $('commSubject').value, content: $('commContent').value, contact_person: $('commPerson').value, followup_required: $('commFollowupReq').checked, followup_date: $('commFollowup').value || null })
    });
    closeModal(); toast('Communication logged'); renderTenantDetail(tenantId);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

// ─── Documents ──────────────────────────────────────────────────
function uploadDoc(stationId, tenantId, defectId) {
  const cats = docCategories.length ? docCategories : ['Fire Safety Schedule (FSS)','Annual Fire Safety Statement (AFSS)','Fire Safety Certificate (FSC)','Inspection Certificate','Compliance Report','Defect Photo','Defect Report','Correspondence','General'];
  showModal('Upload Document', `
    <div class="form-group"><label>Category</label><select class="form-control" id="docCategory">
      ${cats.map(c => `<option ${defectId ? (c === 'Defect Photo' ? 'selected' : '') : ''}>${esc(c)}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>File</label><input type="file" class="form-control" id="docFile"></div>
    <div class="form-group"><label>Description</label><input class="form-control" id="docDesc" placeholder="Optional description"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDoc(${stationId},${tenantId},${defectId})">Upload</button>`);
}

async function saveDoc(stationId, tenantId, defectId) {
  const file = $('docFile').files[0];
  if (!file) { toast('Please select a file', 'error'); return; }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('category', $('docCategory').value);
  fd.append('description', $('docDesc').value);
  if (stationId && stationId !== 'null') fd.append('station_id', stationId);
  if (tenantId && tenantId !== 'null') fd.append('tenant_id', tenantId);
  if (defectId && defectId !== 'null') fd.append('defect_id', defectId);
  try {
    await fetch('/api/documents/upload', { method: 'POST', body: fd });
    closeModal(); toast('Document uploaded');
    if (window._currentTenant) renderTenantDetail(window._currentTenant.id);
    else if (window._currentStation) renderStationDetail(window._currentStation.id);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteDoc(id) {
  if (!confirm('Delete this document?')) return;
  try {
    await api(`/api/documents/${id}`, { method: 'DELETE' });
    toast('Document deleted');
    if (window._currentTenant) renderTenantDetail(window._currentTenant.id);
    else if (window._currentStation) renderStationDetail(window._currentStation.id);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

// ─── AFSS Schedule ──────────────────────────────────────────────
async function renderAFSS() {
  try {
    const data = await api('/api/afss');
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const byMonth = {};
    months.forEach(m => byMonth[m] = []);
    data.forEach(s => { const mn = s.afss_due_month_name; if (byMonth[mn]) byMonth[mn].push(s); });

    $('content').innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card primary"><div class="kpi-label">AFSS Stations</div><div class="kpi-value">${data.length}</div></div>
        <div class="kpi-card success"><div class="kpi-label">Compliant</div><div class="kpi-value">${data.filter(s => s.status === 'Compliant').length}</div></div>
        <div class="kpi-card warning"><div class="kpi-label">Pending</div><div class="kpi-value">${data.filter(s => s.status === 'Pending').length}</div></div>
        <div class="kpi-card danger"><div class="kpi-label">Outstanding</div><div class="kpi-value">${data.filter(s => s.status === 'Outstanding').length}</div></div>
      </div>
      <div class="afss-grid">
        ${months.map(m => `<div class="afss-month">
          <div class="afss-month-header"><span>${m}</span><span>${byMonth[m].length}</span></div>
          <div class="afss-month-body">
            ${byMonth[m].length ? byMonth[m].map(s => `<div class="afss-station ${s.status.toLowerCase()}" onclick="navigate('stations','${s.station_id}')">
              <span>${esc(s.station_name)}</span><span>${s.fsc_received}/${s.total_tenants}</span>
            </div>`).join('') : '<div class="text-muted text-sm" style="padding:8px">None</div>'}
          </div>
        </div>`).join('')}
      </div>
    `;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

// ─── Fire Safety Schedule ───────────────────────────────────────
async function renderFSS() {
  try {
    const data = await api('/api/fire-safety-schedule');
    const withFSS = data.filter(s => s.has_fss);
    const withoutFSS = data.filter(s => !s.has_fss);
    const totalFSSTenants = data.reduce((acc, s) => acc + s.fss_tenants, 0);
    const totalTenants = data.reduce((acc, s) => acc + s.total_tenants, 0);

    $('content').innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card success"><div class="kpi-label">Stations with FSS</div><div class="kpi-value">${withFSS.length}</div><div class="kpi-sub">of ${data.length} total</div></div>
        <div class="kpi-card warning"><div class="kpi-label">Stations without FSS</div><div class="kpi-value">${withoutFSS.length}</div></div>
        <div class="kpi-card primary"><div class="kpi-label">Tenants with FSS</div><div class="kpi-value">${totalFSSTenants}</div><div class="kpi-sub">of ${totalTenants} total</div></div>
      </div>
      <div class="filters">
        <input type="text" id="fssSearch" placeholder="Search stations..." oninput="filterFSS()">
        <select id="fssFilter" onchange="filterFSS()"><option value="">All</option><option value="yes">With FSS</option><option value="no">Without FSS</option></select>
        <span class="text-muted text-sm" id="fssCount">${data.length} stations</span>
      </div>
      <div id="fssGrid" style="display:flex;flex-direction:column;gap:8px">
        ${data.map(s => `<div class="fss-card ${s.has_fss ? 'has-fss' : 'no-fss'}" data-search="${s.station_name.toLowerCase()}" data-fss="${s.has_fss ? 'yes' : 'no'}" onclick="navigate('stations','${s.station_id}')">
          <div style="flex:1;min-width:0">
            <strong style="font-size:13px">${esc(s.station_name)}</strong>
            ${s.code ? ` <span class="text-muted text-sm">(${esc(s.code)})</span>` : ''}
            <div class="text-sm text-muted mt-2">${esc(s.region || '-')} | ${s.total_tenants} tenants | ${s.fss_tenants} with FSS</div>
            ${s.fss_notes ? `<div class="text-sm mt-2" style="color:var(--text)">${esc(s.fss_notes)}</div>` : ''}
          </div>
          <div class="flex gap-2 items-center">
            ${s.has_fss ? '<span class="badge badge-yes">FSS Active</span>' : '<span class="badge badge-no">No FSS</span>'}
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();toggleFSS(${s.station_id},${!s.has_fss})">${s.has_fss ? 'Remove FSS' : 'Add FSS'}</button>
          </div>
        </div>`).join('')}
      </div>
    `;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

function filterFSS() {
  const search = ($('fssSearch')?.value || '').toLowerCase();
  const filter = $('fssFilter')?.value || '';
  let count = 0;
  document.querySelectorAll('#fssGrid .fss-card').forEach(el => {
    const show = (!search || el.dataset.search.includes(search))
      && (!filter || el.dataset.fss === filter);
    el.style.display = show ? '' : 'none';
    if (show) count++;
  });
  const el = $('fssCount');
  if (el) el.textContent = `${count} stations`;
}

async function toggleFSS(stationId, newVal) {
  try {
    await api(`/api/fire-safety-schedule/${stationId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ has_fire_safety_schedule: newVal })
    });
    toast(newVal ? 'FSS enabled' : 'FSS removed'); renderFSS();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

// ─── Defects ────────────────────────────────────────────────────
async function renderDefects() {
  try {
    const defects = await api('/api/defects');
    $('content').innerHTML = `
      <div class="filters">
        <input type="text" id="defectSearch" placeholder="Search defects..." onkeyup="filterDefects()">
        <select id="defectRisk" onchange="filterDefects()"><option value="">All Risk</option><option>Major</option><option>Medium</option><option>Minor</option></select>
        <select id="defectProgress" onchange="filterDefects()"><option value="">All Progress</option><option>Outstanding</option><option>In Progress</option><option>Completed</option></select>
        <button class="btn btn-primary btn-sm" onclick="addDefect()">Add Defect</button>
        <span class="text-muted text-sm" id="defectCount">${defects.length} defects</span>
      </div>
      <div class="card"><div class="card-body table-wrap">
        <table><thead><tr><th>Site</th><th>Category</th><th>Risk</th><th>Progress</th><th>Audit Type</th><th>Audit Date</th><th>FY</th><th>Files</th></tr></thead>
        <tbody id="defectTableBody">
          ${defects.map(d => `<tr class="clickable" onclick="editDefect(${d.id})" data-search="${(d.site_name + ' ' + (d.category || '')).toLowerCase()}" data-risk="${d.risk || ''}" data-progress="${d.progress || ''}">
            <td>${esc(d.site_name)}</td><td>${esc(d.category || '-')}</td><td>${riskBadge(d.risk)}</td>
            <td>${progressBadge(d.progress)}</td><td>${esc(d.audit_type || '-')}</td><td>${esc(d.audit_date || '-')}</td><td>${esc(d.financial_year || '-')}</td>
            <td>${d.doc_count ? `<span class="badge badge-doc">${d.doc_count}</span>` : '-'}</td>
          </tr>`).join('')}
        </tbody></table>
      </div></div>
    `;
    window._allDefects = defects;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

function filterDefects() {
  const search = ($('defectSearch')?.value || '').toLowerCase();
  const risk = $('defectRisk')?.value || '';
  const progress = $('defectProgress')?.value || '';
  let count = 0;
  document.querySelectorAll('#defectTableBody tr').forEach(tr => {
    const show = (!search || tr.dataset.search.includes(search))
      && (!risk || tr.dataset.risk === risk)
      && (!progress || tr.dataset.progress === progress);
    tr.style.display = show ? '' : 'none';
    if (show) count++;
  });
  const el = $('defectCount');
  if (el) el.textContent = `${count} defects`;
}

function addDefect() {
  showModal('Add Defect', `
    <div class="form-group"><label>Site Name</label><input class="form-control" id="newDefectSite" placeholder="Station / site name"></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><input class="form-control" id="newDefectCat" placeholder="e.g. Fire Safety, Electrical"></div>
      <div class="form-group"><label>Risk</label><select class="form-control" id="newDefectRisk"><option>Minor</option><option>Medium</option><option>Major</option></select></div>
    </div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="newDefectDesc" rows="3"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Audit Date</label><input class="form-control" type="date" id="newDefectDate"></div>
      <div class="form-group"><label>Assigned To</label><input class="form-control" id="newDefectAssign"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDefect()">Save</button>`);
}

function addDefectForStation(stationId, stationName) {
  showModal('Add Defect', `
    <div class="form-group"><label>Site Name</label><input class="form-control" id="newDefectSite" value="${esc(stationName)}"></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><input class="form-control" id="newDefectCat" placeholder="e.g. Fire Safety, Electrical"></div>
      <div class="form-group"><label>Risk</label><select class="form-control" id="newDefectRisk"><option>Minor</option><option>Medium</option><option>Major</option></select></div>
    </div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="newDefectDesc" rows="3"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Audit Date</label><input class="form-control" type="date" id="newDefectDate"></div>
      <div class="form-group"><label>Assigned To</label><input class="form-control" id="newDefectAssign"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDefectWithContext(${stationId},null)">Save</button>`);
}

function addDefectForTenant() {
  const t = window._currentTenant;
  if (!t) return;
  showModal('Add Defect', `
    <div class="form-group"><label>Site Name</label><input class="form-control" id="newDefectSite" value="${esc(t.station_name)}"></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><input class="form-control" id="newDefectCat" placeholder="e.g. Fire Safety, Electrical"></div>
      <div class="form-group"><label>Risk</label><select class="form-control" id="newDefectRisk"><option>Minor</option><option>Medium</option><option>Major</option></select></div>
    </div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="newDefectDesc" rows="3"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Audit Date</label><input class="form-control" type="date" id="newDefectDate"></div>
      <div class="form-group"><label>Assigned To</label><input class="form-control" id="newDefectAssign"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDefectWithContext(${t.station_id},${t.id})">Save</button>`);
}

async function saveDefect() {
  try {
    await api('/api/defects', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: $('newDefectSite').value, category: $('newDefectCat').value, risk: $('newDefectRisk').value, description: $('newDefectDesc').value, audit_date: $('newDefectDate').value, assigned_to: $('newDefectAssign').value })
    });
    closeModal(); toast('Defect created'); renderDefects();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function saveDefectWithContext(stationId, tenantId) {
  try {
    await api('/api/defects', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: $('newDefectSite').value, category: $('newDefectCat').value, risk: $('newDefectRisk').value, description: $('newDefectDesc').value, audit_date: $('newDefectDate').value, assigned_to: $('newDefectAssign').value, station_id: stationId, tenant_id: tenantId })
    });
    closeModal(); toast('Defect created');
    if (tenantId) renderTenantDetail(tenantId);
    else if (stationId) renderStationDetail(stationId);
    else renderDefects();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function editDefect(id) {
  let d = (window._allDefects || []).find(x => x.id === id);
  if (!d) { try { const all = await api('/api/defects'); d = all.find(x => x.id === id); } catch(e) {} }
  if (!d) { toast('Defect not found', 'error'); return; }

  showModal('Edit Defect', `
    <div class="form-group"><label>Site Name</label><input class="form-control" value="${esc(d.site_name || '')}" readonly style="background:var(--bg)"></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><input class="form-control" id="editDefectCat" value="${esc(d.category || '')}"></div>
      <div class="form-group"><label>Risk</label><select class="form-control" id="editDefectRisk">
        ${['Major','Medium','Minor'].map(r => `<option ${d.risk === r ? 'selected' : ''}>${r}</option>`).join('')}
      </select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Progress</label><select class="form-control" id="editDefectProgress">
        ${['Outstanding','In Progress','Completed'].map(p => `<option ${d.progress === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Assigned To</label><input class="form-control" id="editDefectAssign" value="${esc(d.assigned_to || '')}"></div>
    </div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="editDefectDesc" rows="3">${esc(d.description || '')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Due Date</label><input class="form-control" type="date" id="editDefectDue" value="${d.due_date || ''}"></div>
      <div class="form-group"><label>Resolved Date</label><input class="form-control" type="date" id="editDefectResolved" value="${d.resolved_date || ''}"></div>
    </div>
    <div class="form-group"><label>Resolution Notes</label><textarea class="form-control" id="editDefectResNotes" rows="2">${esc(d.resolution_notes || '')}</textarea></div>
    <div class="text-muted text-sm mt-2">Audit: ${esc(d.audit_type || '-')} | ${esc(d.audit_date || '-')} | FY ${esc(d.financial_year || '-')}</div>
    <div class="mt-4"><button class="btn btn-secondary btn-sm" onclick="uploadDoc(null,null,${id})">Attach File/Photo</button></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDefectEdit(${id})">Save</button>`);
}

async function saveDefectEdit(id) {
  try {
    await api(`/api/defects/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        risk: $('editDefectRisk').value, progress: $('editDefectProgress').value,
        description: $('editDefectDesc').value, category: $('editDefectCat').value,
        assigned_to: $('editDefectAssign').value || null, due_date: $('editDefectDue').value || null,
        resolved_date: $('editDefectResolved').value || null, resolution_notes: $('editDefectResNotes').value || null,
      })
    });
    closeModal(); toast('Defect updated');
    if (currentPage === 'defects') renderDefects();
    else if (window._currentTenant) renderTenantDetail(window._currentTenant.id);
    else if (window._currentStation) renderStationDetail(window._currentStation.id);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

// ─── Analytics ──────────────────────────────────────────────────
async function renderAnalytics() {
  try {
    const d = await api('/api/analytics');
    const sortDesc = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const colors = ['blue','green','amber','red','teal'];

    $('content').innerHTML = `
      <div class="chart-grid">
        <div class="card"><div class="card-header"><h3>Defects by Category</h3></div><div class="card-body">
          ${barChart(sortDesc(d.defects_by_category).slice(0, 10).map(([k, v], i) => ({ label: k, value: v, color: colors[i % 5] })))}
        </div></div>
        <div class="card"><div class="card-header"><h3>Defects by Risk Level</h3></div><div class="card-body">
          ${barChart(sortDesc(d.defects_by_risk).map(([k, v]) => ({ label: k, value: v, color: k === 'Major' ? 'red' : k === 'Medium' ? 'amber' : 'green' })))}
        </div></div>
      </div>
      <div class="chart-grid">
        <div class="card"><div class="card-header"><h3>Defects by Progress</h3></div><div class="card-body">
          ${barChart(sortDesc(d.defects_by_progress).map(([k, v]) => ({ label: k, value: v, color: k === 'Completed' ? 'green' : k === 'Outstanding' ? 'red' : 'amber' })))}
        </div></div>
        <div class="card"><div class="card-header"><h3>FSC Status Distribution</h3></div><div class="card-body">
          ${barChart(sortDesc(d.fsc_distribution).map(([k, v]) => ({ label: k, value: v, color: k === 'Compliant' || k === 'Received' ? 'green' : k === 'Pending' ? 'amber' : k === 'Outstanding' ? 'red' : 'blue' })))}
        </div></div>
      </div>
      <div class="chart-grid">
        <div class="card"><div class="card-header"><h3>Tenants by Lease Status</h3></div><div class="card-body">
          ${barChart(sortDesc(d.lease_distribution).slice(0, 8).map(([k, v], i) => ({ label: k, value: v, color: colors[i % 5] })))}
        </div></div>
        <div class="card"><div class="card-header"><h3>Tenants by Region</h3></div><div class="card-body">
          ${barChart(sortDesc(d.region_distribution).map(([k, v], i) => ({ label: k, value: v, color: colors[i % 5] })))}
        </div></div>
      </div>
      <div class="chart-grid">
        <div class="card"><div class="card-header"><h3>Top Stations by Open Defects</h3></div><div class="card-body">
          ${barChart(sortDesc(d.defects_by_station).slice(0, 15).map(([k, v]) => ({ label: k, value: v, color: 'red' })))}
        </div></div>
        <div class="card"><div class="card-header"><h3>AFSS Monthly Distribution</h3></div><div class="card-body">
          ${barChart(Object.entries(d.afss_monthly).map(([k, v]) => ({ label: k.slice(0, 3), value: v, color: 'blue' })))}
        </div></div>
      </div>
    `;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

// ─── Monthly Reports ────────────────────────────────────────────
async function renderReports() {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  $('content').innerHTML = `
    <div class="filters">
      <select id="reportMonth" onchange="loadReport()">
        ${['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => `<option value="${i+1}" ${i+1 === curMonth ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
      <select id="reportYear" onchange="loadReport()">
        ${[curYear-1, curYear, curYear+1].map(y => `<option value="${y}" ${y === curYear ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
      <button class="btn btn-primary btn-sm" onclick="window.print()">Print Report</button>
    </div>
    <div id="reportContent">${loading()}</div>
  `;
  loadReport();
}

async function loadReport() {
  const month = $('reportMonth').value;
  const year = $('reportYear').value;
  try {
    const r = await api(`/api/reports/monthly?month=${month}&year=${year}`);
    $('reportContent').innerHTML = `
      <div class="report-page">
        <div class="report-header">
          <h2>Fire Safety Compliance Report</h2>
          <p>${r.report_month_name} ${r.report_year} | Monthly Summary</p>
        </div>
        <div class="report-body">
          <div class="report-section">
            <h3>Executive Summary</h3>
            <div class="report-kpi-grid">
              <div class="report-kpi"><div class="rk-value">${r.total_stations}</div><div class="rk-label">Total Stations</div></div>
              <div class="report-kpi"><div class="rk-value">${r.active_tenants}</div><div class="rk-label">Active Tenants</div></div>
              <div class="report-kpi"><div class="rk-value" style="color:${complianceColor(r.compliance_rate)}">${r.compliance_rate}%</div><div class="rk-label">Compliance Rate</div></div>
              <div class="report-kpi"><div class="rk-value" style="color:${complianceColor(r.fsc_pct)}">${r.fsc_pct}%</div><div class="rk-label">FSC Received %</div></div>
              <div class="report-kpi"><div class="rk-value" style="color:var(--danger)">${r.open_defects}</div><div class="rk-label">Open Defects</div></div>
              <div class="report-kpi"><div class="rk-value">${r.fss_stations}</div><div class="rk-label">FSS Stations</div></div>
            </div>
          </div>

          <div class="report-section">
            <h3>Fire Safety Certificate Status</h3>
            <div class="report-kpi-grid">
              <div class="report-kpi" style="background:var(--success-bg);border-color:#a7f3d0"><div class="rk-value" style="color:var(--success)">${r.fsc_compliant}</div><div class="rk-label">Compliant</div></div>
              <div class="report-kpi" style="background:var(--info-bg);border-color:#a5f3fc"><div class="rk-value" style="color:var(--info)">${r.fsc_received}</div><div class="rk-label">Received</div></div>
              <div class="report-kpi" style="background:var(--warning-bg);border-color:#fde68a"><div class="rk-value" style="color:var(--warning)">${r.fsc_pending}</div><div class="rk-label">Pending</div></div>
              <div class="report-kpi" style="background:var(--danger-bg);border-color:#fecaca"><div class="rk-value" style="color:var(--danger)">${r.fsc_outstanding}</div><div class="rk-label">Outstanding</div></div>
            </div>
            ${barChart([
              { label: 'Compliant', value: r.fsc_compliant, color: 'green' },
              { label: 'Received', value: r.fsc_received, color: 'teal' },
              { label: 'Pending', value: r.fsc_pending, color: 'amber' },
              { label: 'Outstanding', value: r.fsc_outstanding, color: 'red' }
            ])}
          </div>

          <div class="report-section">
            <h3>Priority Distribution</h3>
            ${barChart([
              { label: 'Critical', value: r.priority_distribution.Critical, color: 'red' },
              { label: 'High', value: r.priority_distribution.High, color: 'amber' },
              { label: 'Medium', value: r.priority_distribution.Medium, color: 'blue' },
              { label: 'Low', value: r.priority_distribution.Low, color: 'green' },
            ])}
          </div>

          <div class="report-section">
            <h3>Defect Summary</h3>
            <div class="report-kpi-grid">
              <div class="report-kpi"><div class="rk-value">${r.total_defects}</div><div class="rk-label">Total Defects</div></div>
              <div class="report-kpi" style="background:var(--danger-bg);border-color:#fecaca"><div class="rk-value" style="color:var(--danger)">${r.open_defects}</div><div class="rk-label">Open</div></div>
              <div class="report-kpi" style="background:var(--danger-bg);border-color:#fecaca"><div class="rk-value" style="color:var(--danger)">${r.major_open_defects}</div><div class="rk-label">Major Open</div></div>
              <div class="report-kpi" style="background:var(--success-bg);border-color:#a7f3d0"><div class="rk-value" style="color:var(--success)">${r.completed_defects}</div><div class="rk-label">Completed</div></div>
            </div>
          </div>

          ${r.afss_due_this_month.length ? `<div class="report-section">
            <h3>AFSS Due This Month (${r.report_month_name})</h3>
            <table class="report-table"><thead><tr><th>Station</th><th>Code</th><th>Active Tenants</th><th>FSC Received</th><th>Outstanding</th><th>Compliance</th></tr></thead><tbody>
              ${r.afss_due_this_month.map(s => `<tr>
                <td><strong>${esc(s.station_name)}</strong></td><td>${esc(s.code || '-')}</td>
                <td>${s.total_tenants}</td><td>${s.fsc_received}</td><td>${s.fsc_outstanding}</td>
                <td><strong style="color:${complianceColor(s.compliance_rate)}">${s.compliance_rate}%</strong></td>
              </tr>`).join('')}
            </tbody></table>
          </div>` : ''}

          <div class="report-section">
            <h3>Compliance by Region</h3>
            <table class="report-table"><thead><tr><th>Region</th><th>Active Tenants</th><th>Compliant</th><th>Compliance Rate</th></tr></thead><tbody>
              ${r.region_compliance.map(rc => `<tr>
                <td><strong>${esc(rc.region)}</strong></td><td>${rc.active_tenants}</td><td>${rc.compliant}</td>
                <td><strong style="color:${complianceColor(rc.compliance_rate)}">${rc.compliance_rate}%</strong></td>
              </tr>`).join('')}
            </tbody></table>
          </div>

          <div class="report-section">
            <h3>AFSS Monthly Overview</h3>
            <table class="report-table"><thead><tr><th>Month</th><th>Stations</th><th>Tenants</th><th>Compliant</th><th>Rate</th></tr></thead><tbody>
              ${Object.entries(r.afss_monthly).map(([m, d]) => `<tr ${m === r.report_month_name ? 'style="background:var(--primary-bg)"' : ''}>
                <td><strong>${esc(m)}</strong></td><td>${d.stations}</td><td>${d.tenants}</td><td>${d.compliant}</td>
                <td><strong style="color:${complianceColor(d.rate)}">${d.rate}%</strong></td>
              </tr>`).join('')}
            </tbody></table>
          </div>
        </div>
      </div>
    `;
  } catch (e) { $('reportContent').innerHTML = `<p>Error: ${e.message}</p>`; }
}

// ─── Global Search ──────────────────────────────────────────────
async function doGlobalSearch() {
  const q = $('globalSearch').value.trim();
  if (q.length < 2) return;
  navigate('search', q);
}

async function renderSearchResults(query) {
  $('pageTitle').textContent = `Search: "${query}"`;
  try {
    const r = await api(`/api/search?q=${encodeURIComponent(query)}`);
    $('content').innerHTML = `
      <h3 class="mb-4">Search Results for "${esc(query)}"</h3>
      ${r.stations.length ? `<div class="card mb-4"><div class="card-header"><h3>Stations (${r.stations.length})</h3></div><div class="card-body table-wrap">
        <table><thead><tr><th>Station</th><th>Region</th><th>Tenants</th><th>AFSS</th></tr></thead><tbody>
          ${r.stations.map(s => `<tr class="clickable" onclick="navigate('stations','${s.id}')"><td><strong>${esc(s.name)}</strong></td><td>${esc(s.region || '-')}</td><td>${s.tenant_count}</td><td>${s.afss_due_month_name || '-'}</td></tr>`).join('')}
        </tbody></table></div></div>` : ''}
      ${r.tenants.length ? `<div class="card mb-4"><div class="card-header"><h3>Tenants (${r.tenants.length})</h3></div><div class="card-body table-wrap">
        <table><thead><tr><th>Station</th><th>Tenant</th><th>File #</th><th>Priority</th><th>FSC</th></tr></thead><tbody>
          ${r.tenants.map(t => `<tr class="clickable" onclick="navigate('tenants','${t.id}')"><td>${esc(t.station_name)}</td><td><strong>${esc(t.tenant_name)}</strong></td><td>${esc(t.file_number || '-')}</td><td>${priorityBadge(t.priority)}</td><td>${fscBadge(t.fsc_status)}</td></tr>`).join('')}
        </tbody></table></div></div>` : ''}
      ${r.defects.length ? `<div class="card mb-4"><div class="card-header"><h3>Defects (${r.defects.length})</h3></div><div class="card-body table-wrap">
        <table><thead><tr><th>Site</th><th>Category</th><th>Risk</th><th>Progress</th></tr></thead><tbody>
          ${r.defects.map(d => `<tr><td>${esc(d.site_name)}</td><td>${esc(d.category || '-')}</td><td>${riskBadge(d.risk)}</td><td>${progressBadge(d.progress)}</td></tr>`).join('')}
        </tbody></table></div></div>` : ''}
      ${!r.stations.length && !r.tenants.length && !r.defects.length ? '<p class="text-muted">No results found</p>' : ''}
    `;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

// ─── Timeline ───────────────────────────────────────────────────
async function loadTimeline(stationId, tenantId) {
  const el = $('timelineContent');
  if (!el) return;
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading timeline...</div>';
  try {
    const params = new URLSearchParams();
    if (stationId) params.set('station_id', stationId);
    if (tenantId) params.set('tenant_id', tenantId);
    const events = await api(`/api/timeline?${params}`);

    if (!events.length) {
      el.innerHTML = '<p class="text-muted">No timeline events yet. Activities, notes, communications, and defects will appear here.</p>';
      return;
    }

    el.innerHTML = `<div class="timeline">${events.map(e => {
      const icon = e.type === 'note' ? '&#128221;' : e.type === 'communication' ? '&#128172;' : e.type === 'defect' ? '&#9888;' : '&#9679;';
      const dateStr = e.date ? new Date(e.date).toLocaleString() : '';
      const meta = [];
      if (e.user) meta.push(esc(e.user));
      if (e.direction) meta.push(esc(e.direction));
      if (e.risk) meta.push(riskBadge(e.risk));
      if (e.progress) meta.push(progressBadge(e.progress));
      return `<div class="timeline-event timeline-${e.type}">
        <div class="timeline-icon">${icon}</div>
        <div class="timeline-body">
          <div class="timeline-header"><strong>${esc(e.title)}</strong><span class="timeline-date">${dateStr}</span></div>
          ${e.description ? `<div class="timeline-desc">${esc(e.description)}</div>` : ''}
          ${meta.length ? `<div class="timeline-meta">${meta.join(' &middot; ')}</div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
  } catch (e) {
    el.innerHTML = `<p class="text-muted">Error loading timeline: ${e.message}</p>`;
  }
}

// ─── Init ───────────────────────────────────────────────────────
init();

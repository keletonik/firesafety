/* Fire Safety Compliance Platform - Frontend Application */

const API = '';
let currentPage = 'dashboard';
let filterOptions = {};

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

function badge(type, text) {
  const cls = type.toLowerCase().replace(/\s+/g, '-');
  return `<span class="badge badge-${cls}">${esc(text)}</span>`;
}

function priorityBadge(p) { return badge(p || 'medium', p || 'Medium'); }
function fscBadge(s) { return badge(s === 'Pending' ? 'pending' : s === 'Outstanding' ? 'outstanding' : (s === 'Received' || s === 'Compliant') ? 'compliant' : 'info', s || 'Pending'); }
function riskBadge(r) { return badge(r === 'Major' ? 'critical' : r === 'Medium' ? 'high' : r === 'Minor' ? 'medium' : 'low', r || '-'); }
function progressBadge(p) { return badge(p === 'Completed' ? 'compliant' : p === 'Outstanding' ? 'outstanding' : p === 'In Progress' ? 'pending' : 'info', p || '-'); }

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
  const titles = { dashboard: 'Dashboard', stations: 'Stations', tenants: 'Tenants', afss: 'AFSS Schedule', defects: 'Defects', analytics: 'Analytics' };
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
  try { filterOptions = await api('/api/filters'); } catch (e) { console.warn('filters failed', e); }
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
    case 'defects': renderDefects(); break;
    case 'analytics': renderAnalytics(); break;
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
        <input type="text" id="stationSearch" placeholder="Search stations..." value="" onkeyup="filterStations()">
        <select id="stationRegion" onchange="filterStations()"><option value="">All Regions</option>${(filterOptions.regions || []).map(r => `<option>${esc(r)}</option>`).join('')}</select>
        <label><input type="checkbox" id="stationAFSS" onchange="filterStations()"> AFSS Only</label>
        <span class="text-muted text-sm" id="stationCount">${stations.length} stations</span>
      </div>
      <div class="card"><div class="card-body table-wrap">
        <table><thead><tr><th>Station</th><th>Region</th><th>Tenants</th><th>AFSS Due</th><th>AFSS Likely</th><th>Critical</th><th>Open Defects</th></tr></thead>
        <tbody id="stationTableBody">
          ${stations.map(s => stationRow(s)).join('')}
        </tbody></table>
      </div></div>
    `;
    window._stations = stations;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

function stationRow(s) {
  return `<tr class="clickable" onclick="navigate('stations','${s.id}')" data-search="${(s.name + ' ' + (s.region || '') + ' ' + (s.council || '')).toLowerCase()}" data-region="${s.region || ''}" data-afss="${s.afss_due_month ? '1' : ''}">
    <td><strong>${esc(s.name)}</strong>${s.code ? ` <span class="text-muted">(${esc(s.code)})</span>` : ''}</td>
    <td>${esc(s.region || '-')}</td><td>${s.tenant_count || 0}</td>
    <td>${s.afss_due_month_name || '-'}</td><td>${s.afss_likely === 'Yes' ? badge('compliant', 'Yes') : s.afss_likely === 'No' ? badge('pending', 'No') : '-'}</td>
    <td>${s.critical_count ? badge('critical', s.critical_count) : '0'}</td><td>${s.open_defects || 0}</td>
  </tr>`;
}

function filterStations() {
  const search = ($('stationSearch')?.value || '').toLowerCase();
  const region = $('stationRegion')?.value || '';
  const afssOnly = $('stationAFSS')?.checked || false;
  let count = 0;
  document.querySelectorAll('#stationTableBody tr').forEach(tr => {
    const show = (!search || tr.dataset.search.includes(search))
      && (!region || tr.dataset.region === region)
      && (!afssOnly || tr.dataset.afss === '1');
    tr.style.display = show ? '' : 'none';
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
    $('content').innerHTML = `
      <div class="detail-header"><span class="back-btn" onclick="navigate('stations')">&#8592;</span><h2>${esc(s.name)}</h2>
        ${s.code ? `<span class="badge badge-info">${esc(s.code)}</span>` : ''}
        ${s.has_fire_safety_schedule ? badge('compliant', 'Fire Safety Schedule') : ''}
      </div>
      <div class="detail-grid">
        <div class="card"><div class="card-header"><h3>Station Info</h3></div><div class="card-body">
          ${infoRow('Region', s.region)}${infoRow('Building', s.building_name)}${infoRow('Address', s.address)}
          ${infoRow('Council', s.council)}${infoRow('AFSS Due', s.afss_due_month_name)}${infoRow('FSC Due', s.tenant_fsc_due_month_name)}
          ${infoRow('Inspection Month', s.inspection_month_name)}${infoRow('Lease Type', s.lease_type_category)}
          ${infoRow('AFSS Likely', s.afss_likely)}${infoRow('ICOMPLY Contact', s.icomply_contact)}
        </div></div>
        <div class="card"><div class="card-header"><h3>Summary</h3></div><div class="card-body">
          ${infoRow('Total Tenants', s.tenant_count)}${infoRow('Critical', s.critical_count || 0)}
          ${infoRow('High Priority', s.high_count || 0)}${infoRow('FSC Received', s.fsc_received || 0)}
          ${infoRow('FSC Outstanding', s.fsc_outstanding || 0)}${infoRow('Defects', (s.defects || []).length)}
        </div></div>
      </div>
      <div class="card mt-4"><div class="card-header"><h3>Tenants (${(s.tenants || []).length})</h3></div><div class="card-body table-wrap">
        <table><thead><tr><th>Tenant</th><th>File #</th><th>Status</th><th>Priority</th><th>FSC</th><th>Defects</th></tr></thead><tbody>
          ${(s.tenants || []).map(t => `<tr class="clickable" onclick="navigate('tenants','${t.id}')">
            <td><strong>${esc(t.tenant_name)}</strong>${t.trading_name ? `<br><span class="text-muted text-sm">${esc(t.trading_name)}</span>` : ''}</td>
            <td>${esc(t.file_number || '-')}</td><td>${esc(t.lease_status || '-')}</td>
            <td>${priorityBadge(t.priority)}</td><td>${fscBadge(t.fsc_status)}</td><td>${t.open_defects || 0}</td>
          </tr>`).join('')}
        </tbody></table>
      </div></div>
      ${(s.defects || []).length ? `<div class="card mt-4"><div class="card-header"><h3>Defects (${s.defects.length})</h3></div><div class="card-body table-wrap">
        <table><thead><tr><th>Category</th><th>Risk</th><th>Progress</th><th>Audit Date</th><th>Actions</th></tr></thead><tbody>
          ${s.defects.map(d => `<tr class="clickable" onclick="editDefect(${d.id})"><td>${esc(d.category || '-')}</td><td>${riskBadge(d.risk)}</td><td>${progressBadge(d.progress)}</td><td>${esc(d.audit_date || '-')}</td>
            <td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();editDefect(${d.id})">Edit</button></td></tr>`).join('')}
        </tbody></table>
      </div></div>` : ''}
      <div class="card mt-4"><div class="card-header"><h3>Timeline</h3></div><div class="card-body" id="timelineContent">
        <div class="loading-overlay"><div class="spinner"></div> Loading...</div>
      </div></div>
    `;
    window._allDefects = s.defects || [];
    loadTimeline(s.id, null);
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

function infoRow(label, value) {
  return `<div class="info-row"><span class="label">${esc(label)}</span><span class="value">${esc(value || '-')}</span></div>`;
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
      <div class="flex justify-between items-center mb-2">
        <span class="text-muted text-sm">${fmtN(total)} tenants found</span>
      </div>
      <div class="card"><div class="card-body table-wrap">
        <table><thead><tr><th>Station</th><th>Tenant</th><th>File #</th><th>Lease Status</th><th>Priority</th><th>FSC</th><th>Defects</th><th>Source</th></tr></thead><tbody>
          ${tenants.map(t => `<tr class="clickable" onclick="navigate('tenants','${t.id}')">
            <td>${esc(t.station_name)}</td>
            <td><strong>${esc(t.tenant_name)}</strong>${t.trading_name ? `<br><span class="text-muted text-sm">${esc(t.trading_name)}</span>` : ''}</td>
            <td>${esc(t.file_number || '-')}</td><td>${esc(t.lease_status || '-')}</td>
            <td>${priorityBadge(t.priority)}</td><td>${fscBadge(t.fsc_status)}</td>
            <td>${t.open_defects || 0}</td><td><span class="badge badge-info">${esc(t.data_source || '-')}</span></td>
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
    $('content').innerHTML = `
      <div class="detail-header">
        <span class="back-btn" onclick="navigate('tenants')">&#8592;</span>
        <div><h2>${esc(t.tenant_name)}</h2><span class="text-muted">${esc(t.station_name)} | ${esc(t.zone || '')}</span></div>
        <div class="flex gap-2">${priorityBadge(t.priority)} ${fscBadge(t.fsc_status)}</div>
      </div>
      <div class="tabs" id="tenantTabs">
        <div class="tab active" onclick="switchTab('details')">Details</div>
        <div class="tab" onclick="switchTab('fire')">Fire Safety</div>
        <div class="tab" onclick="switchTab('contact')">Contact</div>
        <div class="tab" onclick="switchTab('financial')">Financial</div>
        <div class="tab" onclick="switchTab('defectsTab')">Defects (${(t.defects || []).length})</div>
        <div class="tab" onclick="switchTab('notesTab')">Notes</div>
        <div class="tab" onclick="switchTab('commsTab')">Communications</div>
        <div class="tab" onclick="switchTab('timelineTab');loadTimeline(null,${t.id})">Timeline</div>
      </div>

      <div class="tab-content active" id="tab-details">
        <div class="detail-grid">
          <div class="card"><div class="card-header"><h3>Lease Information</h3><button class="btn btn-primary btn-sm" onclick="editTenantFSC(${t.id})">Update FSC Status</button></div><div class="card-body">
            ${infoRow('Tenant Name', t.tenant_name)}${infoRow('Trading Name', t.trading_name)}
            ${infoRow('File Number', t.file_number)}${infoRow('Lease ID', t.lease_id)}
            ${infoRow('Agreement #', t.agreement_number)}${infoRow('Region', t.region)}
            ${infoRow('Lease Status', t.lease_status)}${infoRow('Lease Type', t.lease_type)}
            ${infoRow('Lease Start', t.lease_start)}${infoRow('Lease Expiry', t.lease_expiry)}
            ${infoRow('Lease Terms', t.lease_terms)}${infoRow('Industry', t.standard_industry_class)}
            ${infoRow('Property Manager', t.property_manager)}${infoRow('Heritage', t.heritage)}
            ${infoRow('Data Source', t.data_source)}
          </div></div>
          <div class="card"><div class="card-header"><h3>Compliance Status</h3></div><div class="card-body">
            ${infoRow('Priority', t.priority)}${infoRow('FSC Status', t.fsc_status)}
            ${infoRow('FSC Requested', t.fsc_requested_date)}${infoRow('FSC Received', t.fsc_received_date)}
            ${infoRow('AFSS Month', t.afss_month_name)}${infoRow('FSC Due Month', t.fsc_due_month_name)}
            ${infoRow('Open Defects', t.open_defects)}${infoRow('Major Defects', t.major_defects)}
            ${infoRow('Premises', t.premises_description)}${infoRow('Lots/DP', t.lots_dp_numbers)}
            ${t.lease_note ? infoRow('Lease Note', t.lease_note) : ''}
          </div></div>
        </div>
      </div>

      <div class="tab-content" id="tab-fire">
        <div class="card"><div class="card-header"><h3>Fire Safety Observations</h3><button class="btn btn-primary btn-sm" onclick="editFireSafety(${t.id})">Edit Observations</button></div><div class="card-body">
          <div class="detail-grid">
            <div>
              ${infoRow('Exit Lighting', t.exit_lighting)}${infoRow('Evacuation Diagrams', t.evacuation_diagrams)}
              ${infoRow('Emergency Pathway', t.emergency_pathway)}${infoRow('Fire Detection', t.fire_detection)}
              ${infoRow('Fire Sprinklers', t.fire_sprinklers)}${infoRow('Fire Hydrants', t.fire_hydrants)}
            </div><div>
              ${infoRow('Fire Extinguishers', t.fire_extinguishers)}${infoRow('Emergency Lighting', t.emergency_lighting)}
              ${infoRow('Fire Doors', t.fire_doors)}${infoRow('Fire Walls', t.fire_walls)}
              ${infoRow('Mechanical Ventilation', t.mechanical_ventilation)}${infoRow('Last Inspection', t.last_inspection_date)}
            </div>
          </div>
          ${infoRow('Fire Equip Service Date', t.fire_equipment_service_date)}
          ${infoRow('Fire Equip Service Due', t.fire_equipment_service_due)}
          ${t.possible_afss_issues ? `<div class="mt-4"><strong>Possible AFSS Issues:</strong><p class="mt-2">${esc(t.possible_afss_issues)}</p></div>` : ''}
          ${t.comments_to_site_staff ? `<div class="mt-4"><strong>Comments to Site Staff:</strong><p class="mt-2">${esc(t.comments_to_site_staff)}</p></div>` : ''}
        </div></div>
      </div>

      <div class="tab-content" id="tab-contact">
        <div class="card"><div class="card-header"><h3>Contact Information</h3></div><div class="card-body">
          <div class="detail-grid">
            <div>
              ${infoRow('Contact Name', t.contact_name)}${infoRow('Phone', t.contact_phone)}
              ${infoRow('Phone 2', t.contact_phone2)}${infoRow('Mobile', t.contact_mobile)}
              ${infoRow('Email', t.contact_email)}${infoRow('Billing Email', t.billing_email)}
            </div><div>
              ${infoRow('ABN', t.abn)}${infoRow('Billing Name', t.billing_name)}
              ${infoRow('Billing Address', t.billing_address)}${infoRow('Billing City', t.billing_city)}
              ${infoRow('Billing State', t.billing_state)}${infoRow('Billing Postcode', t.billing_postcode)}
            </div>
          </div>
        </div></div>
      </div>

      <div class="tab-content" id="tab-financial">
        <div class="card"><div class="card-header"><h3>Financial</h3></div><div class="card-body">
          ${infoRow('Base Rent p.a.', fmt$(t.base_rent_pa))}${infoRow('$/psm p.a.', fmt$(t.rent_psm_pa))}
          ${infoRow('Total Passing Rent p.a.', fmt$(t.total_passing_rent_pa))}${infoRow('Rent Income Code', t.rent_income_code)}
        </div></div>
      </div>

      <div class="tab-content" id="tab-defectsTab">
        <div class="card"><div class="card-header"><h3>Defects (${(t.defects || []).length})</h3><button class="btn btn-primary btn-sm" onclick="addDefectForTenant()">Add Defect</button></div><div class="card-body table-wrap">
          ${(t.defects || []).length ? `<table><thead><tr><th>Site</th><th>Category</th><th>Risk</th><th>Progress</th><th>Assigned To</th><th>Audit Date</th><th>Actions</th></tr></thead><tbody>
            ${t.defects.map(d => `<tr class="clickable" onclick="editDefect(${d.id})">
              <td>${esc(d.site_name || '-')}</td><td>${esc(d.category || '-')}</td><td>${riskBadge(d.risk)}</td>
              <td>${progressBadge(d.progress)}</td><td>${esc(d.assigned_to || '-')}</td><td>${esc(d.audit_date || '-')}</td>
              <td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();editDefect(${d.id})">Edit</button></td>
            </tr>`).join('')}
          </tbody></table>` : '<p class="text-muted">No defects recorded for this tenancy or station</p>'}
        </div></div>
      </div>

      <div class="tab-content" id="tab-notesTab">
        <div class="card"><div class="card-header"><h3>Notes</h3><button class="btn btn-primary btn-sm" onclick="addNote(null,${t.id})">Add Note</button></div><div class="card-body" id="notesList">
          ${(t.notes || []).map(n => `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><p>${esc(n.content)}</p><small class="text-muted">${n.created_at ? new Date(n.created_at).toLocaleString() : ''} ${n.created_by ? '- ' + esc(n.created_by) : ''}</small></div>`).join('') || '<p class="text-muted">No notes</p>'}
        </div></div>
      </div>

      <div class="tab-content" id="tab-commsTab">
        <div class="card"><div class="card-header"><h3>Communications</h3><button class="btn btn-primary btn-sm" onclick="addComm(${t.id})">Log Communication</button></div><div class="card-body" id="commsList">
          ${(t.communications || []).map(c => `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div class="flex justify-between"><strong>${esc(c.subject || c.comm_type)}</strong><span class="badge badge-info">${esc(c.comm_type)}</span></div>
            <p class="text-sm mt-2">${esc(c.content || '')}</p>
            <small class="text-muted">${esc(c.direction || '')} | ${c.created_at ? new Date(c.created_at).toLocaleString() : ''}</small>
          </div>`).join('') || '<p class="text-muted">No communications logged</p>'}
        </div></div>
      </div>

      <div class="tab-content" id="tab-timelineTab">
        <div class="card"><div class="card-header"><h3>Timeline</h3></div><div class="card-body" id="timelineContent">
          <div class="loading-overlay"><div class="spinner"></div> Loading timeline...</div>
        </div></div>
      </div>
    `;
    window._currentTenant = t;
    window._allDefects = t.defects || [];
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const contents = document.querySelectorAll('.tab-content');
    if (t.onclick.toString().includes(tabId)) { t.classList.add('active'); if (contents[i]) contents[i].classList.add('active'); }
    else { t.classList.remove('active'); if (contents[i]) contents[i].classList.remove('active'); }
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
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTenantFSC(${id})">Save</button>`);
}

async function saveTenantFSC(id) {
  try {
    await api(`/api/tenants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fsc_status: $('editFSC').value, priority: $('editPriority').value,
        fsc_requested_date: $('editFSCReq').value || null, fsc_received_date: $('editFSCRcv').value || null
      })
    });
    closeModal(); toast('FSC status updated'); renderTenantDetail(id);
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
    if (tenantId) renderTenantDetail(tenantId);
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function addComm(tenantId) {
  showModal('Log Communication', `
    <div class="form-row">
      <div class="form-group"><label>Type</label><select class="form-control" id="commType"><option>Email</option><option>Phone</option><option>Letter</option><option>Site Visit</option><option>Meeting</option></select></div>
      <div class="form-group"><label>Direction</label><select class="form-control" id="commDir"><option>Outbound</option><option>Inbound</option></select></div>
    </div>
    <div class="form-group"><label>Subject</label><input class="form-control" id="commSubject" placeholder="Subject"></div>
    <div class="form-group"><label>Content</label><textarea class="form-control" id="commContent" rows="4" placeholder="Details..."></textarea></div>
    <div class="form-group"><label>Contact Person</label><input class="form-control" id="commPerson" placeholder="Contact name"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveComm(${tenantId})">Save</button>`);
}

async function saveComm(tenantId) {
  try {
    await api('/api/communications', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, comm_type: $('commType').value, direction: $('commDir').value, subject: $('commSubject').value, content: $('commContent').value, contact_person: $('commPerson').value })
    });
    closeModal(); toast('Communication logged'); renderTenantDetail(tenantId);
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
          <div class="afss-month-header">${m} (${byMonth[m].length})</div>
          <div class="afss-month-body">
            ${byMonth[m].length ? byMonth[m].map(s => `<div class="afss-station ${s.status.toLowerCase()}" onclick="navigate('stations','${s.station_id}')" style="cursor:pointer">
              <span>${esc(s.station_name)}</span><span>${s.total_tenants}t</span>
            </div>`).join('') : '<div class="text-muted text-sm" style="padding:8px">None</div>'}
          </div>
        </div>`).join('')}
      </div>
    `;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
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
        <table><thead><tr><th>Site</th><th>Category</th><th>Risk</th><th>Progress</th><th>Audit Type</th><th>Audit Date</th><th>FY</th></tr></thead>
        <tbody id="defectTableBody">
          ${defects.map(d => `<tr class="clickable" onclick="editDefect(${d.id})" data-search="${(d.site_name + ' ' + (d.category || '')).toLowerCase()}" data-risk="${d.risk || ''}" data-progress="${d.progress || ''}">
            <td>${esc(d.site_name)}</td><td>${esc(d.category || '-')}</td><td>${riskBadge(d.risk)}</td>
            <td>${progressBadge(d.progress)}</td><td>${esc(d.audit_type || '-')}</td><td>${esc(d.audit_date || '-')}</td><td>${esc(d.financial_year || '-')}</td>
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

async function saveDefect() {
  try {
    await api('/api/defects', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_name: $('newDefectSite').value, category: $('newDefectCat').value,
        risk: $('newDefectRisk').value, description: $('newDefectDesc').value,
        audit_date: $('newDefectDate').value, assigned_to: $('newDefectAssign').value
      })
    });
    closeModal(); toast('Defect created'); renderDefects();
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
        <div class="card"><div class="card-header"><h3>Defects by Financial Year</h3></div><div class="card-body">
          ${barChart(Object.entries(d.defects_by_fy).sort().map(([k, v], i) => ({ label: k, value: v, color: colors[i % 5] })))}
        </div></div>
      </div>
      <div class="chart-grid">
        <div class="card"><div class="card-header"><h3>AFSS Monthly Distribution</h3></div><div class="card-body">
          ${barChart(Object.entries(d.afss_monthly).map(([k, v]) => ({ label: k.slice(0, 3), value: v, color: 'blue' })))}
        </div></div>
        <div class="card"><div class="card-header"><h3>Top Property Managers</h3></div><div class="card-body">
          ${barChart(sortDesc(d.pm_distribution).slice(0, 10).map(([k, v], i) => ({ label: k, value: v, color: colors[i % 5] })))}
        </div></div>
      </div>
    `;
  } catch (e) { $('content').innerHTML = `<p>Error: ${e.message}</p>`; }
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

// ─── Defect Edit ────────────────────────────────────────────────
async function editDefect(id) {
  let d = (window._allDefects || []).find(x => x.id === id);
  if (!d) {
    try { const all = await api('/api/defects'); d = all.find(x => x.id === id); } catch(e) {}
  }
  if (!d) { toast('Defect not found', 'error'); return; }

  showModal('Edit Defect', `
    <div class="form-group"><label>Site Name</label><input class="form-control" value="${esc(d.site_name || '')}" readonly style="background:#f1f5f9"></div>
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
    else { const h = window.location.hash; if (h.startsWith('#stations/')) renderStationDetail(h.split('/')[1]); }
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function addDefectForTenant() {
  const t = window._currentTenant;
  if (!t) return;
  showModal('Add Defect for Tenant', `
    <div class="form-group"><label>Site Name</label><input class="form-control" id="newDefectSite" value="${esc(t.station_name)}" placeholder="Station / site name"></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><input class="form-control" id="newDefectCat" placeholder="e.g. Fire Safety, Electrical"></div>
      <div class="form-group"><label>Risk</label><select class="form-control" id="newDefectRisk"><option>Minor</option><option>Medium</option><option>Major</option></select></div>
    </div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="newDefectDesc" rows="3"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Audit Date</label><input class="form-control" type="date" id="newDefectDate"></div>
      <div class="form-group"><label>Assigned To</label><input class="form-control" id="newDefectAssign"></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDefectForTenant()">Save</button>`);
}

async function saveDefectForTenant() {
  const t = window._currentTenant;
  try {
    await api('/api/defects', { method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        site_name: $('newDefectSite').value, category: $('newDefectCat').value,
        risk: $('newDefectRisk').value, description: $('newDefectDesc').value,
        audit_date: $('newDefectDate').value, assigned_to: $('newDefectAssign').value,
        tenant_id: t ? t.id : null, station_id: t ? t.station_id : null,
      })
    });
    closeModal(); toast('Defect created');
    if (t) renderTenantDetail(t.id); else renderDefects();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
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

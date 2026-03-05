// ============================================================
// INSPECTION MODULE - FYRECOMP Fire Safety Compliance
// Complete mobile-first inspection workflow with debug/audit
// ============================================================

// ---- Inspection Checklist Data ----
const INSPECTION_SECTIONS = [
    {
        id: 'fire_doors', name: 'Fire Doors & Exits',
        items: [
            'Fire doors close and latch properly',
            'Door hardware (handles, closers) functional',
            'Fire door signage visible and correct',
            'Exit doors unobstructed and accessible',
            'Emergency exit lighting operational',
            'Door seals and intumescent strips intact',
            'Hold-open devices connected to fire alarm',
            'Fire door gaps within compliance (max 3mm)'
        ]
    },
    {
        id: 'fire_extinguishers', name: 'Fire Extinguishers',
        items: [
            'Extinguishers present in designated locations',
            'Extinguishers serviced within 6 months',
            'Correct extinguisher type for area/risk',
            'Extinguisher signage visible',
            'Extinguishers accessible (not obstructed)',
            'Pressure gauge in green zone',
            'Safety pins and tamper seals intact',
            'Mounting height correct (bracket/cabinet)'
        ]
    },
    {
        id: 'fire_alarms', name: 'Fire Detection & Alarm',
        items: [
            'Smoke detectors present and operational',
            'Heat detectors in appropriate locations',
            'Manual call points accessible and signed',
            'Fire alarm panel showing normal status',
            'Alarm system last tested (within 6 months)',
            'Notification devices (bells/strobes) visible',
            'Zone plan displayed at fire alarm panel',
            'Fault indicators clear on panel'
        ]
    },
    {
        id: 'sprinklers', name: 'Sprinkler System',
        items: [
            'Sprinkler heads unobstructed (min 500mm clearance)',
            'No damaged or painted sprinkler heads',
            'Sprinkler valve in open position',
            'System pressure within range',
            'Last service date within compliance period',
            'Spare sprinkler heads and wrench available',
            'No storage within 500mm of sprinkler heads',
            'Flow switch and tamper alarms operational'
        ]
    },
    {
        id: 'emergency_lighting', name: 'Emergency & Exit Lighting',
        items: [
            'Emergency lights operational (green indicator)',
            'Exit signs illuminated and visible',
            'Battery backup tested within 6 months',
            'Exit path adequately lit',
            'Emergency lighting covers all required areas',
            'Photo-luminescent signs present (where required)',
            'Light fittings clean and undamaged',
            'Duration test certificate current'
        ]
    },
    {
        id: 'egress', name: 'Egress & Evacuation',
        items: [
            'Evacuation plan displayed and current',
            'Assembly area clearly identified',
            'Evacuation routes clear and unobstructed',
            'Stairwells free of storage/obstructions',
            'Floor warden equipment accessible (vests, megaphones)',
            'Occupant capacity signage displayed',
            'Fire stairs pressurisation system functional',
            'Emergency procedures/contacts posted'
        ]
    },
    {
        id: 'hydrants', name: 'Hydrants & Hose Reels',
        items: [
            'Fire hydrants accessible and signed',
            'Hose reels accessible and not obstructed',
            'Hose reel nozzle and valve operational',
            'Hydrant valves operational (no leaks)',
            'Booster assembly accessible and signed',
            'Fire hose in good condition (no damage)',
            'Hydrant covers/caps in place',
            'Water pressure adequate'
        ]
    },
    {
        id: 'electrical', name: 'Electrical Safety',
        items: [
            'Switchboards secured and accessible',
            'No exposed wiring or damaged cables',
            'RCD/safety switches tested within 6 months',
            'Electrical rooms clear of storage',
            'Extension leads used appropriately',
            'Power points not overloaded',
            'Electrical equipment tagged and tested',
            'Emergency shut-off accessible and labelled'
        ]
    },
    {
        id: 'hazmat', name: 'Hazardous Materials & Storage',
        items: [
            'Flammable materials stored correctly',
            'MSDS/SDS available for chemicals on site',
            'Chemical storage cabinets compliant',
            'Gas cylinders secured and stored correctly',
            'Spill kit available and stocked',
            'No improper storage of combustibles',
            'Dangerous goods signage displayed',
            'Ventilation adequate in storage areas'
        ]
    },
    {
        id: 'general', name: 'General Fire Safety & Housekeeping',
        items: [
            'No unapproved hot works occurring',
            'Combustible waste managed appropriately',
            'Smoking areas designated and compliant',
            'Building fabric fire-rated where required',
            'Penetrations sealed (fire stopping)',
            'Tenant fit-out complies with fire requirements',
            'Fire safety certificate/AFSS current',
            'Annual Fire Safety Statement displayed'
        ]
    }
];

const FSM_LIST = [
    'Fire Detection System', 'Fire Alarm System', 'Sprinkler System',
    'Fire Hydrant System', 'Fire Hose Reels', 'Portable Fire Extinguishers',
    'Fire Doors', 'Fire Shutters/Curtains', 'Emergency Lighting',
    'Exit Signs', 'Smoke Hazard Management', 'Mechanical Air Handling',
    'Stair Pressurisation', 'Fire Dampers', 'Smoke Detectors',
    'Heat Detectors', 'Occupant Warning System', 'Fire Pump',
    'Fire Control Room', 'Passive Fire Protection'
];

// ---- State ----
let currentInspectionId = null;
let currentInspStep = 1;
const TOTAL_INSP_STEPS = 5;
let sigCanvas, sigCtx, sigDrawing = false;

// Ensure inspection array exists on state
if (!state.inspections) state.inspections = [];

// ---- Mobile Menu ----
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('show');
}

// ---- Inspection List View ----
function renderInspectionList() {
    const container = document.getElementById('insp-list-container');
    if (!container) return;
    let inspections = state.inspections || [];
    const search = (document.getElementById('insp-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('insp-status-filter')?.value || '';

    if (search) inspections = inspections.filter(i =>
        (i.station || '').toLowerCase().includes(search) ||
        (i.tenancy || '').toLowerCase().includes(search) ||
        (i.type || '').toLowerCase().includes(search) ||
        (i.inspectorName || '').toLowerCase().includes(search)
    );
    if (statusFilter) inspections = inspections.filter(i => i.status === statusFilter);

    // Update stats
    const all = state.inspections || [];
    const el = id => { const e = document.getElementById(id); if (e) return e; return { textContent: '' }; };
    el('insp-stat-total').textContent = all.length;
    el('insp-stat-completed').textContent = all.filter(i => i.status === 'Completed' || i.status === 'Submitted').length;
    el('insp-stat-draft').textContent = all.filter(i => i.status === 'Draft' || i.status === 'In Progress').length;
    el('insp-stat-defects').textContent = all.reduce((s, i) => s + (i.defectsCreated || 0), 0);

    const badge = document.getElementById('nav-badge-inspections');
    if (badge) badge.textContent = all.length;

    if (inspections.length === 0) {
        container.innerHTML = '<div class="empty-state"><h4>No inspections found</h4><p>Tap "New Inspection" to begin</p></div>';
        return;
    }

    inspections.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    container.innerHTML = inspections.map(i => {
        const statusClass = (i.status || 'Draft').toLowerCase().replace(/\s+/g, '-');
        const nc = (i.checklistItems || []).filter(ci => ci.status === 'Non-Compliant').length;
        return '<div class="insp-list-card" onclick="viewInspection(\'' + i.id + '\')">' +
            '<div class="insp-list-card-top">' +
                '<div class="insp-list-card-title">' + escapeHtml(i.station || 'Untitled') + (i.tenancy ? ' - ' + escapeHtml(i.tenancy) : '') + '</div>' +
                '<span class="insp-status-badge ' + statusClass + '">' + escapeHtml(i.status || 'Draft') + '</span>' +
            '</div>' +
            '<div class="insp-list-card-meta">' +
                '<span>' + escapeHtml(i.type || 'Inspection') + '</span>' +
                '<span>' + escapeHtml(i.date || '') + '</span>' +
                '<span>By: ' + escapeHtml(i.inspectorName || 'N/A') + '</span>' +
                (nc > 0 ? '<span style="color:#dc2626;font-weight:600">' + nc + ' non-compliant</span>' : '') +
            '</div>' +
        '</div>';
    }).join('');
}

function showInspectionList() {
    document.getElementById('insp-list-view').style.display = '';
    document.getElementById('insp-wizard-view').classList.remove('active');
    document.getElementById('insp-detail-view').style.display = 'none';
    currentInspectionId = null;
    renderInspectionList();
}

// ---- Escape HTML ----
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ---- New Inspection ----
function startNewInspection() {
    currentInspectionId = 'insp_' + Date.now();
    currentInspStep = 1;

    document.getElementById('insp-list-view').style.display = 'none';
    document.getElementById('insp-detail-view').style.display = 'none';
    const wiz = document.getElementById('insp-wizard-view');
    wiz.classList.add('active');
    document.getElementById('insp-wizard-title').textContent = 'New Inspection';
    document.getElementById('insp-wizard-status').textContent = 'Draft';
    document.getElementById('insp-wizard-status').className = 'insp-status-badge draft';

    // Populate station dropdown
    const stationSel = document.getElementById('insp-station');
    stationSel.innerHTML = '<option value="">Select station...</option>';
    (state.stations || []).forEach(s => {
        stationSel.innerHTML += '<option value="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + '</option>';
    });

    // Set defaults
    document.getElementById('insp-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('insp-time').value = new Date().toTimeString().slice(0, 5);
    document.getElementById('insp-type').value = '';
    document.getElementById('insp-tenancy').innerHTML = '<option value="">No tenancy (station-level inspection)</option>';
    document.getElementById('insp-tenancy-prefill').style.display = 'none';
    document.getElementById('insp-weather').value = '';
    document.getElementById('insp-comments').value = '';
    document.getElementById('insp-overall-rating').value = '';
    document.getElementById('insp-signed-name').value = '';
    document.getElementById('insp-signed-role').value = '';

    // Load saved inspector
    const savedInsp = localStorage.getItem('fyrecomp_default_inspector');
    if (savedInsp) {
        try {
            const si = JSON.parse(savedInsp);
            document.getElementById('insp-inspector-name').value = si.name || '';
            document.getElementById('insp-inspector-company').value = si.company || '';
            document.getElementById('insp-inspector-licence').value = si.licence || '';
        } catch(e) {}
    }

    populateSectionSelect();
    renderStepIndicator();
    showStep(1);
    initSignaturePad();
}

function editInspection(id) {
    const insp = (state.inspections || []).find(i => i.id === id);
    if (!insp) return;
    currentInspectionId = id;
    currentInspStep = 1;

    document.getElementById('insp-list-view').style.display = 'none';
    document.getElementById('insp-detail-view').style.display = 'none';
    const wiz = document.getElementById('insp-wizard-view');
    wiz.classList.add('active');
    document.getElementById('insp-wizard-title').textContent = 'Edit Inspection';
    document.getElementById('insp-wizard-status').textContent = insp.status || 'Draft';
    document.getElementById('insp-wizard-status').className = 'insp-status-badge ' + (insp.status || 'Draft').toLowerCase().replace(/\s+/g, '-');

    // Populate fields from saved data
    const stationSel = document.getElementById('insp-station');
    stationSel.innerHTML = '<option value="">Select station...</option>';
    (state.stations || []).forEach(s => {
        stationSel.innerHTML += '<option value="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + '</option>';
    });
    stationSel.value = insp.station || '';
    onInspStationChange();
    document.getElementById('insp-tenancy').value = insp.tenancy || '';

    document.getElementById('insp-type').value = insp.type || '';
    document.getElementById('insp-date').value = insp.date || '';
    document.getElementById('insp-time').value = insp.time || '';
    document.getElementById('insp-weather').value = insp.weather || '';
    document.getElementById('insp-inspector-name').value = insp.inspectorName || '';
    document.getElementById('insp-inspector-company').value = insp.inspectorCompany || '';
    document.getElementById('insp-inspector-licence').value = insp.inspectorLicence || '';
    document.getElementById('insp-comments').value = insp.comments || '';
    document.getElementById('insp-overall-rating').value = insp.overallRating || '';
    document.getElementById('insp-signed-name').value = insp.signedName || '';
    document.getElementById('insp-signed-role').value = insp.signedRole || '';

    populateSectionSelect(insp.selectedSections || []);
    renderStepIndicator();
    showStep(1);
    initSignaturePad();

    // Restore signature if exists
    if (insp.signature) {
        const img = new Image();
        img.onload = function() { sigCtx.drawImage(img, 0, 0); };
        img.src = insp.signature;
    }
}

// ---- Station/Tenancy Logic ----
function onInspStationChange() {
    const station = document.getElementById('insp-station').value;
    const tenancySel = document.getElementById('insp-tenancy');
    tenancySel.innerHTML = '<option value="">No tenancy (station-level inspection)</option>';
    if (!station) return;

    const tenants = (state.tenants || []).filter(t => t.station === station);
    tenants.forEach(t => {
        tenancySel.innerHTML += '<option value="' + escapeHtml(t.company) + '">' + escapeHtml(t.company) + ' — ' + escapeHtml(t.leaseArea || 'N/A') + '</option>';
    });
}

function onInspTenancyChange() {
    const tenancy = document.getElementById('insp-tenancy').value;
    const prefillDiv = document.getElementById('insp-tenancy-prefill');
    const detailsDiv = document.getElementById('insp-prefill-details');

    if (!tenancy) {
        prefillDiv.style.display = 'none';
        return;
    }

    const tenant = (state.tenants || []).find(t => t.company === tenancy);
    if (!tenant) {
        prefillDiv.style.display = 'none';
        return;
    }

    prefillDiv.style.display = 'block';
    detailsDiv.innerHTML =
        '<div><strong>Company:</strong> ' + escapeHtml(tenant.company) + '</div>' +
        '<div><strong>Contact:</strong> ' + escapeHtml(tenant.contact || 'N/A') + '</div>' +
        '<div><strong>Lease Area:</strong> ' + escapeHtml(tenant.leaseArea || 'N/A') + '</div>' +
        '<div><strong>FSC Status:</strong> ' + escapeHtml(tenant.fscStatus || 'N/A') + '</div>' +
        '<div><strong>Priority:</strong> ' + escapeHtml(tenant.priority || 'N/A') + '</div>' +
        '<div><strong>Open Defects:</strong> ' + (tenant.defectsOpen || 0) + '</div>';
}

// ---- Section Selection ----
function populateSectionSelect(selected) {
    const container = document.getElementById('insp-section-select');
    container.innerHTML = INSPECTION_SECTIONS.map(s => {
        const checked = selected ? selected.includes(s.id) : true;
        return '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:8px;cursor:pointer;font-size:13px">' +
            '<input type="checkbox" class="insp-section-cb" value="' + s.id + '"' + (checked ? ' checked' : '') + '>' +
            '<span style="font-weight:600">' + escapeHtml(s.name) + '</span>' +
            '<span style="margin-left:auto;color:var(--text-muted);font-size:11px">' + s.items.length + ' items</span>' +
        '</label>';
    }).join('');
}

function inspSelectAllSections(val) {
    document.querySelectorAll('.insp-section-cb').forEach(cb => cb.checked = val);
}

function getSelectedSections() {
    return Array.from(document.querySelectorAll('.insp-section-cb:checked')).map(cb => cb.value);
}

// ---- Step Navigation ----
function renderStepIndicator() {
    const container = document.getElementById('insp-step-indicator');
    let html = '';
    for (let i = 1; i <= TOTAL_INSP_STEPS; i++) {
        const cls = i < currentInspStep ? 'done' : i === currentInspStep ? 'current' : '';
        html += '<div class="insp-step-dot ' + cls + '"></div>';
    }
    container.innerHTML = html;
}

function showStep(n) {
    currentInspStep = n;
    for (let i = 1; i <= TOTAL_INSP_STEPS; i++) {
        const el = document.getElementById('insp-step-' + i);
        if (el) el.classList.toggle('active', i === n);
    }
    document.getElementById('insp-prev-btn').style.display = n > 1 ? '' : 'none';
    document.getElementById('insp-next-btn').style.display = n < TOTAL_INSP_STEPS ? '' : 'none';
    document.getElementById('insp-complete-btn').style.display = n === TOTAL_INSP_STEPS ? '' : 'none';
    renderStepIndicator();

    if (n === 3) buildChecklist();
    if (n === 4) buildFSMGrid();
    if (n === 5) buildSummary();
}

function inspNextStep() {
    if (currentInspStep === 1) {
        // Validate step 1
        if (!document.getElementById('insp-type').value) { showToast('Please select inspection type', 'error'); return; }
        if (!document.getElementById('insp-station').value) { showToast('Please select a station', 'error'); return; }
        if (!document.getElementById('insp-date').value) { showToast('Please set a date', 'error'); return; }
        if (!document.getElementById('insp-inspector-name').value.trim()) { showToast('Please enter inspector name', 'error'); return; }

        // Save inspector if checkbox checked
        if (document.getElementById('insp-save-inspector').checked) {
            localStorage.setItem('fyrecomp_default_inspector', JSON.stringify({
                name: document.getElementById('insp-inspector-name').value,
                company: document.getElementById('insp-inspector-company').value,
                licence: document.getElementById('insp-inspector-licence').value
            }));
        }
    }
    if (currentInspStep === 2) {
        if (getSelectedSections().length === 0) { showToast('Select at least one section', 'error'); return; }
    }
    if (currentInspStep < TOTAL_INSP_STEPS) showStep(currentInspStep + 1);
}

function inspPrevStep() {
    if (currentInspStep > 1) showStep(currentInspStep - 1);
}

// ---- Checklist Builder ----
function buildChecklist() {
    const container = document.getElementById('insp-checklist-container');
    const selectedIds = getSelectedSections();
    const sections = INSPECTION_SECTIONS.filter(s => selectedIds.includes(s.id));

    // Load existing checklist data for editing
    const existing = {};
    if (currentInspectionId) {
        const insp = (state.inspections || []).find(i => i.id === currentInspectionId);
        if (insp && insp.checklistItems) {
            insp.checklistItems.forEach(ci => { existing[ci.sectionId + '|' + ci.itemIdx] = ci; });
        }
    }

    container.innerHTML = sections.map(s => {
        const itemsHtml = s.items.map((item, idx) => {
            const key = s.id + '|' + idx;
            const ex = existing[key] || {};
            const status = ex.status || '';
            const statusClass = status === 'Compliant' ? 'status-compliant' : status === 'Non-Compliant' ? 'status-non-compliant' : status === 'N/A' ? 'status-na' : '';
            const showExtras = status === 'Non-Compliant';
            return '<div class="checklist-item" data-key="' + key + '">' +
                '<div class="checklist-item-top">' +
                    '<div class="checklist-item-label">' + escapeHtml(item) + '</div>' +
                    '<div class="checklist-item-status">' +
                        '<select class="' + statusClass + '" onchange="onChecklistStatusChange(this,\'' + key + '\')">' +
                            '<option value="">Not assessed</option>' +
                            '<option value="Compliant"' + (status === 'Compliant' ? ' selected' : '') + '>Compliant</option>' +
                            '<option value="Non-Compliant"' + (status === 'Non-Compliant' ? ' selected' : '') + '>Non-Compliant</option>' +
                            '<option value="N/A"' + (status === 'N/A' ? ' selected' : '') + '>N/A</option>' +
                        '</select>' +
                    '</div>' +
                '</div>' +
                '<div class="checklist-item-extras' + (showExtras ? ' show' : '') + '" id="extras-' + key.replace('|', '-') + '">' +
                    '<textarea placeholder="Notes / observations..." onchange="onChecklistNote(this,\'' + key + '\')">' + escapeHtml(ex.notes || '') + '</textarea>' +
                    '<div class="checklist-item-photos" id="photos-' + key.replace('|', '-') + '">' +
                        (ex.photos || []).map((p, pi) => '<img class="checklist-photo-thumb" src="' + p + '" onclick="showPhotoLightbox(this.src)" alt="Photo ' + (pi+1) + '">').join('') +
                        '<label class="checklist-photo-add"><input type="file" accept="image/*" capture="environment" style="display:none" onchange="addChecklistPhoto(this,\'' + key + '\')">+</label>' +
                    '</div>' +
                    '<div class="nc-defect-prompt">' +
                        '<div style="font-size:11px;font-weight:700;color:#dc2626;margin-bottom:8px">NON-COMPLIANCE DEFECT</div>' +
                        '<div class="form-row">' +
                            '<select id="nc-risk-' + key.replace('|', '-') + '"><option value="Minor">Minor</option><option value="Medium">Medium</option><option value="Major"' + (ex.defectRisk === 'Major' ? ' selected' : '') + '>Major</option></select>' +
                            '<select id="nc-cat-' + key.replace('|', '-') + '"><option>' + escapeHtml(s.name) + '</option></select>' +
                        '</div>' +
                        '<textarea id="nc-desc-' + key.replace('|', '-') + '" placeholder="Describe the defect..." rows="2">' + escapeHtml(ex.defectDesc || '') + '</textarea>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        return '<div class="insp-section-card open">' +
            '<div class="insp-section-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
                '<span>' + escapeHtml(s.name) + '</span>' +
                '<span class="badge-count" id="badge-' + s.id + '">0/' + s.items.length + '</span>' +
            '</div>' +
            '<div class="insp-section-body">' + itemsHtml + '</div>' +
        '</div>';
    }).join('');

    updateChecklistProgress();
}

function onChecklistStatusChange(sel, key) {
    sel.className = sel.value === 'Compliant' ? 'status-compliant' : sel.value === 'Non-Compliant' ? 'status-non-compliant' : sel.value === 'N/A' ? 'status-na' : '';
    const extras = document.getElementById('extras-' + key.replace('|', '-'));
    if (extras) {
        extras.classList.toggle('show', sel.value === 'Non-Compliant' || sel.value !== '');
    }
    updateChecklistProgress();
}

function onChecklistNote(ta, key) {
    // Notes stored on collect
}

function updateChecklistProgress() {
    const items = document.querySelectorAll('.checklist-item');
    let total = 0, assessed = 0, nc = 0;
    const sectionCounts = {};

    items.forEach(item => {
        total++;
        const key = item.dataset.key;
        const secId = key.split('|')[0];
        if (!sectionCounts[secId]) sectionCounts[secId] = { total: 0, assessed: 0, nc: 0 };
        sectionCounts[secId].total++;

        const sel = item.querySelector('select');
        if (sel && sel.value) {
            assessed++;
            sectionCounts[secId].assessed++;
            if (sel.value === 'Non-Compliant') { nc++; sectionCounts[secId].nc++; }
        }
    });

    const prog = document.getElementById('insp-checklist-progress');
    if (prog) prog.textContent = assessed + '/' + total + ' items' + (nc > 0 ? ' (' + nc + ' NC)' : '');

    Object.keys(sectionCounts).forEach(secId => {
        const badge = document.getElementById('badge-' + secId);
        if (badge) {
            badge.textContent = sectionCounts[secId].assessed + '/' + sectionCounts[secId].total;
            badge.classList.toggle('has-nc', sectionCounts[secId].nc > 0);
        }
    });
}

// ---- Photo Handling ----
function addChecklistPhoto(input, key) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        compressImage(e.target.result, 800, 0.7, function(compressed) {
            const container = document.getElementById('photos-' + key.replace('|', '-'));
            const addBtn = container.querySelector('.checklist-photo-add');
            const img = document.createElement('img');
            img.className = 'checklist-photo-thumb';
            img.src = compressed;
            img.onclick = function() { showPhotoLightbox(this.src); };
            container.insertBefore(img, addBtn);
        });
    };
    reader.readAsDataURL(file);
    input.value = '';
}

function addGeneralPhotos(input) {
    const files = Array.from(input.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            compressImage(e.target.result, 800, 0.7, function(compressed) {
                const container = document.getElementById('insp-general-photos');
                const addBtn = container.querySelector('.checklist-photo-add');
                const img = document.createElement('img');
                img.className = 'checklist-photo-thumb';
                img.src = compressed;
                img.onclick = function() { showPhotoLightbox(this.src); };
                container.insertBefore(img, addBtn);
            });
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

function compressImage(dataUrl, maxW, quality, cb) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = (maxW / w) * h; w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
}

function showPhotoLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('photo-lightbox').classList.add('show');
}

// ---- FSM Grid ----
function buildFSMGrid() {
    const grid = document.getElementById('insp-fsm-grid');
    const existing = {};
    if (currentInspectionId) {
        const insp = (state.inspections || []).find(i => i.id === currentInspectionId);
        if (insp && insp.fsmAssessments) insp.fsmAssessments.forEach(f => { existing[f.name] = f.status; });
    }
    grid.innerHTML = FSM_LIST.map(name => {
        const val = existing[name] || '';
        return '<div class="fsm-item">' +
            '<span>' + escapeHtml(name) + '</span>' +
            '<select data-fsm="' + escapeHtml(name) + '">' +
                '<option value="">N/A</option>' +
                '<option value="Operational"' + (val === 'Operational' ? ' selected' : '') + '>Operational</option>' +
                '<option value="Defective"' + (val === 'Defective' ? ' selected' : '') + '>Defective</option>' +
                '<option value="Not Installed"' + (val === 'Not Installed' ? ' selected' : '') + '>Not Installed</option>' +
            '</select>' +
        '</div>';
    }).join('');
}

// ---- Summary ----
function buildSummary() {
    const items = collectChecklistItems();
    const total = items.length;
    const compliant = items.filter(i => i.status === 'Compliant').length;
    const nc = items.filter(i => i.status === 'Non-Compliant').length;
    const na = items.filter(i => i.status === 'N/A').length;
    const notAssessed = items.filter(i => !i.status).length;

    document.getElementById('insp-summary-stats').innerHTML =
        '<div style="padding:8px 12px;background:#ecfdf5;border-radius:6px"><strong style="color:#059669">' + compliant + '</strong> Compliant</div>' +
        '<div style="padding:8px 12px;background:#fef2f2;border-radius:6px"><strong style="color:#dc2626">' + nc + '</strong> Non-Compliant</div>' +
        '<div style="padding:8px 12px;background:var(--bg);border-radius:6px"><strong>' + na + '</strong> N/A</div>' +
        '<div style="padding:8px 12px;background:var(--bg);border-radius:6px"><strong>' + notAssessed + '</strong> Not Assessed</div>' +
        '<div style="padding:8px 12px;background:var(--bg);border-radius:6px;grid-column:span 2"><strong>' + total + '</strong> Total Items</div>';
}

// ---- Signature Pad ----
function initSignaturePad() {
    sigCanvas = document.getElementById('sig-canvas');
    if (!sigCanvas) return;
    sigCtx = sigCanvas.getContext('2d');

    const rect = sigCanvas.parentElement.getBoundingClientRect();
    sigCanvas.width = rect.width || 600;
    sigCanvas.height = 200;
    sigCtx.strokeStyle = '#1a1a2e';
    sigCtx.lineWidth = 2;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';

    sigDrawing = false;

    function getPos(e) {
        const r = sigCanvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: (t.clientX - r.left) * (sigCanvas.width / r.width), y: (t.clientY - r.top) * (sigCanvas.height / r.height) };
    }

    function startDraw(e) { e.preventDefault(); sigDrawing = true; const p = getPos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); }
    function draw(e) { if (!sigDrawing) return; e.preventDefault(); const p = getPos(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); }
    function stopDraw() { sigDrawing = false; }

    sigCanvas.removeEventListener('mousedown', startDraw);
    sigCanvas.addEventListener('mousedown', startDraw);
    sigCanvas.addEventListener('mousemove', draw);
    sigCanvas.addEventListener('mouseup', stopDraw);
    sigCanvas.addEventListener('mouseleave', stopDraw);
    sigCanvas.addEventListener('touchstart', startDraw, { passive: false });
    sigCanvas.addEventListener('touchmove', draw, { passive: false });
    sigCanvas.addEventListener('touchend', stopDraw);
}

function clearSignature() {
    if (sigCtx && sigCanvas) {
        sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    }
}

function getSignatureData() {
    if (!sigCanvas) return null;
    const ctx = sigCanvas.getContext('2d');
    const data = ctx.getImageData(0, 0, sigCanvas.width, sigCanvas.height).data;
    for (let i = 3; i < data.length; i += 4) { if (data[i] > 0) return sigCanvas.toDataURL('image/png'); }
    return null;
}

// ---- Collect Data ----
function collectChecklistItems() {
    const items = [];
    document.querySelectorAll('.checklist-item').forEach(el => {
        const key = el.dataset.key;
        if (!key) return;
        const [secId, idxStr] = key.split('|');
        const sel = el.querySelector('select');
        const status = sel ? sel.value : '';
        const notesEl = el.querySelector('textarea');
        const notes = notesEl ? notesEl.value : '';
        const photos = Array.from(el.querySelectorAll('.checklist-photo-thumb')).map(img => img.src);

        const section = INSPECTION_SECTIONS.find(s => s.id === secId);
        const itemName = section ? section.items[parseInt(idxStr)] : '';

        const item = { sectionId: secId, itemIdx: parseInt(idxStr), itemName, status, notes, photos };

        // NC defect data
        if (status === 'Non-Compliant') {
            const safeKey = key.replace('|', '-');
            const riskEl = document.getElementById('nc-risk-' + safeKey);
            const descEl = document.getElementById('nc-desc-' + safeKey);
            item.defectRisk = riskEl ? riskEl.value : 'Minor';
            item.defectDesc = descEl ? descEl.value : '';
            item.defectCategory = section ? section.name : '';
        }
        items.push(item);
    });
    return items;
}

function collectFSMAssessments() {
    return Array.from(document.querySelectorAll('[data-fsm]')).map(sel => ({
        name: sel.dataset.fsm,
        status: sel.value
    })).filter(f => f.status);
}

function collectGeneralPhotos() {
    return Array.from(document.querySelectorAll('#insp-general-photos .checklist-photo-thumb')).map(img => img.src);
}

// ---- Save / Complete ----
function buildInspectionObject(status) {
    const checklistItems = collectChecklistItems();
    const defectsCreated = checklistItems.filter(i => i.status === 'Non-Compliant').length;

    return {
        id: currentInspectionId,
        type: document.getElementById('insp-type').value,
        station: document.getElementById('insp-station').value,
        tenancy: document.getElementById('insp-tenancy').value,
        date: document.getElementById('insp-date').value,
        time: document.getElementById('insp-time').value,
        weather: document.getElementById('insp-weather').value,
        inspectorName: document.getElementById('insp-inspector-name').value,
        inspectorCompany: document.getElementById('insp-inspector-company').value,
        inspectorLicence: document.getElementById('insp-inspector-licence').value,
        selectedSections: getSelectedSections(),
        checklistItems: checklistItems,
        fsmAssessments: collectFSMAssessments(),
        generalPhotos: collectGeneralPhotos(),
        overallRating: document.getElementById('insp-overall-rating').value,
        comments: document.getElementById('insp-comments').value,
        signedName: document.getElementById('insp-signed-name').value,
        signedRole: document.getElementById('insp-signed-role').value,
        signature: getSignatureData(),
        status: status,
        defectsCreated: defectsCreated,
        lastModified: new Date().toISOString(),
        createdAt: null // set below
    };
}

function saveInspectionDraft() {
    const obj = buildInspectionObject('Draft');
    saveInspectionToState(obj);
    showToast('Draft saved', 'success');
}

function completeInspection() {
    if (!document.getElementById('insp-overall-rating').value) {
        showToast('Please select an overall rating', 'error');
        return;
    }

    const obj = buildInspectionObject('Completed');

    // Create defects for NC items
    const ncItems = obj.checklistItems.filter(i => i.status === 'Non-Compliant');
    ncItems.forEach(nc => {
        const defect = {
            id: 'def_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            site: obj.station,
            tenant: obj.tenancy || '',
            category: nc.defectCategory || 'General',
            risk: nc.defectRisk || 'Minor',
            progress: 'Outstanding',
            area: nc.itemName || '',
            auditDate: obj.date,
            description: nc.defectDesc || nc.itemName,
            photos: nc.photos || [],
            inspectionId: obj.id,
            createdAt: new Date().toISOString()
        };
        if (!state.defects) state.defects = [];
        state.defects.push(defect);
    });

    saveInspectionToState(obj);

    if (typeof saveState === 'function') saveState();
    showToast('Inspection completed! ' + ncItems.length + ' defect(s) created.', 'success');
    showInspectionList();
}

function saveInspectionToState(obj) {
    if (!state.inspections) state.inspections = [];
    const idx = state.inspections.findIndex(i => i.id === obj.id);
    if (idx >= 0) {
        obj.createdAt = state.inspections[idx].createdAt;
        state.inspections[idx] = obj;
    } else {
        obj.createdAt = new Date().toISOString();
        state.inspections.push(obj);
    }
    if (typeof saveState === 'function') saveState();
    renderInspectionList();
}

function cancelInspection() {
    showInspectionList();
}

// ---- View Inspection ----
function viewInspection(id) {
    const insp = (state.inspections || []).find(i => i.id === id);
    if (!insp) return;
    currentInspectionId = id;

    document.getElementById('insp-list-view').style.display = 'none';
    document.getElementById('insp-wizard-view').classList.remove('active');
    document.getElementById('insp-detail-view').style.display = '';
    document.getElementById('insp-detail-title').textContent = (insp.station || 'Inspection') + (insp.tenancy ? ' - ' + insp.tenancy : '');

    const items = insp.checklistItems || [];
    const compliant = items.filter(i => i.status === 'Compliant').length;
    const nc = items.filter(i => i.status === 'Non-Compliant').length;
    const na = items.filter(i => i.status === 'N/A').length;

    let html = '<div class="stats-grid" style="margin-bottom:16px">' +
        '<div class="stat-card primary"><div class="stat-value">' + items.length + '</div><div class="stat-label">Total Items</div></div>' +
        '<div class="stat-card success"><div class="stat-value">' + compliant + '</div><div class="stat-label">Compliant</div></div>' +
        '<div class="stat-card critical"><div class="stat-value">' + nc + '</div><div class="stat-label">Non-Compliant</div></div>' +
        '<div class="stat-card high"><div class="stat-value">' + na + '</div><div class="stat-label">N/A</div></div>' +
    '</div>';

    html += '<div class="card"><div class="card-body">' +
        '<h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Inspection Details</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">' +
            '<div><strong>Type:</strong> ' + escapeHtml(insp.type) + '</div>' +
            '<div><strong>Station:</strong> ' + escapeHtml(insp.station) + '</div>' +
            '<div><strong>Tenancy:</strong> ' + escapeHtml(insp.tenancy || 'N/A') + '</div>' +
            '<div><strong>Date:</strong> ' + escapeHtml(insp.date) + ' ' + escapeHtml(insp.time || '') + '</div>' +
            '<div><strong>Weather:</strong> ' + escapeHtml(insp.weather || 'N/A') + '</div>' +
            '<div><strong>Inspector:</strong> ' + escapeHtml(insp.inspectorName) + '</div>' +
            '<div><strong>Company:</strong> ' + escapeHtml(insp.inspectorCompany || 'N/A') + '</div>' +
            '<div><strong>Rating:</strong> ' + escapeHtml(insp.overallRating || 'N/A') + '</div>' +
            '<div style="grid-column:span 2"><strong>Status:</strong> <span class="insp-status-badge ' + (insp.status || 'draft').toLowerCase().replace(/\s+/g, '-') + '">' + escapeHtml(insp.status) + '</span></div>' +
        '</div>' +
    '</div></div>';

    // Checklist results by section
    const sectionMap = {};
    items.forEach(ci => {
        if (!sectionMap[ci.sectionId]) sectionMap[ci.sectionId] = [];
        sectionMap[ci.sectionId].push(ci);
    });

    Object.keys(sectionMap).forEach(secId => {
        const section = INSPECTION_SECTIONS.find(s => s.id === secId);
        const sItems = sectionMap[secId];
        const sNC = sItems.filter(i => i.status === 'Non-Compliant').length;

        html += '<div class="card" style="margin-top:12px"><div class="card-header"><span class="card-title">' + escapeHtml(section ? section.name : secId) + '</span>' +
            (sNC > 0 ? '<span style="color:#dc2626;font-size:11px;font-weight:600">' + sNC + ' NC</span>' : '<span style="color:#059669;font-size:11px;font-weight:600">All OK</span>') +
        '</div><div class="card-body" style="padding:0"><table style="font-size:12px"><thead><tr><th>Item</th><th style="width:120px">Status</th><th>Notes</th></tr></thead><tbody>';

        sItems.forEach(ci => {
            const color = ci.status === 'Compliant' ? '#059669' : ci.status === 'Non-Compliant' ? '#dc2626' : '#6b7280';
            html += '<tr><td>' + escapeHtml(ci.itemName) + '</td><td style="color:' + color + ';font-weight:600">' + escapeHtml(ci.status || '-') + '</td><td>' + escapeHtml(ci.notes || '-') + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
    });

    // Comments
    if (insp.comments) {
        html += '<div class="card" style="margin-top:12px"><div class="card-header"><span class="card-title">Comments</span></div><div class="card-body"><p style="font-size:13px;white-space:pre-wrap">' + escapeHtml(insp.comments) + '</p></div></div>';
    }

    // Signature
    if (insp.signature) {
        html += '<div class="card" style="margin-top:12px"><div class="card-header"><span class="card-title">Signature</span></div><div class="card-body">' +
            '<p style="font-size:12px;margin-bottom:8px"><strong>' + escapeHtml(insp.signedName || '') + '</strong>' + (insp.signedRole ? ' — ' + escapeHtml(insp.signedRole) : '') + '</p>' +
            '<img src="' + insp.signature + '" style="max-width:300px;border:1px solid var(--border);border-radius:8px" alt="Signature">' +
        '</div></div>';
    }

    document.getElementById('insp-detail-content').innerHTML = html;
}

function deleteInspection(id) {
    if (!confirm('Delete this inspection? This cannot be undone.')) return;
    state.inspections = (state.inspections || []).filter(i => i.id !== id);
    if (typeof saveState === 'function') saveState();
    showToast('Inspection deleted', 'success');
    showInspectionList();
}

// ============================================================
// PDF EXPORT
// ============================================================
function exportInspectionPDF() {
    const insp = (state.inspections || []).find(i => i.id === currentInspectionId);
    if (!insp) { showToast('No inspection selected', 'error'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const w = doc.internal.pageSize.getWidth();
    const dark = [30, 41, 59], muted = [100, 116, 139], primary = [232, 118, 47], success = [5, 150, 105], danger = [220, 38, 38];
    let y = 15;

    function addPage() { doc.addPage(); y = 15; }
    function checkPage(need) { if (y + need > 275) addPage(); }

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, w, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FYRECOMP', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Fire Safety Inspection Report', 14, 26);
    doc.setFontSize(8);
    doc.text('Generated: ' + new Date().toLocaleString(), 14, 33);
    doc.text(insp.status || 'Draft', w - 14, 18, { align: 'right' });
    y = 48;

    // Inspection Info
    doc.setTextColor(...dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Inspection Details', 14, y); y += 8;

    const info = [
        ['Type', insp.type], ['Station/Site', insp.station], ['Tenancy', insp.tenancy || 'N/A'],
        ['Date', insp.date + ' ' + (insp.time || '')], ['Weather', insp.weather || 'N/A'],
        ['Inspector', insp.inspectorName], ['Company', insp.inspectorCompany || 'N/A'],
        ['Licence', insp.inspectorLicence || 'N/A'], ['Overall Rating', insp.overallRating || 'N/A']
    ];

    doc.setFontSize(9);
    info.forEach(([label, value]) => {
        checkPage(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...muted);
        doc.text(label + ':', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...dark);
        doc.text(String(value), 60, y);
        y += 5;
    });
    y += 8;

    // Summary stats
    checkPage(20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dark);
    doc.text('Summary', 14, y); y += 8;

    const items = insp.checklistItems || [];
    const comp = items.filter(i => i.status === 'Compliant').length;
    const nc = items.filter(i => i.status === 'Non-Compliant').length;
    const naC = items.filter(i => i.status === 'N/A').length;

    doc.setFontSize(9);
    const summaryData = [['Total Items', items.length], ['Compliant', comp], ['Non-Compliant', nc], ['N/A', naC]];
    summaryData.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...muted);
        doc.text(label + ':', 14, y);
        doc.setFont('helvetica', 'normal');
        const color = label === 'Compliant' ? success : label === 'Non-Compliant' ? danger : dark;
        doc.setTextColor(...color);
        doc.text(String(val), 60, y);
        y += 5;
    });
    y += 8;

    // Checklist by section
    const sectionMap = {};
    items.forEach(ci => { if (!sectionMap[ci.sectionId]) sectionMap[ci.sectionId] = []; sectionMap[ci.sectionId].push(ci); });

    Object.keys(sectionMap).forEach(secId => {
        const section = INSPECTION_SECTIONS.find(s => s.id === secId);
        const sItems = sectionMap[secId];

        checkPage(20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primary);
        doc.text(section ? section.name : secId, 14, y); y += 6;

        const tableData = sItems.map(ci => [ci.itemName || '', ci.status || '-', ci.notes || '-']);
        doc.autoTable({
            startY: y,
            head: [['Item', 'Status', 'Notes']],
            body: tableData,
            margin: { left: 14, right: 14 },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 30 },
                2: { cellWidth: 'auto' }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 1) {
                    if (data.cell.text[0] === 'Compliant') data.cell.styles.textColor = success;
                    else if (data.cell.text[0] === 'Non-Compliant') data.cell.styles.textColor = danger;
                }
            }
        });
        y = doc.lastAutoTable.finalY + 8;
    });

    // Comments
    if (insp.comments) {
        checkPage(20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text('Comments', 14, y); y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...muted);
        const lines = doc.splitTextToSize(insp.comments, w - 28);
        doc.text(lines, 14, y);
        y += lines.length * 4 + 8;
    }

    // Signature
    if (insp.signature) {
        checkPage(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text('Signature', 14, y); y += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text((insp.signedName || '') + (insp.signedRole ? ' — ' + insp.signedRole : ''), 14, y); y += 6;
        try { doc.addImage(insp.signature, 'PNG', 14, y, 60, 20); y += 24; } catch(e) {}
    }

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text('FYRECOMP Fire Safety Inspection Report - Confidential', 14, 287);
        doc.text('Page ' + i + ' of ' + pageCount, w - 14, 287, { align: 'right' });
    }

    doc.save('inspection_' + (insp.station || 'report').replace(/\s+/g, '_') + '_' + insp.date + '.pdf');
    showToast('PDF exported successfully', 'success');
}

// ============================================================
// WORD/DOCX EXPORT
// ============================================================
function exportInspectionWord() {
    const insp = (state.inspections || []).find(i => i.id === currentInspectionId);
    if (!insp) { showToast('No inspection selected', 'error'); return; }

    if (typeof docx === 'undefined') {
        showToast('Word export library not loaded. Please check your connection.', 'error');
        return;
    }

    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, Packer } = docx;

    const items = insp.checklistItems || [];
    const comp = items.filter(i => i.status === 'Compliant').length;
    const nc = items.filter(i => i.status === 'Non-Compliant').length;

    const children = [];

    // Title
    children.push(new Paragraph({ children: [new TextRun({ text: 'FYRECOMP Fire Safety Inspection Report', bold: true, size: 36, color: '1E293B' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Generated: ' + new Date().toLocaleString(), size: 18, color: '64748B' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }));

    // Info section
    children.push(new Paragraph({ text: 'Inspection Details', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));

    const infoRows = [
        ['Type', insp.type || ''], ['Station/Site', insp.station || ''], ['Tenancy', insp.tenancy || 'N/A'],
        ['Date', (insp.date || '') + ' ' + (insp.time || '')], ['Inspector', insp.inspectorName || ''],
        ['Company', insp.inspectorCompany || 'N/A'], ['Rating', insp.overallRating || 'N/A'], ['Status', insp.status || 'Draft']
    ];

    const noBorder = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

    const infoTable = new Table({
        rows: infoRows.map(([label, value]) => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: '64748B' })] })], width: { size: 30, type: WidthType.PERCENTAGE }, borders: noBorder }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(value), size: 20 })] })], width: { size: 70, type: WidthType.PERCENTAGE }, borders: noBorder })
            ]
        })),
        width: { size: 100, type: WidthType.PERCENTAGE }
    });
    children.push(infoTable);

    // Summary
    children.push(new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
    children.push(new Paragraph({ children: [
        new TextRun({ text: 'Total: ' + items.length + '  |  Compliant: ' + comp + '  |  Non-Compliant: ' + nc, size: 20 })
    ], spacing: { after: 200 } }));

    // Checklist results by section
    const sectionMap = {};
    items.forEach(ci => { if (!sectionMap[ci.sectionId]) sectionMap[ci.sectionId] = []; sectionMap[ci.sectionId].push(ci); });

    Object.keys(sectionMap).forEach(secId => {
        const section = INSPECTION_SECTIONS.find(s => s.id === secId);
        children.push(new Paragraph({ text: section ? section.name : secId, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));

        const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
        const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

        const headerRow = new TableRow({
            children: ['Item', 'Status', 'Notes'].map(h => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: 'FFFFFF' })] })],
                shading: { fill: '1E293B' }, borders
            }))
        });

        const dataRows = sectionMap[secId].map(ci => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ci.itemName || '', size: 18 })] })], borders }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ci.status || '-', size: 18, color: ci.status === 'Compliant' ? '059669' : ci.status === 'Non-Compliant' ? 'DC2626' : '6B7280', bold: true })] })], borders }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ci.notes || '-', size: 18, color: '64748B' })] })], borders })
            ]
        }));

        children.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }));
    });

    // Comments
    if (insp.comments) {
        children.push(new Paragraph({ text: 'Comments', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
        children.push(new Paragraph({ children: [new TextRun({ text: insp.comments, size: 20, color: '64748B' })], spacing: { after: 200 } }));
    }

    // Sign-off
    children.push(new Paragraph({ text: 'Sign-Off', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: (insp.signedName || 'N/A') + (insp.signedRole ? ' — ' + insp.signedRole : ''), size: 20 })], spacing: { after: 200 } }));

    const docObj = new Document({ sections: [{ children }] });

    Packer.toBlob(docObj).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inspection_' + (insp.station || 'report').replace(/\s+/g, '_') + '_' + insp.date + '.docx';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Word document exported', 'success');
    }).catch(err => {
        console.error('DOCX export error:', err);
        showToast('Word export failed: ' + err.message, 'error');
    });
}

// ============================================================
// DEBUG & AUDIT CONSOLE
// ============================================================
let debugLogs = [];

function debugLog(level, msg) {
    const ts = new Date().toLocaleTimeString();
    debugLogs.push({ ts, level, msg });
    const output = document.getElementById('debug-log-output');
    if (output) {
        output.innerHTML += '<div class="debug-log"><span class="ts">[' + ts + ']</span> <span class="' + level + '">[' + level.toUpperCase() + ']</span> ' + escapeHtml(msg) + '</div>';
        output.scrollTop = output.scrollHeight;
    }
}

function runInspectionDebug() {
    debugLogs = [];
    const output = document.getElementById('debug-log-output');
    if (output) output.innerHTML = '';
    document.getElementById('insp-debug-panel').style.display = '';

    debugLog('info', '=== FYRECOMP Inspection Module Debug & Audit ===');
    debugLog('info', 'Starting comprehensive test suite...');

    // Test 1: State integrity
    debugTestDataIntegrity();

    // Test 2: UI Components
    debugTestUIComponents();

    // Test 3: Checklist data
    debugTestChecklistData();

    // Test 4: Export readiness
    debugTestExport();

    // Test 5: LocalStorage
    debugTestLocalStorage();

    // Summary
    const passes = debugLogs.filter(l => l.level === 'pass').length;
    const fails = debugLogs.filter(l => l.level === 'fail').length;
    const warns = debugLogs.filter(l => l.level === 'warn').length;

    debugLog('info', '');
    debugLog('info', '=== TEST SUMMARY ===');
    debugLog('info', 'Total tests: ' + (passes + fails + warns));
    debugLog('pass', 'Passed: ' + passes);
    if (fails > 0) debugLog('fail', 'Failed: ' + fails);
    if (warns > 0) debugLog('warn', 'Warnings: ' + warns);
    debugLog('info', fails === 0 ? 'All critical tests passed!' : 'Some tests failed - review above.');
}

function debugTestDataIntegrity() {
    debugLog('info', '--- Data Integrity Tests ---');

    // Check state object
    if (typeof state !== 'undefined') {
        debugLog('pass', 'Global state object exists');
    } else {
        debugLog('fail', 'Global state object missing!');
        return;
    }

    // Check inspections array
    if (Array.isArray(state.inspections)) {
        debugLog('pass', 'state.inspections is array with ' + state.inspections.length + ' items');
    } else {
        debugLog('warn', 'state.inspections not initialized - creating now');
        state.inspections = [];
    }

    // Validate each inspection
    state.inspections.forEach((insp, idx) => {
        if (!insp.id) debugLog('fail', 'Inspection[' + idx + '] missing id');
        else debugLog('pass', 'Inspection[' + idx + '] id=' + insp.id);

        if (!insp.station) debugLog('warn', 'Inspection[' + idx + '] missing station');
        if (!insp.date) debugLog('warn', 'Inspection[' + idx + '] missing date');
        if (!insp.inspectorName) debugLog('warn', 'Inspection[' + idx + '] missing inspector name');

        // Check checklist integrity
        if (Array.isArray(insp.checklistItems)) {
            const nc = insp.checklistItems.filter(ci => ci.status === 'Non-Compliant').length;
            debugLog('pass', 'Inspection[' + idx + '] has ' + insp.checklistItems.length + ' checklist items (' + nc + ' NC)');
        } else {
            debugLog('warn', 'Inspection[' + idx + '] missing checklist items');
        }

        // Validate dates
        if (insp.date && isNaN(Date.parse(insp.date))) {
            debugLog('fail', 'Inspection[' + idx + '] invalid date: ' + insp.date);
        }

        // Check for data corruption (oversized photos)
        if (insp.checklistItems) {
            insp.checklistItems.forEach((ci, ciIdx) => {
                if (ci.photos && ci.photos.length > 0) {
                    ci.photos.forEach((p, pi) => {
                        const sizeKB = Math.round(p.length * 0.75 / 1024);
                        if (sizeKB > 500) debugLog('warn', 'Large photo (' + sizeKB + 'KB) in item[' + ciIdx + '] photo[' + pi + ']');
                    });
                }
            });
        }
    });

    // Check stations
    debugLog('pass', 'Stations available: ' + (state.stations || []).length);
    debugLog('pass', 'Tenants available: ' + (state.tenants || []).length);
}

function debugTestUIComponents() {
    debugLog('info', '--- UI Component Tests ---');

    const components = [
        'page-inspections', 'insp-list-view', 'insp-wizard-view', 'insp-detail-view',
        'insp-search', 'insp-status-filter', 'insp-list-container',
        'insp-step-indicator', 'insp-step-1', 'insp-step-2', 'insp-step-3', 'insp-step-4', 'insp-step-5',
        'insp-type', 'insp-station', 'insp-tenancy', 'insp-date', 'insp-time',
        'insp-inspector-name', 'insp-weather', 'insp-overall-rating',
        'insp-comments', 'insp-signed-name', 'insp-signed-role',
        'sig-canvas', 'insp-checklist-container', 'insp-fsm-grid',
        'insp-general-photos', 'insp-summary-stats',
        'insp-stat-total', 'insp-stat-completed', 'insp-stat-draft', 'insp-stat-defects',
        'nav-badge-inspections', 'insp-debug-panel'
    ];

    let found = 0, missing = 0;
    components.forEach(id => {
        if (document.getElementById(id)) { found++; }
        else { debugLog('fail', 'Missing DOM element: #' + id); missing++; }
    });
    debugLog(missing === 0 ? 'pass' : 'warn', 'UI Components: ' + found + '/' + components.length + ' found');

    // Check nav item
    const navItem = document.querySelector('.nav-item[data-page="inspections"]');
    if (navItem) debugLog('pass', 'Inspections nav item present');
    else debugLog('fail', 'Inspections nav item missing from sidebar');

    // Check signature canvas
    const canvas = document.getElementById('sig-canvas');
    if (canvas && canvas.getContext) {
        debugLog('pass', 'Signature canvas supports 2D context');
    } else {
        debugLog('warn', 'Signature canvas not ready (init on wizard open)');
    }
}

function debugTestChecklistData() {
    debugLog('info', '--- Checklist Data Tests ---');

    if (!INSPECTION_SECTIONS || !Array.isArray(INSPECTION_SECTIONS)) {
        debugLog('fail', 'INSPECTION_SECTIONS not defined');
        return;
    }

    debugLog('pass', 'INSPECTION_SECTIONS has ' + INSPECTION_SECTIONS.length + ' sections');

    let totalItems = 0;
    INSPECTION_SECTIONS.forEach(s => {
        if (!s.id) debugLog('fail', 'Section missing id');
        if (!s.name) debugLog('fail', 'Section missing name');
        if (!Array.isArray(s.items) || s.items.length === 0) debugLog('fail', 'Section "' + s.name + '" has no items');
        else totalItems += s.items.length;
    });
    debugLog('pass', 'Total checklist items: ' + totalItems);

    if (FSM_LIST && Array.isArray(FSM_LIST)) {
        debugLog('pass', 'FSM_LIST has ' + FSM_LIST.length + ' fire safety measures');
    } else {
        debugLog('fail', 'FSM_LIST not defined');
    }
}

function debugTestExport() {
    debugLog('info', '--- Export Readiness Tests ---');

    // jsPDF
    if (window.jspdf && window.jspdf.jsPDF) {
        debugLog('pass', 'jsPDF library loaded');
    } else {
        debugLog('fail', 'jsPDF library not available');
    }

    // autoTable
    if (typeof window.jspdf !== 'undefined') {
        const testDoc = new window.jspdf.jsPDF();
        if (typeof testDoc.autoTable === 'function') {
            debugLog('pass', 'jsPDF autoTable plugin loaded');
        } else {
            debugLog('fail', 'jsPDF autoTable plugin not available');
        }
    }

    // docx
    if (typeof docx !== 'undefined' && docx.Document) {
        debugLog('pass', 'docx (Word) library loaded');
        debugLog('pass', 'docx.Packer available: ' + (typeof docx.Packer !== 'undefined'));
    } else {
        debugLog('warn', 'docx library not loaded - Word export will be unavailable');
    }

    // Test export functions exist
    if (typeof exportInspectionPDF === 'function') debugLog('pass', 'exportInspectionPDF function defined');
    else debugLog('fail', 'exportInspectionPDF function missing');

    if (typeof exportInspectionWord === 'function') debugLog('pass', 'exportInspectionWord function defined');
    else debugLog('fail', 'exportInspectionWord function missing');
}

function debugTestLocalStorage() {
    debugLog('info', '--- LocalStorage Tests ---');

    try {
        const testKey = '__fyrecomp_debug_test__';
        localStorage.setItem(testKey, 'ok');
        const val = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        if (val === 'ok') debugLog('pass', 'LocalStorage read/write working');
        else debugLog('fail', 'LocalStorage read mismatch');
    } catch(e) {
        debugLog('fail', 'LocalStorage error: ' + e.message);
    }

    // Check storage usage
    try {
        const used = JSON.stringify(localStorage).length;
        const usedMB = (used / (1024 * 1024)).toFixed(2);
        debugLog('info', 'LocalStorage usage: ~' + usedMB + ' MB');
        if (parseFloat(usedMB) > 4) debugLog('warn', 'LocalStorage usage high - consider clearing old data');
    } catch(e) {}

    // Saved inspector
    const saved = localStorage.getItem('fyrecomp_default_inspector');
    if (saved) {
        try {
            const si = JSON.parse(saved);
            debugLog('pass', 'Default inspector saved: ' + (si.name || 'unnamed'));
        } catch(e) {
            debugLog('warn', 'Default inspector data corrupted');
        }
    } else {
        debugLog('info', 'No default inspector saved yet');
    }
}

function debugCreateSampleInspection() {
    debugLog('info', '--- Creating Sample Inspection ---');

    const sampleStation = (state.stations && state.stations.length > 0) ? state.stations[0].name : 'Sample Station';
    const sampleTenancy = (state.tenants && state.tenants.length > 0) ? state.tenants[0].company : '';

    const sampleItems = [];
    INSPECTION_SECTIONS.slice(0, 3).forEach(s => {
        s.items.forEach((item, idx) => {
            const statuses = ['Compliant', 'Compliant', 'Compliant', 'Non-Compliant', 'N/A'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const ci = {
                sectionId: s.id, itemIdx: idx, itemName: item, status,
                notes: status === 'Non-Compliant' ? 'Requires attention' : '',
                photos: []
            };
            if (status === 'Non-Compliant') {
                ci.defectRisk = ['Minor', 'Medium', 'Major'][Math.floor(Math.random() * 3)];
                ci.defectDesc = 'Sample defect for ' + item;
                ci.defectCategory = s.name;
            }
            sampleItems.push(ci);
        });
    });

    const sample = {
        id: 'insp_sample_' + Date.now(),
        type: 'Fire Safety Audit',
        station: sampleStation,
        tenancy: sampleTenancy,
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        weather: 'Fine',
        inspectorName: 'Debug Inspector',
        inspectorCompany: 'FYRECOMP QA',
        inspectorLicence: 'DBG-001',
        selectedSections: INSPECTION_SECTIONS.slice(0, 3).map(s => s.id),
        checklistItems: sampleItems,
        fsmAssessments: FSM_LIST.slice(0, 5).map(name => ({ name, status: 'Operational' })),
        generalPhotos: [],
        overallRating: 'Minor Non-Compliance',
        comments: 'This is a sample inspection created by the debug tool for testing purposes.',
        signedName: 'Debug Inspector',
        signedRole: 'QA Tester',
        signature: null,
        status: 'Completed',
        defectsCreated: sampleItems.filter(i => i.status === 'Non-Compliant').length,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };

    if (!state.inspections) state.inspections = [];
    state.inspections.push(sample);
    if (typeof saveState === 'function') saveState();
    renderInspectionList();

    debugLog('pass', 'Sample inspection created: ' + sample.id);
    debugLog('pass', 'Items: ' + sampleItems.length + ', NC: ' + sampleItems.filter(i => i.status === 'Non-Compliant').length);
    debugLog('info', 'Sample inspection visible in list view');
}

// ---- Init on page load ----
document.addEventListener('DOMContentLoaded', function() {
    renderInspectionList();
});

// Also render when navigating to inspections page
const origNavigateTo = typeof navigateTo === 'function' ? navigateTo : null;
if (origNavigateTo) {
    navigateTo = function(page) {
        origNavigateTo(page);
        if (page === 'inspections') {
            showInspectionList();
        }
    };
}

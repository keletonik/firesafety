"""Fire Safety Compliance Platform - Flask Application."""

import os
import json
import uuid
import shutil
import io
import csv
from datetime import datetime
from contextlib import contextmanager
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from sqlalchemy import func, or_, and_, desc, case
from sqlalchemy.orm import joinedload
from models import (
    init_db, get_db, SessionLocal,
    Station, Tenant, Defect, Document, Note, Communication, Activity
)

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

MONTH_NAMES = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December"
}

DOCUMENT_CATEGORIES = [
    'Fire Safety Schedule (FSS)',
    'Annual Fire Safety Statement (AFSS)',
    'Fire Safety Certificate (FSC)',
    'Inspection Certificate',
    'Compliance Report',
    'Defect Photo',
    'Defect Report',
    'Correspondence',
    'General',
]


@contextmanager
def db_session():
    """Context manager for database sessions with proper cleanup."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def station_to_dict(s, include_tenants=False):
    d = {
        'id': s.id, 'name': s.name, 'code': s.code, 'region': s.region,
        'building_name': s.building_name, 'mri_bld_id': s.mri_bld_id,
        'address': s.address, 'city': s.city, 'state': s.state,
        'council': s.council, 'icomply_contact': s.icomply_contact,
        'afss_due_month': s.afss_due_month,
        'afss_due_month_name': MONTH_NAMES.get(s.afss_due_month, ''),
        'tenant_fsc_due_month': s.tenant_fsc_due_month,
        'tenant_fsc_due_month_name': MONTH_NAMES.get(s.tenant_fsc_due_month, ''),
        'inspection_month': s.inspection_month,
        'inspection_month_name': MONTH_NAMES.get(s.inspection_month, ''),
        'afss_likely': s.afss_likely,
        'lease_type_category': s.lease_type_category,
        'has_fire_safety_schedule': s.has_fire_safety_schedule,
        'fire_safety_schedule_notes': s.fire_safety_schedule_notes,
        'tenant_count': len(s.tenants) if s.tenants else 0,
        'created_at': s.created_at.isoformat() if s.created_at else None,
        'updated_at': s.updated_at.isoformat() if s.updated_at else None,
    }
    if include_tenants:
        d['tenants'] = [tenant_to_dict(t) for t in s.tenants]
    return d


def tenant_to_dict(t):
    return {
        'id': t.id, 'station_id': t.station_id,
        'tenant_name': t.tenant_name, 'trading_name': t.trading_name,
        'file_number': t.file_number, 'previous_file_number': t.previous_file_number,
        'lease_id': t.lease_id, 'agreement_number': t.agreement_number,
        'suit_id': t.suit_id, 'suite_type': t.suite_type,
        'region': t.region, 'zone': t.zone,
        'premises_description': t.premises_description,
        'lots_dp_numbers': t.lots_dp_numbers,
        'standard_industry_class': t.standard_industry_class,
        'lease_status': t.lease_status, 'lease_type': t.lease_type,
        'lease_start': t.lease_start, 'lease_expiry': t.lease_expiry,
        'lease_terms': t.lease_terms, 'lease_note': t.lease_note,
        'heritage': t.heritage, 'area_m2': t.area_m2,
        'rent_psm_pa': t.rent_psm_pa, 'base_rent_pa': t.base_rent_pa,
        'total_passing_rent_pa': t.total_passing_rent_pa,
        'rent_income_code': t.rent_income_code,
        'contact_name': t.contact_name, 'contact_phone': t.contact_phone,
        'contact_phone2': t.contact_phone2, 'contact_mobile': t.contact_mobile,
        'contact_email': t.contact_email, 'billing_email': t.billing_email,
        'abn': t.abn, 'billing_name': t.billing_name,
        'billing_address': t.billing_address, 'billing_city': t.billing_city,
        'billing_state': t.billing_state, 'billing_postcode': t.billing_postcode,
        'property_manager': t.property_manager,
        'priority': t.priority, 'fsc_status': t.fsc_status,
        'fsc_requested_date': t.fsc_requested_date,
        'fsc_received_date': t.fsc_received_date,
        'afss_month': t.afss_month,
        'afss_month_name': MONTH_NAMES.get(t.afss_month, ''),
        'fsc_due_month': t.fsc_due_month,
        'fsc_due_month_name': MONTH_NAMES.get(t.fsc_due_month, ''),
        'has_fire_safety_schedule': t.has_fire_safety_schedule,
        'fire_safety_schedule_notes': t.fire_safety_schedule_notes,
        'fire_detection': t.fire_detection,
        'fire_sprinklers': t.fire_sprinklers,
        'fire_hydrants': t.fire_hydrants,
        'fire_extinguishers': t.fire_extinguishers,
        'exit_lighting': t.exit_lighting,
        'emergency_lighting': t.emergency_lighting,
        'evacuation_diagrams': t.evacuation_diagrams,
        'emergency_pathway': t.emergency_pathway,
        'fire_doors': t.fire_doors, 'fire_walls': t.fire_walls,
        'mechanical_ventilation': t.mechanical_ventilation,
        'fire_equipment_service_date': t.fire_equipment_service_date,
        'fire_equipment_service_due': t.fire_equipment_service_due,
        'possible_afss_issues': t.possible_afss_issues,
        'comments_to_site_staff': t.comments_to_site_staff,
        'last_inspection_date': t.last_inspection_date,
        'open_defects': t.open_defects, 'major_defects': t.major_defects,
        'data_source': t.data_source,
        'station_name': t.station.name if t.station else '',
        'created_at': t.created_at.isoformat() if t.created_at else None,
        'updated_at': t.updated_at.isoformat() if t.updated_at else None,
    }


def defect_to_dict(d):
    return {
        'id': d.id, 'station_id': d.station_id, 'tenant_id': d.tenant_id,
        'site_name': d.site_name, 'category': d.category,
        'risk': d.risk, 'progress': d.progress, 'description': d.description,
        'audit_type': d.audit_type, 'audit_date': d.audit_date,
        'financial_year': d.financial_year, 'year': d.year,
        'quarter': d.quarter, 'month': d.month,
        'assigned_to': d.assigned_to, 'due_date': d.due_date,
        'resolution_notes': d.resolution_notes, 'resolved_date': d.resolved_date,
        'station_name': d.station.name if d.station else '',
        'tenant_name': d.tenant.tenant_name if d.tenant else '',
        'created_at': d.created_at.isoformat() if d.created_at else None,
        'updated_at': d.updated_at.isoformat() if d.updated_at else None,
    }


def note_to_dict(n):
    return {
        'id': n.id, 'station_id': n.station_id, 'tenant_id': n.tenant_id,
        'note_type': n.note_type, 'content': n.content,
        'created_by': n.created_by,
        'created_at': n.created_at.isoformat() if n.created_at else None,
    }


def communication_to_dict(c):
    return {
        'id': c.id, 'tenant_id': c.tenant_id,
        'comm_type': c.comm_type, 'subject': c.subject,
        'content': c.content, 'contact_person': c.contact_person,
        'direction': c.direction, 'status': c.status,
        'followup_required': c.followup_required,
        'followup_date': c.followup_date,
        'followup_completed': c.followup_completed,
        'created_at': c.created_at.isoformat() if c.created_at else None,
    }


def document_to_dict(d):
    return {
        'id': d.id, 'station_id': d.station_id,
        'tenant_id': d.tenant_id, 'defect_id': d.defect_id,
        'filename': d.filename, 'original_filename': d.original_filename,
        'file_size': d.file_size, 'mime_type': d.mime_type,
        'category': d.category, 'description': d.description,
        'uploaded_at': d.uploaded_at.isoformat() if d.uploaded_at else None,
    }


def activity_to_dict(a):
    return {
        'id': a.id, 'station_id': a.station_id, 'tenant_id': a.tenant_id,
        'action': a.action, 'description': a.description,
        'entity_type': a.entity_type, 'entity_id': a.entity_id,
        'user': a.user,
        'created_at': a.created_at.isoformat() if a.created_at else None,
    }


def log_activity(db, action, description, station_id=None, tenant_id=None,
                 entity_type=None, entity_id=None):
    activity = Activity(
        station_id=station_id, tenant_id=tenant_id,
        action=action, description=description,
        entity_type=entity_type, entity_id=entity_id,
    )
    db.add(activity)
    db.commit()


# ─── Serve Frontend ─────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')


@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.route('/api/dashboard')
def get_dashboard():
    db = get_db()
    try:
        total_stations = db.query(Station).count()
        total_tenants = db.query(Tenant).count()
        afss_stations = db.query(Station).filter(Station.afss_due_month.isnot(None)).count()

        # Fire Safety Schedule stats
        fss_stations = db.query(Station).filter(Station.has_fire_safety_schedule == True).count()
        fss_tenants = db.query(Tenant).filter(Tenant.has_fire_safety_schedule == True).count()

        critical = db.query(Tenant).filter(Tenant.priority == 'Critical').count()
        high = db.query(Tenant).filter(Tenant.priority == 'High').count()
        medium = db.query(Tenant).filter(Tenant.priority == 'Medium').count()
        low = db.query(Tenant).filter(Tenant.priority == 'Low').count()

        fsc_received = db.query(Tenant).filter(Tenant.fsc_status == 'Received').count()
        fsc_compliant = db.query(Tenant).filter(Tenant.fsc_status == 'Compliant').count()
        fsc_pending = db.query(Tenant).filter(Tenant.fsc_status == 'Pending').count()
        fsc_outstanding = db.query(Tenant).filter(Tenant.fsc_status == 'Outstanding').count()
        fsc_na = db.query(Tenant).filter(Tenant.fsc_status == 'Not Applicable').count()

        total_defects = db.query(Defect).count()
        open_defects = db.query(Defect).filter(Defect.progress.in_(['In Progress', 'Outstanding'])).count()
        major_defects = db.query(Defect).filter(
            Defect.risk.in_(['Major', 'Medium']),
            Defect.progress.in_(['In Progress', 'Outstanding'])
        ).count()
        minor_defects = db.query(Defect).filter(
            Defect.risk == 'Minor',
            Defect.progress.in_(['In Progress', 'Outstanding'])
        ).count()
        completed_defects = db.query(Defect).filter(Defect.progress == 'Completed').count()

        # AFSS by month
        afss_by_month = {}
        for m in range(1, 13):
            count = db.query(Station).filter(Station.afss_due_month == m).count()
            afss_by_month[MONTH_NAMES[m]] = count

        # Priority actions
        priority_tenants = db.query(Tenant).filter(
            Tenant.priority.in_(['Critical', 'High'])
        ).order_by(
            desc(Tenant.major_defects), desc(Tenant.open_defects)
        ).limit(20).all()

        # Recent activities
        recent = db.query(Activity).order_by(desc(Activity.created_at)).limit(10).all()

        # Compliance rate
        active_tenants = db.query(Tenant).filter(
            Tenant.lease_status.in_(['Current', 'Holdover', 'Leased'])
        ).count()
        compliance_rate = round((fsc_received + fsc_compliant) / max(active_tenants, 1) * 100, 1)

        # FSC percentage
        total_for_fsc = fsc_received + fsc_compliant + fsc_pending + fsc_outstanding
        fsc_pct = round((fsc_received + fsc_compliant) / max(total_for_fsc, 1) * 100, 1)

        return jsonify({
            'total_stations': total_stations,
            'total_tenants': total_tenants,
            'afss_stations': afss_stations,
            'fss_stations': fss_stations,
            'fss_tenants': fss_tenants,
            'critical': critical, 'high': high, 'medium': medium, 'low': low,
            'fsc_received': fsc_received, 'fsc_compliant': fsc_compliant,
            'fsc_pending': fsc_pending, 'fsc_outstanding': fsc_outstanding,
            'fsc_na': fsc_na, 'fsc_pct': fsc_pct,
            'total_defects': total_defects, 'open_defects': open_defects,
            'major_defects': major_defects, 'minor_defects': minor_defects,
            'completed_defects': completed_defects,
            'afss_by_month': afss_by_month,
            'priority_actions': [tenant_to_dict(t) for t in priority_tenants],
            'recent_activities': [activity_to_dict(a) for a in recent],
            'compliance_rate': compliance_rate,
            'active_tenants': active_tenants,
            'priority_distribution': {
                'Critical': critical, 'High': high,
                'Medium': medium, 'Low': low
            },
            'fsc_distribution': {
                'Received': fsc_received, 'Compliant': fsc_compliant,
                'Pending': fsc_pending, 'Outstanding': fsc_outstanding,
                'Not Applicable': fsc_na
            },
        })
    finally:
        db.close()


# ─── Stations ─────────────────────────────────────────────────────────────────

@app.route('/api/stations')
def get_stations():
    db = get_db()
    try:
        search = request.args.get('search', '').strip()
        region = request.args.get('region', '')
        has_afss = request.args.get('has_afss', '')
        has_fss = request.args.get('has_fss', '')

        q = db.query(Station)
        if search:
            q = q.filter(or_(
                Station.name.ilike(f'%{search}%'),
                Station.code.ilike(f'%{search}%'),
                Station.council.ilike(f'%{search}%'),
                Station.building_name.ilike(f'%{search}%'),
            ))
        if region:
            q = q.filter(Station.region == region)
        if has_afss == 'true':
            q = q.filter(Station.afss_due_month.isnot(None))
        if has_fss == 'true':
            q = q.filter(Station.has_fire_safety_schedule == True)
        elif has_fss == 'false':
            q = q.filter(or_(Station.has_fire_safety_schedule == False, Station.has_fire_safety_schedule.is_(None)))

        stations = q.order_by(Station.name).all()

        result = []
        for s in stations:
            d = station_to_dict(s)
            tenants = db.query(Tenant).filter(Tenant.station_id == s.id).all()
            d['tenant_count'] = len(tenants)
            d['critical_count'] = sum(1 for t in tenants if t.priority == 'Critical')
            d['high_count'] = sum(1 for t in tenants if t.priority == 'High')
            d['open_defects'] = sum(t.open_defects or 0 for t in tenants)
            d['major_defects'] = sum(t.major_defects or 0 for t in tenants)
            active = [t for t in tenants if t.lease_status in ('Current', 'Holdover', 'Leased')]
            d['fsc_received'] = sum(1 for t in active if t.fsc_status in ('Received', 'Compliant'))
            d['fsc_outstanding'] = sum(1 for t in active if t.fsc_status in ('Outstanding', 'Pending'))
            d['active_tenants'] = len(active)
            d['compliance_rate'] = round(d['fsc_received'] / max(len(active), 1) * 100, 1)
            d['doc_count'] = db.query(Document).filter(Document.station_id == s.id).count()
            result.append(d)

        return jsonify(result)
    finally:
        db.close()


@app.route('/api/stations/<int:station_id>')
def get_station(station_id):
    db = get_db()
    try:
        s = db.query(Station).filter(Station.id == station_id).first()
        if not s:
            return jsonify({'error': 'Station not found'}), 404

        d = station_to_dict(s, include_tenants=True)
        d['defects'] = [defect_to_dict(df) for df in s.defects]
        d['notes'] = [note_to_dict(n) for n in sorted(s.notes, key=lambda x: x.created_at or datetime.min, reverse=True)]
        d['documents'] = [document_to_dict(doc) for doc in s.documents]
        d['activities'] = [activity_to_dict(a) for a in sorted(s.activities, key=lambda x: x.created_at or datetime.min, reverse=True)[:20]]

        tenants = d.get('tenants', [])
        active = [t for t in tenants if t.get('lease_status') in ('Current', 'Holdover', 'Leased')]
        d['critical_count'] = sum(1 for t in tenants if t['priority'] == 'Critical')
        d['high_count'] = sum(1 for t in tenants if t['priority'] == 'High')
        d['fsc_received'] = sum(1 for t in active if t['fsc_status'] in ('Received', 'Compliant'))
        d['fsc_outstanding'] = sum(1 for t in active if t['fsc_status'] in ('Outstanding', 'Pending'))
        d['active_tenants'] = len(active)
        d['compliance_rate'] = round(d['fsc_received'] / max(len(active), 1) * 100, 1)

        # Group documents by category
        doc_groups = {}
        for doc in d['documents']:
            cat = doc['category'] or 'General'
            if cat not in doc_groups:
                doc_groups[cat] = []
            doc_groups[cat].append(doc)
        d['documents_by_category'] = doc_groups

        return jsonify(d)
    finally:
        db.close()


@app.route('/api/stations/<int:station_id>', methods=['PUT'])
def update_station(station_id):
    db = get_db()
    try:
        s = db.query(Station).filter(Station.id == station_id).first()
        if not s:
            return jsonify({'error': 'Station not found'}), 404

        data = request.json
        for field in ['has_fire_safety_schedule', 'fire_safety_schedule_notes',
                       'icomply_contact', 'address', 'council']:
            if field in data:
                setattr(s, field, data[field])

        s.updated_at = datetime.utcnow()
        db.commit()
        log_activity(db, 'updated', f'Station {s.name} updated', station_id=s.id, entity_type='station', entity_id=s.id)
        return jsonify(station_to_dict(s))
    finally:
        db.close()


# ─── Tenants ──────────────────────────────────────────────────────────────────

@app.route('/api/tenants')
def get_tenants():
    db = get_db()
    try:
        search = request.args.get('search', '').strip()
        priority = request.args.get('priority', '')
        fsc_status = request.args.get('fsc_status', '')
        region = request.args.get('region', '')
        station_id = request.args.get('station_id', '')
        property_manager = request.args.get('property_manager', '')
        lease_status = request.args.get('lease_status', '')
        industry = request.args.get('industry', '')
        has_fss = request.args.get('has_fss', '')
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', 0, type=int)

        q = db.query(Tenant).join(Station)

        if search:
            q = q.filter(or_(
                Tenant.tenant_name.ilike(f'%{search}%'),
                Tenant.trading_name.ilike(f'%{search}%'),
                Tenant.file_number.ilike(f'%{search}%'),
                Tenant.lease_id.ilike(f'%{search}%'),
                Station.name.ilike(f'%{search}%'),
                Tenant.contact_name.ilike(f'%{search}%'),
                Tenant.contact_email.ilike(f'%{search}%'),
            ))
        if priority:
            q = q.filter(Tenant.priority == priority)
        if fsc_status:
            if fsc_status == 'Outstanding':
                q = q.filter(Tenant.fsc_status.in_(['Outstanding', 'Pending']))
            else:
                q = q.filter(Tenant.fsc_status == fsc_status)
        if region:
            q = q.filter(Tenant.region == region)
        if station_id:
            q = q.filter(Tenant.station_id == int(station_id))
        if property_manager:
            q = q.filter(Tenant.property_manager == property_manager)
        if lease_status:
            q = q.filter(Tenant.lease_status == lease_status)
        if industry:
            q = q.filter(Tenant.standard_industry_class == industry)
        if has_fss == 'true':
            q = q.filter(Tenant.has_fire_safety_schedule == True)
        elif has_fss == 'false':
            q = q.filter(or_(Tenant.has_fire_safety_schedule == False, Tenant.has_fire_safety_schedule.is_(None)))

        total = q.count()
        q = q.order_by(Station.name, Tenant.tenant_name)

        if limit:
            q = q.offset(offset).limit(limit)

        tenants = q.all()
        return jsonify({
            'total': total,
            'tenants': [tenant_to_dict(t) for t in tenants]
        })
    finally:
        db.close()


@app.route('/api/tenants/<int:tenant_id>')
def get_tenant(tenant_id):
    db = get_db()
    try:
        t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not t:
            return jsonify({'error': 'Tenant not found'}), 404

        d = tenant_to_dict(t)
        # Include tenant-specific defects AND station-level defects
        tenant_defects = list(t.defects)
        station_defects = db.query(Defect).filter(
            Defect.station_id == t.station_id,
            Defect.tenant_id.is_(None)
        ).all()
        all_defects = tenant_defects + station_defects
        d['defects'] = [defect_to_dict(df) for df in all_defects]
        d['notes'] = [note_to_dict(n) for n in sorted(t.notes, key=lambda x: x.created_at or datetime.min, reverse=True)]
        d['documents'] = [document_to_dict(doc) for doc in t.documents]
        d['communications'] = [communication_to_dict(c) for c in sorted(t.communications, key=lambda x: x.created_at or datetime.min, reverse=True)]
        d['activities'] = [activity_to_dict(a) for a in sorted(t.activities, key=lambda x: x.created_at or datetime.min, reverse=True)[:20]]

        # Group documents by category
        doc_groups = {}
        for doc in d['documents']:
            cat = doc['category'] or 'General'
            if cat not in doc_groups:
                doc_groups[cat] = []
            doc_groups[cat].append(doc)
        d['documents_by_category'] = doc_groups

        # Defect documents
        for defect_dict in d['defects']:
            defect_docs = db.query(Document).filter(Document.defect_id == defect_dict['id']).all()
            defect_dict['documents'] = [document_to_dict(dd) for dd in defect_docs]

        return jsonify(d)
    finally:
        db.close()


@app.route('/api/tenants/<int:tenant_id>', methods=['PUT'])
def update_tenant(tenant_id):
    db = get_db()
    try:
        t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not t:
            return jsonify({'error': 'Tenant not found'}), 404

        data = request.json
        updatable = [
            'priority', 'fsc_status', 'fsc_requested_date', 'fsc_received_date',
            'has_fire_safety_schedule', 'fire_safety_schedule_notes',
            'fire_detection', 'fire_sprinklers', 'fire_hydrants', 'fire_extinguishers',
            'exit_lighting', 'emergency_lighting', 'evacuation_diagrams',
            'emergency_pathway', 'fire_doors', 'fire_walls', 'mechanical_ventilation',
            'fire_equipment_service_date', 'fire_equipment_service_due',
            'possible_afss_issues', 'comments_to_site_staff', 'last_inspection_date',
            'contact_name', 'contact_phone', 'contact_phone2', 'contact_mobile',
            'contact_email', 'billing_email',
        ]
        changes = []
        for field in updatable:
            if field in data:
                old_val = getattr(t, field)
                new_val = data[field]
                if str(old_val) != str(new_val):
                    changes.append(f'{field}: {old_val} -> {new_val}')
                setattr(t, field, new_val)

        t.updated_at = datetime.utcnow()
        db.commit()

        if changes:
            log_activity(db, 'updated', f'Tenant {t.tenant_name}: {"; ".join(changes[:3])}',
                         station_id=t.station_id, tenant_id=t.id,
                         entity_type='tenant', entity_id=t.id)

        return jsonify(tenant_to_dict(t))
    finally:
        db.close()


# ─── Defects ──────────────────────────────────────────────────────────────────

@app.route('/api/defects')
def get_defects():
    db = get_db()
    try:
        search = request.args.get('search', '').strip()
        risk = request.args.get('risk', '')
        progress = request.args.get('progress', '')
        station_id = request.args.get('station_id', '')
        tenant_id = request.args.get('tenant_id', '')

        q = db.query(Defect)
        if search:
            q = q.filter(or_(
                Defect.site_name.ilike(f'%{search}%'),
                Defect.category.ilike(f'%{search}%'),
                Defect.description.ilike(f'%{search}%'),
            ))
        if risk:
            q = q.filter(Defect.risk == risk)
        if progress:
            q = q.filter(Defect.progress == progress)
        if station_id:
            q = q.filter(Defect.station_id == int(station_id))
        if tenant_id:
            q = q.filter(Defect.tenant_id == int(tenant_id))

        defects = q.order_by(desc(Defect.audit_date)).all()
        result = []
        for d in defects:
            dd = defect_to_dict(d)
            # Include document count for each defect
            dd['doc_count'] = db.query(Document).filter(Document.defect_id == d.id).count()
            result.append(dd)
        return jsonify(result)
    finally:
        db.close()


@app.route('/api/defects', methods=['POST'])
def create_defect():
    db = get_db()
    try:
        data = request.json
        defect = Defect(
            station_id=data.get('station_id'),
            tenant_id=data.get('tenant_id'),
            site_name=data['site_name'],
            category=data.get('category'),
            risk=data.get('risk', 'Minor'),
            progress=data.get('progress', 'Outstanding'),
            description=data.get('description'),
            audit_type=data.get('audit_type'),
            audit_date=data.get('audit_date'),
            assigned_to=data.get('assigned_to'),
            due_date=data.get('due_date'),
        )
        db.add(defect)
        db.commit()
        log_activity(db, 'created', f'Defect created for {defect.site_name}',
                     station_id=defect.station_id, tenant_id=defect.tenant_id,
                     entity_type='defect', entity_id=defect.id)
        return jsonify(defect_to_dict(defect)), 201
    finally:
        db.close()


@app.route('/api/defects/<int:defect_id>', methods=['PUT'])
def update_defect(defect_id):
    db = get_db()
    try:
        d = db.query(Defect).filter(Defect.id == defect_id).first()
        if not d:
            return jsonify({'error': 'Defect not found'}), 404

        data = request.json
        for field in ['risk', 'progress', 'description', 'category', 'assigned_to',
                       'due_date', 'resolution_notes', 'resolved_date']:
            if field in data:
                setattr(d, field, data[field])

        d.updated_at = datetime.utcnow()
        db.commit()
        log_activity(db, 'updated', f'Defect {d.id} updated for {d.site_name}',
                     station_id=d.station_id, entity_type='defect', entity_id=d.id)
        return jsonify(defect_to_dict(d))
    finally:
        db.close()


# ─── AFSS Schedule ────────────────────────────────────────────────────────────

@app.route('/api/afss')
def get_afss():
    db = get_db()
    try:
        month = request.args.get('month', type=int)
        q = db.query(Station).filter(Station.afss_due_month.isnot(None))
        if month:
            q = q.filter(Station.afss_due_month == month)

        stations = q.order_by(Station.afss_due_month, Station.name).all()
        result = []
        for s in stations:
            tenants = db.query(Tenant).filter(Tenant.station_id == s.id).all()
            active_tenants = [t for t in tenants if t.lease_status in ('Current', 'Holdover', 'Leased')]
            fsc_received = sum(1 for t in active_tenants if t.fsc_status in ('Received', 'Compliant'))
            fsc_outstanding = len(active_tenants) - fsc_received

            result.append({
                'station_id': s.id,
                'station_name': s.name,
                'code': s.code,
                'afss_due_month': s.afss_due_month,
                'afss_due_month_name': MONTH_NAMES.get(s.afss_due_month, ''),
                'tenant_fsc_due_month': s.tenant_fsc_due_month,
                'tenant_fsc_due_month_name': MONTH_NAMES.get(s.tenant_fsc_due_month, ''),
                'inspection_month': s.inspection_month,
                'inspection_month_name': MONTH_NAMES.get(s.inspection_month, ''),
                'lease_type_category': s.lease_type_category,
                'afss_likely': s.afss_likely,
                'has_fss': s.has_fire_safety_schedule,
                'total_tenants': len(active_tenants),
                'fsc_received': fsc_received,
                'fsc_outstanding': fsc_outstanding,
                'status': 'Compliant' if fsc_outstanding == 0 and len(active_tenants) > 0
                          else 'Pending' if fsc_received > 0
                          else 'Outstanding',
            })
        return jsonify(result)
    finally:
        db.close()


# ─── Notes ────────────────────────────────────────────────────────────────────

@app.route('/api/notes', methods=['GET'])
def get_notes():
    db = get_db()
    try:
        station_id = request.args.get('station_id', type=int)
        tenant_id = request.args.get('tenant_id', type=int)

        q = db.query(Note)
        if station_id:
            q = q.filter(Note.station_id == station_id)
        if tenant_id:
            q = q.filter(Note.tenant_id == tenant_id)

        notes = q.order_by(desc(Note.created_at)).all()
        return jsonify([note_to_dict(n) for n in notes])
    finally:
        db.close()


@app.route('/api/notes', methods=['POST'])
def create_note():
    db = get_db()
    try:
        data = request.json
        note = Note(
            station_id=data.get('station_id'),
            tenant_id=data.get('tenant_id'),
            note_type=data.get('note_type', 'general'),
            content=data['content'],
            created_by=data.get('created_by'),
        )
        db.add(note)
        db.commit()
        log_activity(db, 'created', f'Note added: {note.content[:50]}...',
                     station_id=note.station_id, tenant_id=note.tenant_id,
                     entity_type='note', entity_id=note.id)
        return jsonify(note_to_dict(note)), 201
    finally:
        db.close()


@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    db = get_db()
    try:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return jsonify({'error': 'Note not found'}), 404
        db.delete(note)
        db.commit()
        return jsonify({'success': True})
    finally:
        db.close()


# ─── Communications ───────────────────────────────────────────────────────────

@app.route('/api/communications', methods=['GET'])
def get_communications():
    db = get_db()
    try:
        tenant_id = request.args.get('tenant_id', type=int)
        q = db.query(Communication)
        if tenant_id:
            q = q.filter(Communication.tenant_id == tenant_id)
        comms = q.order_by(desc(Communication.created_at)).all()
        return jsonify([communication_to_dict(c) for c in comms])
    finally:
        db.close()


@app.route('/api/communications', methods=['POST'])
def create_communication():
    db = get_db()
    try:
        data = request.json
        comm = Communication(
            tenant_id=data.get('tenant_id'),
            comm_type=data['comm_type'],
            subject=data.get('subject'),
            content=data.get('content'),
            contact_person=data.get('contact_person'),
            direction=data.get('direction', 'Outbound'),
            status=data.get('status', 'Sent'),
            followup_required=data.get('followup_required', False),
            followup_date=data.get('followup_date'),
        )
        db.add(comm)
        db.commit()
        log_activity(db, 'created', f'Communication logged: {comm.subject}',
                     tenant_id=comm.tenant_id,
                     entity_type='communication', entity_id=comm.id)
        return jsonify(communication_to_dict(comm)), 201
    finally:
        db.close()


@app.route('/api/communications/<int:comm_id>', methods=['PUT'])
def update_communication(comm_id):
    db = get_db()
    try:
        c = db.query(Communication).filter(Communication.id == comm_id).first()
        if not c:
            return jsonify({'error': 'Communication not found'}), 404

        data = request.json
        for field in ['status', 'followup_completed', 'content']:
            if field in data:
                setattr(c, field, data[field])
        c.updated_at = datetime.utcnow()
        db.commit()
        return jsonify(communication_to_dict(c))
    finally:
        db.close()


# ─── Documents ────────────────────────────────────────────────────────────────

@app.route('/api/documents', methods=['GET'])
def get_documents():
    db = get_db()
    try:
        station_id = request.args.get('station_id', type=int)
        tenant_id = request.args.get('tenant_id', type=int)
        defect_id = request.args.get('defect_id', type=int)
        category = request.args.get('category', '')

        q = db.query(Document)
        if station_id:
            q = q.filter(Document.station_id == station_id)
        if tenant_id:
            q = q.filter(Document.tenant_id == tenant_id)
        if defect_id:
            q = q.filter(Document.defect_id == defect_id)
        if category:
            q = q.filter(Document.category == category)

        docs = q.order_by(desc(Document.uploaded_at)).all()
        return jsonify([document_to_dict(d) for d in docs])
    finally:
        db.close()


@app.route('/api/documents/upload', methods=['POST'])
def upload_document():
    db = get_db()
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Generate unique filename
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        file.save(file_path)

        doc = Document(
            station_id=request.form.get('station_id', type=int),
            tenant_id=request.form.get('tenant_id', type=int),
            defect_id=request.form.get('defect_id', type=int),
            filename=unique_name,
            original_filename=file.filename,
            file_path=file_path,
            file_size=os.path.getsize(file_path),
            mime_type=file.content_type,
            category=request.form.get('category', 'General'),
            description=request.form.get('description', ''),
        )
        db.add(doc)
        db.commit()

        log_activity(db, 'uploaded', f'Document uploaded: {file.filename} ({doc.category})',
                     station_id=doc.station_id, tenant_id=doc.tenant_id,
                     entity_type='document', entity_id=doc.id)
        return jsonify(document_to_dict(doc)), 201
    finally:
        db.close()


@app.route('/api/documents/<int:doc_id>/download')
def download_document(doc_id):
    db = get_db()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        return send_file(doc.file_path, download_name=doc.original_filename)
    finally:
        db.close()


@app.route('/api/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    db = get_db()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
        db.delete(doc)
        db.commit()
        return jsonify({'success': True})
    finally:
        db.close()


@app.route('/api/document-categories')
def get_document_categories():
    return jsonify(DOCUMENT_CATEGORIES)


# ─── Activities ───────────────────────────────────────────────────────────────

@app.route('/api/activities')
def get_activities():
    db = get_db()
    try:
        limit = request.args.get('limit', 50, type=int)
        activities = db.query(Activity).order_by(desc(Activity.created_at)).limit(limit).all()
        return jsonify([activity_to_dict(a) for a in activities])
    finally:
        db.close()


# ─── Timeline ────────────────────────────────────────────────────────────────

@app.route('/api/timeline')
def get_timeline():
    db = get_db()
    try:
        station_id = request.args.get('station_id', type=int)
        tenant_id = request.args.get('tenant_id', type=int)
        events = []

        # Resolve station_id from tenant if needed
        actual_station_id = station_id
        if tenant_id and not station_id:
            t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if t:
                actual_station_id = t.station_id

        # Activities
        q = db.query(Activity)
        if tenant_id:
            q = q.filter(or_(
                Activity.tenant_id == tenant_id,
                and_(Activity.station_id == actual_station_id, Activity.tenant_id.is_(None))
            ))
        elif station_id:
            q = q.filter(Activity.station_id == station_id)
        for a in q.all():
            events.append({
                'type': 'activity', 'icon': 'activity',
                'title': a.action or 'Activity',
                'description': a.description or '',
                'date': a.created_at.isoformat() if a.created_at else None,
                'user': a.user,
            })

        # Notes
        q = db.query(Note)
        if tenant_id:
            q = q.filter(or_(
                Note.tenant_id == tenant_id,
                and_(Note.station_id == actual_station_id, Note.tenant_id.is_(None))
            ))
        elif station_id:
            q = q.filter(Note.station_id == station_id)
        for n in q.all():
            events.append({
                'type': 'note', 'icon': 'note',
                'title': 'Note added' + (f' by {n.created_by}' if n.created_by else ''),
                'description': n.content or '',
                'date': n.created_at.isoformat() if n.created_at else None,
                'user': n.created_by,
            })

        # Communications (tenant-level)
        if tenant_id:
            for c in db.query(Communication).filter(Communication.tenant_id == tenant_id).all():
                events.append({
                    'type': 'communication',
                    'icon': (c.comm_type or 'message').lower(),
                    'title': c.subject or c.comm_type or 'Communication',
                    'description': c.content or '',
                    'date': c.created_at.isoformat() if c.created_at else None,
                    'direction': c.direction,
                    'status': c.status,
                    'user': c.contact_person,
                })

        # Defects
        q = db.query(Defect)
        if tenant_id:
            q = q.filter(or_(
                Defect.tenant_id == tenant_id,
                and_(Defect.station_id == actual_station_id, Defect.tenant_id.is_(None))
            ))
        elif station_id:
            q = q.filter(Defect.station_id == station_id)
        for df in q.all():
            events.append({
                'type': 'defect', 'icon': 'defect',
                'title': f'Defect: {df.category or "Unknown"} ({df.risk or "Unknown"} risk)',
                'description': f'{df.site_name} - {df.progress or "Outstanding"}'
                               + (f'. {df.description}' if df.description else ''),
                'date': df.created_at.isoformat() if df.created_at else (df.audit_date or None),
                'risk': df.risk,
                'progress': df.progress,
                'defect_id': df.id,
            })

        events.sort(key=lambda e: e.get('date') or '', reverse=True)
        return jsonify(events)
    finally:
        db.close()


# ─── Analytics ────────────────────────────────────────────────────────────────

@app.route('/api/analytics')
def get_analytics():
    db = get_db()
    try:
        # Defects by category
        defects_by_category = db.query(
            Defect.category, func.count(Defect.id)
        ).filter(Defect.category.isnot(None)).group_by(Defect.category).all()

        # Defects by station (top 20)
        defects_by_station = db.query(
            Defect.site_name, func.count(Defect.id)
        ).filter(
            Defect.progress.in_(['In Progress', 'Outstanding'])
        ).group_by(Defect.site_name).order_by(
            desc(func.count(Defect.id))
        ).limit(20).all()

        # Defects by risk
        defects_by_risk = db.query(
            Defect.risk, func.count(Defect.id)
        ).filter(Defect.risk.isnot(None)).group_by(Defect.risk).all()

        # Defects by progress
        defects_by_progress = db.query(
            Defect.progress, func.count(Defect.id)
        ).filter(Defect.progress.isnot(None)).group_by(Defect.progress).all()

        # Defects by financial year
        defects_by_fy = db.query(
            Defect.financial_year, func.count(Defect.id)
        ).filter(Defect.financial_year.isnot(None)).group_by(Defect.financial_year).all()

        # Tenant FSC status distribution
        fsc_dist = db.query(
            Tenant.fsc_status, func.count(Tenant.id)
        ).group_by(Tenant.fsc_status).all()

        # Tenants by lease status
        lease_dist = db.query(
            Tenant.lease_status, func.count(Tenant.id)
        ).filter(Tenant.lease_status.isnot(None)).group_by(Tenant.lease_status).all()

        # Tenants by property manager
        pm_dist = db.query(
            Tenant.property_manager, func.count(Tenant.id)
        ).filter(Tenant.property_manager.isnot(None)).group_by(Tenant.property_manager).all()

        # Tenants by region
        region_dist = db.query(
            Tenant.region, func.count(Tenant.id)
        ).filter(Tenant.region.isnot(None)).group_by(Tenant.region).all()

        # AFSS monthly breakdown
        afss_monthly = {}
        for m in range(1, 13):
            count = db.query(Station).filter(Station.afss_due_month == m).count()
            afss_monthly[MONTH_NAMES[m]] = count

        return jsonify({
            'defects_by_category': {r[0]: r[1] for r in defects_by_category},
            'defects_by_station': {r[0]: r[1] for r in defects_by_station},
            'defects_by_risk': {r[0]: r[1] for r in defects_by_risk},
            'defects_by_progress': {r[0]: r[1] for r in defects_by_progress},
            'defects_by_fy': {r[0]: r[1] for r in defects_by_fy},
            'fsc_distribution': {r[0]: r[1] for r in fsc_dist},
            'lease_distribution': {r[0]: r[1] for r in lease_dist},
            'pm_distribution': {r[0]: r[1] for r in pm_dist},
            'region_distribution': {r[0]: r[1] for r in region_dist},
            'afss_monthly': afss_monthly,
        })
    finally:
        db.close()


# ─── Monthly Report ──────────────────────────────────────────────────────────

@app.route('/api/reports/monthly')
def get_monthly_report():
    """Generate monthly compliance report data for client presentation."""
    db = get_db()
    try:
        report_month = request.args.get('month', type=int) or datetime.now().month
        report_year = request.args.get('year', type=int) or datetime.now().year

        total_stations = db.query(Station).count()
        total_tenants = db.query(Tenant).count()
        active_tenants = db.query(Tenant).filter(
            Tenant.lease_status.in_(['Current', 'Holdover', 'Leased'])
        ).count()

        # FSC stats
        fsc_received = db.query(Tenant).filter(Tenant.fsc_status == 'Received').count()
        fsc_compliant = db.query(Tenant).filter(Tenant.fsc_status == 'Compliant').count()
        fsc_pending = db.query(Tenant).filter(Tenant.fsc_status == 'Pending').count()
        fsc_outstanding = db.query(Tenant).filter(Tenant.fsc_status == 'Outstanding').count()
        fsc_na = db.query(Tenant).filter(Tenant.fsc_status == 'Not Applicable').count()

        compliance_rate = round((fsc_received + fsc_compliant) / max(active_tenants, 1) * 100, 1)
        total_for_fsc = fsc_received + fsc_compliant + fsc_pending + fsc_outstanding
        fsc_pct = round((fsc_received + fsc_compliant) / max(total_for_fsc, 1) * 100, 1)

        # Fire Safety Schedule stats
        fss_stations = db.query(Station).filter(Station.has_fire_safety_schedule == True).count()
        fss_tenants = db.query(Tenant).filter(Tenant.has_fire_safety_schedule == True).count()

        # AFSS stations due this month
        afss_due_this_month = db.query(Station).filter(Station.afss_due_month == report_month).all()
        afss_due_data = []
        for s in afss_due_this_month:
            tenants = db.query(Tenant).filter(Tenant.station_id == s.id).all()
            active = [t for t in tenants if t.lease_status in ('Current', 'Holdover', 'Leased')]
            recv = sum(1 for t in active if t.fsc_status in ('Received', 'Compliant'))
            afss_due_data.append({
                'station_id': s.id, 'station_name': s.name, 'code': s.code,
                'total_tenants': len(active), 'fsc_received': recv,
                'fsc_outstanding': len(active) - recv,
                'compliance_rate': round(recv / max(len(active), 1) * 100, 1),
            })

        # Priority breakdown
        priority_dist = {
            'Critical': db.query(Tenant).filter(Tenant.priority == 'Critical').count(),
            'High': db.query(Tenant).filter(Tenant.priority == 'High').count(),
            'Medium': db.query(Tenant).filter(Tenant.priority == 'Medium').count(),
            'Low': db.query(Tenant).filter(Tenant.priority == 'Low').count(),
        }

        # Defect summary
        open_defects = db.query(Defect).filter(Defect.progress.in_(['In Progress', 'Outstanding'])).count()
        major_open = db.query(Defect).filter(
            Defect.risk == 'Major', Defect.progress.in_(['In Progress', 'Outstanding'])
        ).count()
        completed_defects = db.query(Defect).filter(Defect.progress == 'Completed').count()
        total_defects = db.query(Defect).count()

        # Compliance by region
        regions = db.query(Tenant.region).distinct().filter(Tenant.region.isnot(None)).all()
        region_compliance = []
        for (region_name,) in regions:
            r_active = db.query(Tenant).filter(
                Tenant.region == region_name,
                Tenant.lease_status.in_(['Current', 'Holdover', 'Leased'])
            ).count()
            r_compliant = db.query(Tenant).filter(
                Tenant.region == region_name,
                Tenant.fsc_status.in_(['Received', 'Compliant'])
            ).count()
            region_compliance.append({
                'region': region_name,
                'active_tenants': r_active,
                'compliant': r_compliant,
                'compliance_rate': round(r_compliant / max(r_active, 1) * 100, 1),
            })

        # AFSS monthly overview
        afss_monthly = {}
        for m in range(1, 13):
            stations = db.query(Station).filter(Station.afss_due_month == m).all()
            total_t = 0
            recv_t = 0
            for s in stations:
                tenants = db.query(Tenant).filter(Tenant.station_id == s.id).all()
                active = [t for t in tenants if t.lease_status in ('Current', 'Holdover', 'Leased')]
                total_t += len(active)
                recv_t += sum(1 for t in active if t.fsc_status in ('Received', 'Compliant'))
            afss_monthly[MONTH_NAMES[m]] = {
                'stations': len(stations),
                'tenants': total_t,
                'compliant': recv_t,
                'rate': round(recv_t / max(total_t, 1) * 100, 1),
            }

        return jsonify({
            'report_month': report_month,
            'report_month_name': MONTH_NAMES.get(report_month, ''),
            'report_year': report_year,
            'total_stations': total_stations,
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'compliance_rate': compliance_rate,
            'fsc_pct': fsc_pct,
            'fsc_received': fsc_received,
            'fsc_compliant': fsc_compliant,
            'fsc_pending': fsc_pending,
            'fsc_outstanding': fsc_outstanding,
            'fsc_na': fsc_na,
            'fss_stations': fss_stations,
            'fss_tenants': fss_tenants,
            'afss_due_this_month': afss_due_data,
            'priority_distribution': priority_dist,
            'open_defects': open_defects,
            'major_open_defects': major_open,
            'completed_defects': completed_defects,
            'total_defects': total_defects,
            'region_compliance': sorted(region_compliance, key=lambda x: x['compliance_rate'], reverse=True),
            'afss_monthly': afss_monthly,
        })
    finally:
        db.close()


# ─── Fire Safety Schedule ────────────────────────────────────────────────────

@app.route('/api/fire-safety-schedule')
def get_fire_safety_schedule():
    """Get all stations/tenants with their fire safety schedule status."""
    db = get_db()
    try:
        stations = db.query(Station).order_by(Station.name).all()
        result = []
        for s in stations:
            tenants = db.query(Tenant).filter(Tenant.station_id == s.id).all()
            fss_tenants = sum(1 for t in tenants if t.has_fire_safety_schedule)
            result.append({
                'station_id': s.id,
                'station_name': s.name,
                'code': s.code,
                'region': s.region,
                'has_fss': s.has_fire_safety_schedule,
                'fss_notes': s.fire_safety_schedule_notes,
                'total_tenants': len(tenants),
                'fss_tenants': fss_tenants,
                'non_fss_tenants': len(tenants) - fss_tenants,
                'tenants': [{
                    'id': t.id,
                    'tenant_name': t.tenant_name,
                    'has_fss': t.has_fire_safety_schedule,
                    'fss_notes': t.fire_safety_schedule_notes,
                    'lease_status': t.lease_status,
                    'fsc_status': t.fsc_status,
                } for t in tenants],
            })
        return jsonify(result)
    finally:
        db.close()


@app.route('/api/fire-safety-schedule/<int:station_id>', methods=['PUT'])
def update_fire_safety_schedule(station_id):
    """Update fire safety schedule status for a station."""
    db = get_db()
    try:
        s = db.query(Station).filter(Station.id == station_id).first()
        if not s:
            return jsonify({'error': 'Station not found'}), 404

        data = request.json
        if 'has_fire_safety_schedule' in data:
            s.has_fire_safety_schedule = data['has_fire_safety_schedule']
        if 'fire_safety_schedule_notes' in data:
            s.fire_safety_schedule_notes = data['fire_safety_schedule_notes']
        s.updated_at = datetime.utcnow()
        db.commit()

        log_activity(db, 'updated',
                     f'Fire Safety Schedule {"enabled" if s.has_fire_safety_schedule else "disabled"} for {s.name}',
                     station_id=s.id, entity_type='station', entity_id=s.id)
        return jsonify({'success': True})
    finally:
        db.close()


# ─── Search ───────────────────────────────────────────────────────────────────

@app.route('/api/search')
def global_search():
    db = get_db()
    try:
        q = request.args.get('q', '').strip()
        if not q or len(q) < 2:
            return jsonify({'stations': [], 'tenants': [], 'defects': []})

        stations = db.query(Station).filter(or_(
            Station.name.ilike(f'%{q}%'),
            Station.code.ilike(f'%{q}%'),
        )).limit(10).all()

        tenants = db.query(Tenant).filter(or_(
            Tenant.tenant_name.ilike(f'%{q}%'),
            Tenant.trading_name.ilike(f'%{q}%'),
            Tenant.file_number.ilike(f'%{q}%'),
            Tenant.lease_id.ilike(f'%{q}%'),
            Tenant.contact_name.ilike(f'%{q}%'),
        )).limit(10).all()

        defects = db.query(Defect).filter(or_(
            Defect.site_name.ilike(f'%{q}%'),
            Defect.category.ilike(f'%{q}%'),
        )).limit(10).all()

        return jsonify({
            'stations': [station_to_dict(s) for s in stations],
            'tenants': [tenant_to_dict(t) for t in tenants],
            'defects': [defect_to_dict(d) for d in defects],
        })
    finally:
        db.close()


# ─── Export ───────────────────────────────────────────────────────────────────

@app.route('/api/export/tenants')
def export_tenants_csv():
    db = get_db()
    try:
        tenants = db.query(Tenant).join(Station).order_by(Station.name, Tenant.tenant_name).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'Station', 'Tenant Name', 'Trading Name', 'File Number', 'Lease ID',
            'Region', 'Industry', 'Lease Status', 'Property Manager',
            'Priority', 'FSC Status', 'AFSS Month', 'Open Defects', 'Major Defects',
            'Contact Name', 'Contact Phone', 'Contact Email',
            'Has FSS', 'Fire Safety Schedule Notes', 'Data Source'
        ])
        for t in tenants:
            writer.writerow([
                t.station.name if t.station else '', t.tenant_name, t.trading_name or '',
                t.file_number or '', t.lease_id or '',
                t.region or '', t.standard_industry_class or '',
                t.lease_status or '', t.property_manager or '',
                t.priority or '', t.fsc_status or '',
                MONTH_NAMES.get(t.afss_month, '') if t.afss_month else '',
                t.open_defects or 0, t.major_defects or 0,
                t.contact_name or '', t.contact_phone or '', t.contact_email or '',
                'Yes' if t.has_fire_safety_schedule else 'No',
                t.fire_safety_schedule_notes or '',
                t.data_source or '',
            ])

        output.seek(0)
        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=tenants_export.csv'
        }
    finally:
        db.close()


# ─── Filter Options ───────────────────────────────────────────────────────────

@app.route('/api/filters')
def get_filter_options():
    db = get_db()
    try:
        regions = [r[0] for r in db.query(Tenant.region).distinct().filter(Tenant.region.isnot(None)).all()]
        pms = [r[0] for r in db.query(Tenant.property_manager).distinct().filter(Tenant.property_manager.isnot(None)).all()]
        statuses = [r[0] for r in db.query(Tenant.lease_status).distinct().filter(Tenant.lease_status.isnot(None)).all()]
        industries = [r[0] for r in db.query(Tenant.standard_industry_class).distinct().filter(Tenant.standard_industry_class.isnot(None)).all()]
        councils = [r[0] for r in db.query(Station.council).distinct().filter(Station.council.isnot(None)).all()]

        return jsonify({
            'regions': sorted(regions),
            'property_managers': sorted(pms),
            'lease_statuses': sorted(statuses),
            'industries': sorted(industries),
            'councils': sorted(councils),
            'document_categories': DOCUMENT_CATEGORIES,
        })
    finally:
        db.close()


@app.route('/download/zip')
def download_zip():
    zip_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firesafety_platform.zip')
    if os.path.exists(zip_path):
        return send_file(zip_path, download_name='firesafety_platform.zip', as_attachment=True)
    return jsonify({'error': 'Zip file not found. Run the packaging script first.'}), 404


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)

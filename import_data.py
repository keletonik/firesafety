"""Import data from Excel spreadsheets into the database."""

import pandas as pd
import zipfile
import xml.etree.ElementTree as ET
import re
import os
import warnings
from models import (
    init_db, drop_db, get_db, engine,
    Station, Tenant, Defect, Activity
)

warnings.filterwarnings('ignore')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TAM_FILE = os.path.join(BASE_DIR, "TAM_Tenancy_Schedule_November_2025_-_Edited_1770772318075.xlsx")
ENM_FILE = os.path.join(BASE_DIR, "ENM_Tenancy_Schedule_Dec25_1770772318074.xlsx")
AFSS_FILE = os.path.join(BASE_DIR, "Master_AFSS_Inspection_List_Sydney_Trains_1770772318075.xlsx")
CQ_FILE = os.path.join(BASE_DIR, "Circular_Quay_&_City_Circle_Fire_Safety_Observations_1770772318073.xlsx")
DEFECTS_FILE = os.path.join(BASE_DIR, "Defects_Register_1770076225005.xlsx")
DEFECTS_NEW_FILE = os.path.join(BASE_DIR, "Defects_reg_new_1770770222108.xlsx")
ICOMPLY_FILE = os.path.join(BASE_DIR, "ICOMPLY_-_ALL_Sydney_Trains_sites_1770772318075.xlsx")

MONTH_NAMES = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December"
}

# Station name normalization map for known spelling variants
STATION_NAME_ALIASES = {
    'mt colah': 'Mount Colah',
    'mt kuring-gai': 'Mount Kuring-Gai',
    'mount kuring-gai': 'Mount Kuring-Gai',
    'mt victoria': 'Mount Victoria',
    'mt. victoria': 'Mount Victoria',
    'nth strathfield': 'North Strathfield',
    'nth wollongong': 'North Wollongong',
    'circular key': 'Circular Quay',
    'wentworth faills': 'Wentworth Falls',
    'minmamurra': 'Minnamurra',
}


def clean(val):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s in ('', 'nan', 'NaN', 'None', '0', '0.0'):
        return None
    return s


def clean_lease_id(val):
    """Clean lease ID to integer string (remove .0 suffix)."""
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if s in ('', 'nan', 'NaN', 'None', '0', '0.0'):
        return None
    try:
        return str(int(float(s)))
    except (ValueError, TypeError):
        return s


def clean_station_name(name):
    if not name:
        return None
    name = str(name).strip()
    name = ' '.join(name.split())
    if name.lower() in ('nan', 'none', '', 'test site'):
        return None
    return name


def normalize_station_key(name):
    """Normalize station name for deduplication."""
    if not name:
        return None
    key = name.lower().strip()
    # Reject bogus entries
    if key in ('nan', 'none', '', 'test site', 'test'):
        return None
    # Apply known aliases
    if key in STATION_NAME_ALIASES:
        return STATION_NAME_ALIASES[key].lower()
    # Remove common suffixes that create duplicates
    key = re.sub(r'\s+(corridor|precinct|station)$', '', key)
    return key


def read_icomply_raw(path):
    """Read ICOMPLY file using raw XML parsing (openpyxl has fill issues)."""
    rows_data = []
    z = zipfile.ZipFile(path)
    tree = ET.parse(z.open('xl/worksheets/sheet1.xml'))
    root = tree.getroot()
    ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

    for row in root.findall(f'.//{{{ns}}}sheetData/{{{ns}}}row'):
        cells = {}
        for c in row.findall(f'{{{ns}}}c'):
            ref = c.get('r', '')
            v_elem = c.find(f'{{{ns}}}v')
            is_elem = c.find(f'{{{ns}}}is')
            val = ''
            if v_elem is not None and v_elem.text:
                val = v_elem.text
            elif is_elem is not None:
                t_elems = is_elem.findall(f'.//{{{ns}}}t')
                val = ''.join(t.text or '' for t in t_elems)
            col_letter = re.match(r'([A-Z]+)', ref).group(1) if ref else ''
            cells[col_letter] = val
        rows_data.append(cells)
    z.close()
    return rows_data


def load_afss_schedule():
    """Load AFSS inspection schedule."""
    df = pd.read_excel(AFSS_FILE, sheet_name=0, header=0)
    df.columns = ['Station', 'Code', 'Tenant_FSC_Due_Month', 'AFSS_Due_Month',
                  'Inspection_Month', 'Lease_Type', 'AFSS_Likely', 'Notes']
    df = df[df['Station'].notna() & (df['Station'] != 'Station')]

    schedule = {}
    for _, row in df.iterrows():
        station_name = clean_station_name(str(row['Station']))
        if station_name:
            try:
                fsc_month = int(row['Tenant_FSC_Due_Month']) if pd.notna(row['Tenant_FSC_Due_Month']) else None
                afss_month = int(row['AFSS_Due_Month']) if pd.notna(row['AFSS_Due_Month']) else None
                insp_month = int(row['Inspection_Month']) if pd.notna(row['Inspection_Month']) else None
            except (ValueError, TypeError):
                fsc_month = afss_month = insp_month = None

            schedule[station_name] = {
                'code': clean(row.get('Code')),
                'tenant_fsc_due_month': fsc_month,
                'afss_due_month': afss_month,
                'inspection_month': insp_month,
                'lease_type_category': clean(row.get('Lease_Type')),
                'afss_likely': clean(row.get('AFSS_Likely')),
            }
    return schedule


def load_icomply_data():
    """Load ICOMPLY station data."""
    rows = read_icomply_raw(ICOMPLY_FILE)
    icomply_data = {}
    for row in rows[1:]:  # skip header
        name = row.get('A', '').strip()
        if name:
            base_name = re.sub(r'\s*-\s*\d+$', '', name)
            base_name = base_name.replace(' Station', '').strip()
            if base_name not in icomply_data:
                icomply_data[base_name] = {
                    'city': row.get('B', ''),
                    'address': row.get('D', ''),
                    'contact': row.get('E', ''),
                    'entries': []
                }
            icomply_data[base_name]['entries'].append(name)
    return icomply_data


def load_defects():
    """Load defects from both registers."""
    defects = []

    if os.path.exists(DEFECTS_FILE):
        df = pd.read_excel(DEFECTS_FILE, sheet_name='Sheet1')
        for _, row in df.iterrows():
            site = clean(row.get('Site Name'))
            if site:
                site = re.sub(r'\s*-\s*\d+$', '', site).strip()
            defects.append({
                'site_name': site,
                'audit_type': clean(row.get('Audit Type')),
                'audit_date': str(row.get('Audit Date', ''))[:10] if pd.notna(row.get('Audit Date')) else None,
                'financial_year': clean(row.get('Financial Year')),
                'year': int(row['Year']) if pd.notna(row.get('Year')) else None,
                'quarter': int(row['Quarter']) if pd.notna(row.get('Quarter')) else None,
                'month': int(row['Month']) if pd.notna(row.get('Month')) else None,
                'risk': clean(row.get('Risk')),
                'progress': clean(row.get('Progress')),
                'category': clean(row.get('Category')),
            })

    if os.path.exists(DEFECTS_NEW_FILE):
        df = pd.read_excel(DEFECTS_NEW_FILE, sheet_name='Sheet1')
        for _, row in df.iterrows():
            site = clean(row.get('Site Name'))
            if site:
                site = re.sub(r'\s*-\s*\d+$', '', site).strip()
            defects.append({
                'site_name': site,
                'audit_type': None,
                'audit_date': str(row.get('Audit Date', ''))[:10] if pd.notna(row.get('Audit Date')) else None,
                'financial_year': clean(row.get('Financial Year')),
                'year': int(row['Year']) if pd.notna(row.get('Year')) else None,
                'quarter': None,
                'month': None,
                'risk': clean(row.get('Risk')),
                'progress': clean(row.get('Progress')),
                'category': clean(row.get('Category')),
            })

    return defects


def load_cq_observations():
    """Load Circular Quay & City Circle fire safety observations."""
    if not os.path.exists(CQ_FILE):
        return []

    df = pd.read_excel(CQ_FILE, header=None, skiprows=2)
    cols = ['Tenant_Name', 'Lease_ID', 'Fire_Equip_Service_Date', 'Fire_Equip_Service_Due',
            'Exit_Lighting', 'Evacuation_Diagrams', 'Emergency_Pathway', 'Possible_AFSS_Issues',
            'Comments_To_Staff']
    # Add inspection date columns for remaining
    for i in range(len(cols), len(df.columns)):
        cols.append(f'Inspection_Date_{i - len(cols) + 1}')
    df.columns = cols[:len(df.columns)]

    observations = []
    for idx, row in df.iterrows():
        tenant_name = clean(row.iloc[0])
        if not tenant_name or tenant_name == 'Tenant Name':
            continue

        lid = clean_lease_id(row.iloc[1])

        # Collect inspection dates from columns 9 onwards
        inspection_dates = []
        for i in range(9, len(row)):
            val = row.iloc[i]
            if pd.notna(val) and str(val).strip() not in ('', 'x', 'X', 'nan'):
                inspection_dates.append(str(val)[:10])

        last_inspection = inspection_dates[-1] if inspection_dates else None

        observations.append({
            'tenant_name': tenant_name,
            'lease_id': lid,
            'fire_equipment_service_date': str(row.iloc[2])[:10] if pd.notna(row.iloc[2]) else None,
            'fire_equipment_service_due': str(row.iloc[3])[:10] if pd.notna(row.iloc[3]) else None,
            'exit_lighting': clean(row.iloc[4]),
            'evacuation_diagrams': clean(row.iloc[5]),
            'emergency_pathway': clean(row.iloc[6]),
            'possible_afss_issues': clean(row.iloc[7]),
            'comments_to_site_staff': clean(row.iloc[8]),
            'last_inspection_date': last_inspection,
        })

    return observations


def calculate_priority(tenant_data):
    """Calculate priority based on compliance status."""
    fsc = tenant_data.get('fsc_status', 'Pending')
    open_d = tenant_data.get('open_defects', 0)
    major_d = tenant_data.get('major_defects', 0)

    if major_d > 0 or fsc == 'Outstanding':
        return 'Critical'
    elif open_d > 2 or fsc == 'Pending':
        return 'High'
    elif open_d > 0:
        return 'Medium'
    return 'Low'


def import_all():
    """Import all data from Excel spreadsheets."""
    print("Initializing database...")
    drop_db()
    init_db()

    db = get_db()

    # Step 1: Load AFSS schedule
    print("Loading AFSS schedule...")
    afss_schedule = load_afss_schedule()
    print(f"  Found {len(afss_schedule)} stations with AFSS schedules")

    # Step 2: Load ICOMPLY data
    print("Loading ICOMPLY data...")
    icomply_data = load_icomply_data()
    print(f"  Found {len(icomply_data)} unique station names")

    # Step 3: Load TAM tenancy schedule
    print("Loading TAM tenancy schedule...")
    tam_df = pd.read_excel(TAM_FILE, sheet_name="Amended Sheet")
    print(f"  Found {len(tam_df)} TAM records")

    # Step 4: Load ENM tenancy schedule (EAX sheet has contacts)
    print("Loading ENM tenancy schedule...")
    enm_eax = pd.read_excel(ENM_FILE, sheet_name="EAX Mth Reportv2 ")
    print(f"  Found {len(enm_eax)} ENM contact records")

    # Step 5: Load defects
    print("Loading defects...")
    defects_data = load_defects()
    print(f"  Found {len(defects_data)} defect records")

    # Step 6: Load CQ observations
    print("Loading Circular Quay observations...")
    cq_observations = load_cq_observations()
    print(f"  Found {len(cq_observations)} CQ observation records")

    # Build station registry from primary sources only (AFSS, TAM, ENM)
    print("\nBuilding station registry...")
    station_map = {}

    # From AFSS schedule (primary source for station names)
    for station_name, afss_info in afss_schedule.items():
        key = normalize_station_key(station_name)
        if key and key not in station_map:
            station_map[key] = {
                'name': station_name,
                'code': afss_info['code'],
                'afss_due_month': afss_info['afss_due_month'],
                'tenant_fsc_due_month': afss_info['tenant_fsc_due_month'],
                'inspection_month': afss_info['inspection_month'],
                'lease_type_category': afss_info['lease_type_category'],
                'afss_likely': afss_info['afss_likely'],
            }

    # From TAM (Zone column = station name)
    for _, row in tam_df.iterrows():
        zone = clean_station_name(str(row.get('Zone', '')))
        if zone:
            key = normalize_station_key(zone)
            if key and key not in station_map:
                station_map[key] = {'name': STATION_NAME_ALIASES.get(zone.lower(), zone)}
            if key:
                station_map[key]['region'] = clean(row.get('Region'))
                station_map[key]['building_name'] = clean(row.get('Building Name'))
                station_map[key]['mri_bld_id'] = clean(row.get('MRI Bld ID'))
                station_map[key]['council'] = clean(row.get('Council'))

    # From ENM
    for _, row in enm_eax.iterrows():
        zone = clean_station_name(str(row.get('Zone', '')))
        if zone:
            key = normalize_station_key(zone)
            if key and key not in station_map:
                station_map[key] = {'name': STATION_NAME_ALIASES.get(zone.lower(), zone)}
            if key:
                if not station_map[key].get('region'):
                    station_map[key]['region'] = clean(row.get('Region'))
                if not station_map[key].get('building_name'):
                    station_map[key]['building_name'] = clean(row.get('Building Name'))

    # From ICOMPLY (only enrich existing stations, don't create new ones unless truly new)
    for name, data in icomply_data.items():
        key = normalize_station_key(name)
        if key and key not in station_map:
            station_map[key] = {'name': name}
        if key:
            station_map[key]['icomply_contact'] = data.get('contact')
            station_map[key]['address'] = data.get('address')
            station_map[key]['city'] = data.get('city')

    # From defects - only link to existing stations, don't create new ones
    # (defect site names often have suffixes that create duplicates)

    print(f"  Total unique stations: {len(station_map)}")

    # Create station records
    print("Creating station records...")
    station_db_map = {}
    for key, info in station_map.items():
        station = Station(
            name=info.get('name', key.title()),
            code=info.get('code'),
            region=info.get('region'),
            building_name=info.get('building_name'),
            mri_bld_id=info.get('mri_bld_id'),
            address=info.get('address'),
            city=info.get('city'),
            state='NSW',
            council=info.get('council'),
            icomply_contact=info.get('icomply_contact'),
            afss_due_month=info.get('afss_due_month'),
            tenant_fsc_due_month=info.get('tenant_fsc_due_month'),
            inspection_month=info.get('inspection_month'),
            afss_likely=info.get('afss_likely'),
            lease_type_category=info.get('lease_type_category'),
            has_fire_safety_schedule=info.get('afss_likely') == 'Yes',
        )
        db.add(station)
        db.flush()
        station_db_map[key] = station.id

    db.commit()
    print(f"  Created {len(station_db_map)} station records")

    # Build ENM contact lookup by lease_id
    print("Building ENM contact lookup...")
    enm_contacts = {}
    for _, row in enm_eax.iterrows():
        lid = clean_lease_id(row.get('Lease ID'))
        if lid:
            enm_contacts[lid] = {
                'contact_name': clean(row.get('contname')),
                'contact_phone': clean(row.get('phoneno1')),
                'contact_phone2': clean(row.get('phoneno2')),
                'contact_mobile': clean(row.get('regoffmobile')),
                'contact_email': clean(row.get('jll_email')),
                'billing_email': clean(row.get('emailbill')),
                'abn': clean(row.get('ABN')),
                'trading_name': clean(row.get('trading_name')),
                'billing_name': clean(row.get('billing_name')),
                'billing_address': clean(row.get('address')),
                'billing_city': clean(row.get('city')),
                'billing_state': clean(row.get('state')),
                'billing_postcode': clean(row.get('zipcode')),
                'occupant_name': clean(row.get('occpname')),
            }
    print(f"  Found {len(enm_contacts)} ENM contacts")

    # Helper to find station ID with normalized key
    def find_station_id(zone_name):
        if not zone_name:
            return None, None
        key = normalize_station_key(zone_name)
        if key:
            sid = station_db_map.get(key)
            if sid:
                return sid, key
        # Fallback: try raw lowercase
        raw_key = zone_name.lower().strip()
        sid = station_db_map.get(raw_key)
        if sid:
            return sid, raw_key
        return None, key

    # Create tenant records from TAM
    print("Creating tenant records from TAM...")
    tenant_count = 0
    for _, row in tam_df.iterrows():
        zone = clean_station_name(str(row.get('Zone', '')))
        if not zone:
            continue

        station_id, key = find_station_id(zone)
        if not station_id:
            continue

        tenant_name = clean(row.get('Tenant Name'))
        if not tenant_name:
            continue

        lid = clean_lease_id(row.get('Lease ID'))
        contacts = enm_contacts.get(lid, {}) if lid else {}

        station_info = station_map.get(key, {})
        fsc_due_month = station_info.get('tenant_fsc_due_month')

        tenant = Tenant(
            station_id=station_id,
            tenant_name=tenant_name,
            trading_name=clean(row.get('Trading Name')) or contacts.get('trading_name'),
            file_number=clean(row.get('File Number')),
            lease_id=lid,
            agreement_number=clean(row.get('Agreement Number')),
            region=clean(row.get('Region')),
            zone=zone,
            premises_description=clean(row.get('Premises Description')),
            lots_dp_numbers=clean(row.get('Lots and DP numbers')),
            standard_industry_class=clean(row.get('Standard Industry Class')),
            lease_status=clean(row.get('Lease Status')),
            lease_type=clean(row.get('Lease Type')),
            lease_start=clean(row.get('Lease Start')),
            lease_expiry=clean(row.get('Lease Expiry')),
            lease_terms=clean(row.get('Lease Terms')),
            lease_note=clean(row.get('Lease Note')),
            heritage=clean(row.get('Heritage')),
            rent_psm_pa=float(row['$/psm pa']) if pd.notna(row.get('$/psm pa')) else None,
            base_rent_pa=float(row['Base Rent per annum']) if pd.notna(row.get('Base Rent per annum')) else None,
            total_passing_rent_pa=float(row['TOTAL PASSING RENT, p.a.']) if pd.notna(row.get('TOTAL PASSING RENT, p.a.')) else None,
            rent_income_code=clean(row.get('Base Rent Income Code Description')),
            property_manager=clean(row.get('Property Manager')),
            contact_name=contacts.get('contact_name'),
            contact_phone=contacts.get('contact_phone'),
            contact_phone2=contacts.get('contact_phone2'),
            contact_mobile=contacts.get('contact_mobile'),
            contact_email=contacts.get('contact_email'),
            billing_email=contacts.get('billing_email'),
            abn=contacts.get('abn'),
            billing_name=contacts.get('billing_name'),
            billing_address=contacts.get('billing_address'),
            billing_city=contacts.get('billing_city'),
            billing_state=contacts.get('billing_state'),
            billing_postcode=contacts.get('billing_postcode'),
            afss_month=station_info.get('afss_due_month'),
            fsc_due_month=fsc_due_month,
            fsc_status='Pending',
            data_source='TAM',
        )
        db.add(tenant)
        tenant_count += 1

    db.commit()
    print(f"  Created {tenant_count} tenant records from TAM")

    # Add ENM-only tenants (not in TAM)
    print("Adding ENM-only tenants...")
    enm_only_count = 0
    existing_lease_ids = set()
    for t in db.query(Tenant.lease_id).filter(Tenant.lease_id.isnot(None)).all():
        existing_lease_ids.add(t[0])

    for _, row in enm_eax.iterrows():
        lid = clean_lease_id(row.get('Lease ID'))
        if lid and lid in existing_lease_ids:
            continue

        zone = clean_station_name(str(row.get('Zone', '')))
        if not zone:
            continue
        station_id, key = find_station_id(zone)
        if not station_id:
            continue

        tenant_name = clean(row.get('Tenant Name'))
        if not tenant_name:
            continue

        station_info = station_map.get(key, {})

        tenant = Tenant(
            station_id=station_id,
            tenant_name=tenant_name,
            trading_name=clean(row.get('trading_name')),
            file_number=clean(row.get('File Number')),
            lease_id=lid,
            region=clean(row.get('Region')),
            zone=zone,
            premises_description=clean(row.get('Premises Description')),
            standard_industry_class=clean(row.get('Standard Industry Class')),
            lease_status=clean(row.get('Lease Status')),
            property_manager=clean(row.get('Property Manager')),
            contact_name=clean(row.get('contname')),
            contact_phone=clean(row.get('phoneno1')),
            contact_phone2=clean(row.get('phoneno2')),
            contact_mobile=clean(row.get('regoffmobile')),
            contact_email=clean(row.get('jll_email')),
            billing_email=clean(row.get('emailbill')),
            abn=clean(row.get('ABN')),
            billing_name=clean(row.get('billing_name')),
            afss_month=station_info.get('afss_due_month'),
            fsc_due_month=station_info.get('tenant_fsc_due_month'),
            fsc_status='Pending',
            data_source='ENM',
        )
        db.add(tenant)
        enm_only_count += 1

    db.commit()
    print(f"  Added {enm_only_count} ENM-only tenants")

    # Import CQ observations - match to existing tenants by lease ID
    print("Importing Circular Quay observations...")
    cq_count = 0
    for obs in cq_observations:
        lid = obs.get('lease_id')
        tenant = None
        if lid:
            tenant = db.query(Tenant).filter(Tenant.lease_id == lid).first()

        if not tenant:
            # Try matching by tenant name at Circular Quay station
            cq_station_id, _ = find_station_id('Circular Quay')
            if cq_station_id:
                tenant = db.query(Tenant).filter(
                    Tenant.station_id == cq_station_id,
                    Tenant.tenant_name.ilike(f'%{obs["tenant_name"]}%')
                ).first()

        if tenant:
            tenant.exit_lighting = obs.get('exit_lighting')
            tenant.evacuation_diagrams = obs.get('evacuation_diagrams')
            tenant.emergency_pathway = obs.get('emergency_pathway')
            tenant.possible_afss_issues = obs.get('possible_afss_issues')
            tenant.comments_to_site_staff = obs.get('comments_to_site_staff')
            tenant.fire_equipment_service_date = obs.get('fire_equipment_service_date')
            tenant.fire_equipment_service_due = obs.get('fire_equipment_service_due')
            tenant.last_inspection_date = obs.get('last_inspection_date')
            cq_count += 1

    db.commit()
    print(f"  Updated {cq_count} tenants with CQ observations")

    # Import defects
    print("Importing defects...")
    defect_count = 0
    for d in defects_data:
        site = d.get('site_name')
        if not site:
            continue

        # Find station using normalized key
        site_clean = re.sub(r'\s+Station$', '', site).strip()
        station_id, _ = find_station_id(site_clean)

        # Fuzzy fallback
        if not station_id:
            site_key = site_clean.lower().strip()
            for sk, sid in station_db_map.items():
                if sk in site_key or site_key in sk:
                    station_id = sid
                    break

        defect = Defect(
            station_id=station_id,
            site_name=site,
            category=d.get('category'),
            risk=d.get('risk'),
            progress=d.get('progress'),
            audit_type=d.get('audit_type'),
            audit_date=d.get('audit_date'),
            financial_year=d.get('financial_year'),
            year=d.get('year'),
            quarter=d.get('quarter'),
            month=d.get('month'),
        )
        db.add(defect)
        defect_count += 1

    db.commit()
    print(f"  Imported {defect_count} defects")

    # Update tenant defect counts and priorities
    print("Updating defect counts and priorities...")
    stations = db.query(Station).all()
    for station in stations:
        station_defects = db.query(Defect).filter(Defect.station_id == station.id).all()
        open_defects = [d for d in station_defects if d.progress in ('In Progress', 'Outstanding')]
        major_defects = [d for d in open_defects if d.risk in ('Major', 'Medium')]

        for tenant in station.tenants:
            tenant.open_defects = len(open_defects)
            tenant.major_defects = len(major_defects)
            tenant.priority = calculate_priority({
                'fsc_status': tenant.fsc_status,
                'open_defects': tenant.open_defects,
                'major_defects': tenant.major_defects,
            })

    db.commit()

    # Print summary
    total_stations = db.query(Station).count()
    total_tenants = db.query(Tenant).count()
    total_defects = db.query(Defect).count()
    afss_stations = db.query(Station).filter(Station.afss_due_month.isnot(None)).count()
    cq_observed = db.query(Tenant).filter(Tenant.exit_lighting.isnot(None)).count()

    print(f"\n{'='*60}")
    print(f"IMPORT COMPLETE")
    print(f"{'='*60}")
    print(f"  Stations:            {total_stations}")
    print(f"  Tenants:             {total_tenants}")
    print(f"  Defects:             {total_defects}")
    print(f"  AFSS Stations:       {afss_stations}")
    print(f"  CQ Observations:     {cq_observed}")
    print(f"{'='*60}")

    db.close()


if __name__ == "__main__":
    import_all()

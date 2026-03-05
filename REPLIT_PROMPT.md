# REPLIT PROMPT — FYRECOMP Mobile Inspection & Audit App

Copy everything below this line and paste it into Replit Agent:

---

## Project Overview

Build a **mobile-first Progressive Web App (PWA)** called **FYRECOMP Mobile** — a fire safety site inspection and audit application for property/facilities managers managing commercial tenancies within railway station buildings (JLL Sydney Trains TAM portfolio). The app must work offline, run on phones/tablets in the field, and produce professional PDF and Word reports.

**Tech Stack:** React + TypeScript, Tailwind CSS, Express.js backend, SQLite (via better-sqlite3) for local persistence, and a REST API. Use `jspdf` + `jspdf-autotable` for PDF export and `docx` (npm package) for Word document export. Make it a PWA with a service worker for offline capability.

**Branding:** Use the colour scheme — Primary: `#E8762F` (FYRE orange), Secondary: `#5BB8A6` (teal/zen), Dark: `#111113`, Danger: `#dc2626`. App name: "FYRECOMP Mobile". Sans-serif system font stack.

---

## Core Data Models

### 1. Tenancy / Lease Record

Pre-loaded tenancy data that can be selected to auto-fill inspection forms. Fields:

```
id, trackId, station, building, tenantName, tradingName,
leaseId, leaseStatus (Current | Holdover | Leased | Under Negotiation | Vacant and Lettable | Vacant & Not Lettable),
propertyManager, fileNumber, agreementNumber, previousFileNumber,
region, zone, council, industryClass,
mriBldId, suiteId, suiteType (Retail | Office | Other), areaM2,
leaseStart (date), leaseExpiry (date), heritage,
contactName, contactMobile, contactEmail,
afssMonth (January–December), afssMonthNum (1–12), fscDueMonth,
afssLikely (Yes | No | Unknown),
complianceStatus (Not Started | In Progress | Compliant | Non-Compliant),
priority (Critical | High | Medium | Low),
fscStatus (Outstanding | Pending | Compliant | Not Requested),
fscRequestedDate, fscReceivedDate, fscExpiryDate, fscDocRef,
fireSafetyMeasures {
  fireDetection, sprinklers, hydrants, hoseReels, extinguishers,
  emergencyLighting, exitSigns, fireDoors, smokeDoors, passiveFire, other
  — each is: Compliant | Non-Compliant | N/A | Not Inspected (dropdown)
},
abn, notes, lastUpdated, updatedBy
```

### 2. Station / Building

```
name, region, zone, council,
tenantCount, criticalCount, highCount,
fscReceived, fscPending,
defectsOpen, defectsClosed, defectsTotal, defectsMajor,
afssMonth
```

### 3. Defect

```
id (auto-generated), site_name, tenantName (optional link),
audit_type (dropdown — see below), audit_date,
financial_year, year, quarter, month,
category (dropdown — see below),
risk (Major | Medium | Minor — dropdown),
progress (Outstanding | In Progress | Complete — dropdown),
description (free text),
location (free text — where in the building),
rectificationAction (free text),
rectificationDueDate (date),
rectificationCompletedDate (date),
assignedTo (text),
photos[] (array of base64 images with captions),
fire_equipment_service_date,
archived (Yes | No)
```

### 4. Inspection / Audit Record

```
id (auto-generated),
inspectionType (dropdown):
  - SSRA
  - SSRA-Tenant
  - Safety Inspection Commercial
  - Site Attendance
  - Site Inspection (Car Park)
  - Site Inspection - Tenant (Land Lease)
  - Tenant Site Compliance Inspection
  - Fire Safety Audit
  - Annual Fire Safety Statement Review
  - Essential Services Inspection
  - Routine Compliance Check

station, building, tenantName (optional),
leaseId (optional — when selected, auto-fills tenant details),
inspectorName, inspectorCompany, inspectorLicence,
inspectionDate, inspectionTime,
weatherConditions (dropdown: Fine | Overcast | Rain | Windy | Hot | Cold),
overallRating (dropdown: Compliant | Minor Non-Compliance | Major Non-Compliance | Critical),
generalComments (free text),

sections[] — array of inspection sections (see below),
defectsFound[] — linked defect records created during this inspection,
photos[] — general inspection photos with captions,

signature (canvas-drawn signature),
signedByName, signedByRole,
completedDate, status (Draft | In Progress | Completed | Submitted)
```

### 5. AFSS Schedule (Annual Fire Safety Statement)

```
id, station, building,
afssMonth, afssMonthNum, fscDueMonth,
totalTenants, fscReceived, fscPending,
status (Received | Outstanding | Overdue | N/A),
receivedDate, expiryDate,
fireSafetyMeasures[] (list of applicable essential fire safety measures),
competentFirePractitioner (name, licence, company),
notes
```

### 6. Fire Safety Schedule (FSS)

```
id, station, building, tenantName (optional),
essentialFireSafetyMeasures[] — each measure has:
  - measureName (from standard list below)
  - standard (Australian Standard reference)
  - frequency (Monthly | Quarterly | 6-Monthly | Annually)
  - lastInspectedDate
  - nextDueDate
  - status (Compliant | Non-Compliant | Due | Overdue)
  - notes
```

---

## Essential Fire Safety Measures — Standard Dropdown List

Use this for fire safety schedules, AFSS, and inspection checklists:

```
- Fire Detection & Alarm Systems (AS 1670.1)
- Automatic Sprinkler Systems (AS 2118)
- Fire Hydrant Systems (AS 2419.1)
- Fire Hose Reels (AS 2441)
- Portable Fire Extinguishers (AS 2444)
- Emergency Lighting (AS 2293.1)
- Exit Signs (AS 2293.1)
- Fire Doors & Fire-Rated Construction (AS 1905.1)
- Smoke Doors & Smoke Barriers
- Mechanical Air Handling / Smoke Control (AS 1668.1)
- Passive Fire Protection (fire stopping, penetrations)
- Fire Stairs & Egress Paths
- Fire Control Centres / Fire Indicator Panels
- Occupant Warning Systems (AS 4428.16)
- Smoke & Heat Detectors
- Emergency Warning & Intercommunication System (EWIS)
- Fire Pump Sets
- Smoke Exhaust Systems
- Fire Shutters / Fire Curtains
- Performance Solutions (alternative solutions)
```

---

## Inspection Sections (Checklist Sections)

When creating an inspection, the user picks which sections apply. Each section contains checklist items with a status dropdown (Compliant / Non-Compliant / N/A / Not Inspected) and a notes/comments field. If Non-Compliant is selected, prompt to create a linked defect with photo.

### Section List:

**1. General Site / Common Areas**
- Housekeeping and cleanliness
- Signage (fire safety, evacuation, no smoking)
- Access and egress paths clear and unobstructed
- Assembly area identified and signposted
- Site security and access control
- Waste management and storage

**2. Fire Detection & Warning Systems**
- Fire Indicator Panel (FIP) — operational, no faults displayed
- Smoke detectors — installed, unobstructed, within service date
- Heat detectors — installed, condition
- Manual Call Points (break glass) — accessible, signposted
- EWIS / Occupant Warning System — functional test
- Zone plans displayed at FIP — current and accurate

**3. Fire Suppression Systems**
- Sprinkler system — heads unobstructed, no damage, valves locked open
- Fire hydrant system — accessible, signposted, boosters
- Fire hose reels — accessible, condition, signage, tested
- Portable fire extinguishers — in position, tagged, within service date, correct type
- Fire pump room — access, condition, test records

**4. Passive Fire Protection**
- Fire doors — self-closing, seals intact, no wedging, signage
- Fire-rated walls — penetrations sealed, no breaches
- Fire collars and dampers — installed at penetrations
- Smoke doors — operational, seals
- Fire shutters / curtains — operational

**5. Egress & Emergency**
- Exit doors — operational, hardware functional, not locked against egress
- Exit signs — illuminated, visible, correctly located
- Emergency lighting — operational, tested, battery backup
- Evacuation plans — displayed, current, legible
- Evacuation procedure — documented and available
- Stairwell pressurisation — operational (if applicable)

**6. Electrical Safety**
- Switchboard — clear access, labelled, no damage
- RCD testing — current, tagged
- Electrical leads and equipment — tested, tagged
- No overloaded power boards
- Emergency shut-off accessible

**7. Hazardous Materials & Dangerous Goods**
- SDS (Safety Data Sheets) — available and current
- Chemical storage — appropriate, bunded, labelled
- Gas cylinder storage — secured, ventilated
- Spill kits — available and stocked
- Asbestos register — available (if applicable)

**8. WHS General / Workplace Safety**
- First aid kit — stocked, accessible, register maintained
- Incident register — available
- Safe work procedures — displayed / available
- PPE available where required
- Contractor sign-in and induction records
- Risk assessments current

**9. Tenant-Specific Compliance**
- Valid public liability insurance certificate
- Current AFSS / Fire Safety Statement provided
- Lease conditions compliance
- Cooking equipment — suppression system, clearances
- Exhaust canopy and ductwork — cleaned, maintained
- Grease trap maintenance records
- BCA compliance for fitout
- Occupancy limits displayed (if applicable)

**10. External / Car Park / Land Lease Areas**
- Perimeter fencing and security
- Lighting — operational
- Drainage — no pooling, no contamination
- Vegetation management (bushfire zones)
- Vehicle access and emergency vehicle access
- Fuel / oil storage compliance

---

## Defect Categories — Dropdown

```
Fire Safety & Emergency Procedures
Electrical Safety
Maintenance Standards
WHS General
Physical Inspection
Air Quality
Dangerous Goods
Plant Management
Contractor Management
Permits & Control
Incident Management
Environment
Preventative Maintenance Programme
Slip Testing
Other
```

---

## Key Features to Build

### A. Inspection Workflow (Main Feature)

1. **New Inspection** — User taps "New Inspection" button
2. **Select Type** — Dropdown of inspection types listed above
3. **Select Station/Building** — Dropdown populated from stations data
4. **Optionally Select Tenancy** — Dropdown filtered by selected station. When a tenancy is selected, auto-fill: tenant name, trading name, lease ID, file number, agreement number, lease status, contact details, property manager, suite, area, lease dates, fire safety measures, AFSS month, FSC status, ABN
5. **Inspector Details** — Name, company, licence number (save as defaults for future inspections)
6. **Select Sections** — Checkboxes to pick which inspection sections apply
7. **Walk Through Checklist** — Each section shows its items. For each item:
   - Status dropdown: Compliant / Non-Compliant / N/A / Not Inspected
   - Notes field (text)
   - "Add Photo" button — opens camera, saves photo with timestamp and optional caption
   - If "Non-Compliant" selected — prompt appears: "Create Defect?" with pre-filled category, risk dropdown (Major/Medium/Minor), description field, and photo attachment
8. **General Photos** — Section for additional site photos
9. **Summary & Sign-Off** — Overall rating, general comments, signature pad (finger/stylus drawing), name, role
10. **Save as Draft** or **Complete & Submit**

### B. Defect Management

- View all defects — filterable by station, category, risk, progress status
- Create defect standalone (not just from inspection)
- Edit defect — update progress, add rectification notes, add follow-up photos
- Each defect shows photo gallery of all attached images
- Defect audit trail — log of all changes with timestamp

### C. Tenancy Lookup & Pre-fill

- Searchable tenancy list (search by tenant name, trading name, station, lease ID, file number)
- View tenancy detail card showing all fields
- When starting an inspection, selecting a tenancy auto-fills all relevant fields
- Filter tenancies by station, lease status, AFSS month, compliance status, FSC status

### D. Fire Safety Schedule & AFSS

- View/create fire safety schedules per station or tenancy
- List essential fire safety measures with inspection status and due dates
- AFSS tracking — which stations/tenancies have submitted, which are overdue
- Record AFSS received date, expiry, competent practitioner details

### E. Export to PDF

Use `jspdf` + `jspdf-autotable`. Generate professional reports including:

- **Inspection Report PDF**: Cover page (FYRECOMP branding, site details, date, inspector), table of contents, section-by-section results with compliance status colour-coded (green=compliant, red=non-compliant, grey=N/A), defect summary table, embedded photos with captions, signature image, footer with page numbers
- **Defect Report PDF**: Filterable — all defects for a station, or a single defect detail with photos
- **AFSS Compliance Summary PDF**: Status of all stations/tenancies
- **Tenancy Compliance Report PDF**: Full tenancy details with fire safety measures status

### F. Export to Word

Use the `docx` npm package. Generate:

- **Inspection Report .docx**: Same content as PDF but editable Word format. Use proper headings, tables, embedded images, and styles
- **Defect Report .docx**: Table format with embedded photos

### G. Offline / PWA

- Service worker for offline capability
- Store inspection data locally (IndexedDB or SQLite)
- Queue completed inspections for sync when back online
- Camera access works offline

### H. Dashboard

- Summary cards: Inspections today, Open defects, Overdue AFSS, Upcoming inspections
- Recent inspections list
- Quick-action buttons: New Inspection, View Defects, Lookup Tenancy

---

## UI/UX Requirements

- **Mobile-first**: Designed for phone screens (375px+), works great on tablets
- **Large touch targets**: Buttons min 44px, dropdowns easy to tap
- **Bottom navigation bar**: Dashboard, Inspections, Defects, Tenancies, More
- **Swipe-friendly**: Swipe between inspection sections
- **Camera integration**: `<input type="file" accept="image/*" capture="environment">` for rear camera
- **Signature pad**: HTML5 canvas for finger/stylus signature
- **Offline indicator**: Show banner when offline
- **Auto-save**: Save inspection progress every 30 seconds
- **Dark mode support**: Toggle in settings

---

## Sample Seed Data

Pre-load the app with this sample data for demonstration:

### Stations
```json
[
  {"name": "Arncliffe", "region": "Region 10", "zone": "Arncliffe", "council": "Bayside Council"},
  {"name": "Hurstville", "region": "Region 10", "zone": "Hurstville", "council": "Georges River Council"},
  {"name": "Wynyard", "region": "Region 1", "zone": "Sydney CBD", "council": "City of Sydney"},
  {"name": "Central", "region": "Region 1", "zone": "Sydney CBD", "council": "City of Sydney"},
  {"name": "Town Hall", "region": "Region 1", "zone": "Sydney CBD", "council": "City of Sydney"}
]
```

### Sample Tenancies (3 records for demo)
```json
[
  {
    "id": 1, "station": "Arncliffe", "building": "Arncliffe Station",
    "tenantName": "Ampere Group Pty Ltd", "tradingName": "Ampere Coffee",
    "leaseId": "110119", "leaseStatus": "Holdover",
    "propertyManager": "George Kapasakis", "fileNumber": "311314",
    "agreementNumber": "00086058", "region": "Region 10", "zone": "Arncliffe",
    "council": "Bayside Council", "industryClass": "Licensed Restaurant",
    "suiteId": "S04", "suiteType": "Retail", "areaM2": "30.5",
    "leaseStart": "2020-01-21", "leaseExpiry": "2025-01-20",
    "contactName": "Ekaterina N.", "contactMobile": "0426751190",
    "contactEmail": "tenant@example.com",
    "afssMonth": "January", "afssMonthNum": 1, "fscDueMonth": "November",
    "afssLikely": "Yes", "complianceStatus": "Not Started",
    "priority": "High", "fscStatus": "Outstanding",
    "fireSafetyMeasures": {
      "fireDetection": "Compliant", "sprinklers": "N/A", "hydrants": "N/A",
      "hoseReels": "Compliant", "extinguishers": "Compliant",
      "emergencyLighting": "Compliant", "exitSigns": "Compliant",
      "fireDoors": "Non-Compliant", "smokeDoors": "N/A", "passiveFire": "Not Inspected"
    },
    "abn": "17626595257"
  },
  {
    "id": 2, "station": "Hurstville", "building": "Hurstville Station",
    "tenantName": "Daily Press Pty Ltd", "tradingName": "Daily Press Newsagent",
    "leaseId": "121400", "leaseStatus": "Current",
    "propertyManager": "Sarah Mitchell", "fileNumber": "005120",
    "agreementNumber": "00091234", "region": "Region 10", "zone": "Hurstville",
    "council": "Georges River Council", "industryClass": "Newsagent",
    "suiteId": "S02", "suiteType": "Retail", "areaM2": "55.0",
    "leaseStart": "2022-06-01", "leaseExpiry": "2027-05-31",
    "contactName": "James Chen", "contactMobile": "0412345678",
    "contactEmail": "james@example.com",
    "afssMonth": "March", "afssMonthNum": 3, "fscDueMonth": "January",
    "afssLikely": "Yes", "complianceStatus": "In Progress",
    "priority": "Medium", "fscStatus": "Pending",
    "fireSafetyMeasures": {
      "fireDetection": "Compliant", "sprinklers": "Compliant", "hydrants": "N/A",
      "hoseReels": "Compliant", "extinguishers": "Compliant",
      "emergencyLighting": "Non-Compliant", "exitSigns": "Compliant",
      "fireDoors": "Compliant", "smokeDoors": "N/A", "passiveFire": "Compliant"
    },
    "abn": "98765432100"
  },
  {
    "id": 3, "station": "Wynyard", "building": "Wynyard Station",
    "tenantName": "Metro Pharmacy Pty Ltd", "tradingName": "Wynyard Pharmacy",
    "leaseId": "130200", "leaseStatus": "Current",
    "propertyManager": "George Kapasakis", "fileNumber": "007200",
    "agreementNumber": "00095500", "region": "Region 1", "zone": "Sydney CBD",
    "council": "City of Sydney", "industryClass": "Pharmacy",
    "suiteId": "S12", "suiteType": "Retail", "areaM2": "85.0",
    "leaseStart": "2023-01-01", "leaseExpiry": "2028-12-31",
    "contactName": "Priya Sharma", "contactMobile": "0498765432",
    "contactEmail": "priya@example.com",
    "afssMonth": "June", "afssMonthNum": 6, "fscDueMonth": "April",
    "afssLikely": "Yes", "complianceStatus": "Compliant",
    "priority": "Low", "fscStatus": "Compliant",
    "fireSafetyMeasures": {
      "fireDetection": "Compliant", "sprinklers": "Compliant", "hydrants": "Compliant",
      "hoseReels": "Compliant", "extinguishers": "Compliant",
      "emergencyLighting": "Compliant", "exitSigns": "Compliant",
      "fireDoors": "Compliant", "smokeDoors": "Compliant", "passiveFire": "Compliant"
    },
    "abn": "55443322110"
  }
]
```

---

## File Structure

```
/
├── client/
│   ├── public/
│   │   ├── manifest.json          (PWA manifest)
│   │   ├── service-worker.js      (offline support)
│   │   └── icons/                 (app icons)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── types/
│   │   │   └── index.ts           (all TypeScript interfaces)
│   │   ├── data/
│   │   │   ├── stations.ts        (seed station data)
│   │   │   ├── tenancies.ts       (seed tenancy data)
│   │   │   └── checklists.ts      (inspection sections & items)
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── BottomNav.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── OfflineBanner.tsx
│   │   │   ├── Dashboard/
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── Inspection/
│   │   │   │   ├── InspectionList.tsx
│   │   │   │   ├── NewInspection.tsx     (multi-step form wizard)
│   │   │   │   ├── InspectionSection.tsx (checklist rendering)
│   │   │   │   ├── ChecklistItem.tsx
│   │   │   │   ├── PhotoCapture.tsx      (camera integration)
│   │   │   │   ├── SignaturePad.tsx       (canvas signature)
│   │   │   │   └── InspectionSummary.tsx
│   │   │   ├── Defects/
│   │   │   │   ├── DefectList.tsx
│   │   │   │   ├── DefectDetail.tsx
│   │   │   │   ├── DefectForm.tsx
│   │   │   │   └── DefectPhotos.tsx
│   │   │   ├── Tenancy/
│   │   │   │   ├── TenancyList.tsx
│   │   │   │   ├── TenancyDetail.tsx
│   │   │   │   └── TenancySearch.tsx
│   │   │   ├── FireSafety/
│   │   │   │   ├── AFSSSchedule.tsx
│   │   │   │   ├── FireSafetySchedule.tsx
│   │   │   │   └── MeasureStatus.tsx
│   │   │   └── Export/
│   │   │       ├── PDFGenerator.ts
│   │   │       └── WordGenerator.ts
│   │   ├── hooks/
│   │   │   ├── useOffline.ts
│   │   │   └── useAutoSave.ts
│   │   └── utils/
│   │       ├── storage.ts         (IndexedDB/localStorage helpers)
│   │       └── sync.ts            (offline queue & sync)
│   └── tailwind.config.js
├── server/
│   ├── index.ts                   (Express server)
│   ├── db.ts                      (SQLite setup)
│   └── routes/
│       ├── inspections.ts
│       ├── defects.ts
│       ├── tenancies.ts
│       └── export.ts
├── package.json
└── tsconfig.json
```

---

## Important Implementation Notes

1. **Tenancy pre-fill is critical**: When a user selects a tenancy/lease from the dropdown in an inspection form, ALL tenant details must auto-populate — this saves enormous time in the field.

2. **Photos are essential**: Every checklist item and defect must support multiple photos. Use the device camera directly. Store as base64 or blob. Show thumbnails in the form and full-size in reports.

3. **The defect-creation flow from a checklist item must be seamless**: When marking an item "Non-Compliant", a slide-up panel should appear to quickly capture the defect details (category dropdown, risk dropdown, description, photo) without leaving the inspection flow.

4. **Reports must look professional**: Include FYRECOMP branding (orange header bar), proper tables, colour-coded compliance status cells, embedded photos at reasonable size, page numbers, and a cover page.

5. **The signature pad must work on touch screens**: Use HTML5 canvas with touch event handlers. Allow clear and redo. Embed the signature image in exported reports.

6. **Fire safety measures on tenancies use a specific structure**: Each measure (fireDetection, sprinklers, hydrants, etc.) has a dropdown of Compliant / Non-Compliant / N/A / Not Inspected. This should display as a visual grid with colour-coded status badges.

7. **Import capability**: Allow importing tenancy data via CSV or JSON to bulk-load the tenancy register from the main FYRECOMP system.

8. **All data persists locally**: Use IndexedDB for inspections, defects, and photos. The app must work completely offline after first load.

---

## Summary of Dropdown Menus Needed

| Field | Options |
|-------|---------|
| Inspection Type | SSRA, SSRA-Tenant, Safety Inspection Commercial, Site Attendance, Site Inspection (Car Park), Site Inspection - Tenant (Land Lease), Tenant Site Compliance Inspection, Fire Safety Audit, Annual Fire Safety Statement Review, Essential Services Inspection, Routine Compliance Check |
| Risk Level | Major, Medium, Minor |
| Defect Progress | Outstanding, In Progress, Complete |
| Defect Category | Fire Safety & Emergency Procedures, Electrical Safety, Maintenance Standards, WHS General, Physical Inspection, Air Quality, Dangerous Goods, Plant Management, Contractor Management, Permits & Control, Incident Management, Environment, Preventative Maintenance Programme, Slip Testing, Other |
| Compliance Status | Not Started, In Progress, Compliant, Non-Compliant |
| FSC Status | Outstanding, Pending, Compliant, Not Requested |
| Lease Status | Current, Holdover, Leased, Under Negotiation, Vacant and Lettable, Vacant & Not Lettable |
| Fire Safety Measure Status | Compliant, Non-Compliant, N/A, Not Inspected |
| Checklist Item Status | Compliant, Non-Compliant, N/A, Not Inspected |
| Overall Rating | Compliant, Minor Non-Compliance, Major Non-Compliance, Critical |
| Weather | Fine, Overcast, Rain, Windy, Hot, Cold |
| AFSS Status | Received, Outstanding, Overdue, N/A |
| Inspection Status | Draft, In Progress, Completed, Submitted |
| Measure Frequency | Monthly, Quarterly, 6-Monthly, Annually |

---

Build this as a complete, working application. Focus on the inspection workflow first — that is the primary use case. Make sure it works beautifully on mobile devices and produces clean, professional PDF and Word exports.

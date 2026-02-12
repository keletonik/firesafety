"""Database models for Fire Safety Compliance Platform."""

from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Float, Boolean,
    DateTime, Date, ForeignKey, Enum, Index
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime, date
import os

Base = declarative_base()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///firesafety.db")
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(10), nullable=True)
    region = Column(String(50), nullable=True)
    building_name = Column(String(200), nullable=True)
    mri_bld_id = Column(String(50), nullable=True)
    address = Column(String(300), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(10), default="NSW")
    council = Column(String(100), nullable=True)
    icomply_contact = Column(String(200), nullable=True)

    # AFSS schedule
    afss_due_month = Column(Integer, nullable=True)
    tenant_fsc_due_month = Column(Integer, nullable=True)
    inspection_month = Column(Integer, nullable=True)
    afss_likely = Column(String(10), nullable=True)
    lease_type_category = Column(String(20), nullable=True)

    # Fire safety schedule
    has_fire_safety_schedule = Column(Boolean, default=False)
    fire_safety_schedule_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenants = relationship("Tenant", back_populates="station", cascade="all, delete-orphan")
    defects = relationship("Defect", back_populates="station", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="station", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="station", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="station", cascade="all, delete-orphan")


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False, index=True)

    # Core identification
    tenant_name = Column(String(300), nullable=False, index=True)
    trading_name = Column(String(300), nullable=True)
    file_number = Column(String(50), nullable=True, index=True)
    previous_file_number = Column(String(50), nullable=True)
    lease_id = Column(String(50), nullable=True, index=True)
    agreement_number = Column(String(50), nullable=True)
    suit_id = Column(String(20), nullable=True)
    suite_type = Column(String(50), nullable=True)

    # Location
    region = Column(String(50), nullable=True)
    zone = Column(String(200), nullable=True)
    premises_description = Column(Text, nullable=True)
    lots_dp_numbers = Column(String(200), nullable=True)

    # Classification
    standard_industry_class = Column(String(100), nullable=True)
    lease_status = Column(String(100), nullable=True)
    lease_type = Column(String(20), nullable=True)

    # Lease details
    lease_start = Column(String(50), nullable=True)
    lease_expiry = Column(String(50), nullable=True)
    lease_terms = Column(String(50), nullable=True)
    lease_note = Column(Text, nullable=True)
    heritage = Column(String(50), nullable=True)

    # Financial
    area_m2 = Column(Float, nullable=True)
    rent_psm_pa = Column(Float, nullable=True)
    base_rent_pa = Column(Float, nullable=True)
    total_passing_rent_pa = Column(Float, nullable=True)
    rent_income_code = Column(String(100), nullable=True)

    # Contact information
    contact_name = Column(String(200), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_phone2 = Column(String(50), nullable=True)
    contact_mobile = Column(String(50), nullable=True)
    contact_email = Column(String(200), nullable=True)
    billing_email = Column(String(200), nullable=True)
    abn = Column(String(20), nullable=True)
    billing_name = Column(String(200), nullable=True)
    billing_address = Column(String(300), nullable=True)
    billing_city = Column(String(100), nullable=True)
    billing_state = Column(String(10), nullable=True)
    billing_postcode = Column(String(10), nullable=True)
    property_manager = Column(String(100), nullable=True)

    # Fire Safety Compliance
    priority = Column(String(20), default="Medium")
    fsc_status = Column(String(50), default="Pending")
    fsc_requested_date = Column(String(50), nullable=True)
    fsc_received_date = Column(String(50), nullable=True)
    afss_month = Column(Integer, nullable=True)
    fsc_due_month = Column(Integer, nullable=True)

    # Fire Safety Schedule
    has_fire_safety_schedule = Column(Boolean, default=False)
    fire_safety_schedule_notes = Column(Text, nullable=True)

    # Fire Safety Measures
    fire_detection = Column(String(50), nullable=True)
    fire_sprinklers = Column(String(50), nullable=True)
    fire_hydrants = Column(String(50), nullable=True)
    fire_extinguishers = Column(String(50), nullable=True)
    exit_lighting = Column(String(50), nullable=True)
    emergency_lighting = Column(String(50), nullable=True)
    evacuation_diagrams = Column(String(50), nullable=True)
    emergency_pathway = Column(String(50), nullable=True)
    fire_doors = Column(String(50), nullable=True)
    fire_walls = Column(String(50), nullable=True)
    mechanical_ventilation = Column(String(50), nullable=True)

    # Observations
    fire_equipment_service_date = Column(String(50), nullable=True)
    fire_equipment_service_due = Column(String(50), nullable=True)
    possible_afss_issues = Column(Text, nullable=True)
    comments_to_site_staff = Column(Text, nullable=True)
    last_inspection_date = Column(String(50), nullable=True)

    # Defect counts
    open_defects = Column(Integer, default=0)
    major_defects = Column(Integer, default=0)

    # Data source
    data_source = Column(String(20), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    station = relationship("Station", back_populates="tenants")
    defects = relationship("Defect", back_populates="tenant", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="tenant", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="tenant", cascade="all, delete-orphan")
    communications = relationship("Communication", back_populates="tenant", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="tenant", cascade="all, delete-orphan")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

    site_name = Column(String(200), nullable=False)
    category = Column(String(200), nullable=True)
    risk = Column(String(20), nullable=True)
    progress = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    audit_type = Column(String(50), nullable=True)
    audit_date = Column(String(50), nullable=True)
    financial_year = Column(String(20), nullable=True)
    year = Column(Integer, nullable=True)
    quarter = Column(Integer, nullable=True)
    month = Column(Integer, nullable=True)

    assigned_to = Column(String(200), nullable=True)
    due_date = Column(String(50), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_date = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    station = relationship("Station", back_populates="defects")
    tenant = relationship("Tenant", back_populates="defects")
    documents = relationship("Document", back_populates="defect", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=True, index=True)

    filename = Column(String(300), nullable=False)
    original_filename = Column(String(300), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)

    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    station = relationship("Station", back_populates="documents")
    tenant = relationship("Tenant", back_populates="documents")
    defect = relationship("Defect", back_populates="documents")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

    note_type = Column(String(50), default="general")
    content = Column(Text, nullable=False)
    created_by = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    station = relationship("Station", back_populates="notes")
    tenant = relationship("Tenant", back_populates="notes")


class Communication(Base):
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

    comm_type = Column(String(50), nullable=False)
    subject = Column(String(300), nullable=True)
    content = Column(Text, nullable=True)
    contact_person = Column(String(200), nullable=True)
    direction = Column(String(20), nullable=True)
    status = Column(String(50), default="Sent")
    followup_required = Column(Boolean, default=False)
    followup_date = Column(String(50), nullable=True)
    followup_completed = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="communications")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)

    action = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    user = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    station = relationship("Station", back_populates="activities")
    tenant = relationship("Tenant", back_populates="activities")


def init_db():
    Base.metadata.create_all(engine)


def drop_db():
    Base.metadata.drop_all(engine)

"""
map_models.py — SQLAlchemy ORM models for BlackVault Facility Map
===================================================================
Persists sectors, terminal nodes, and door security clearance statuses.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from db.database import Base


class DBSector(Base):
    __tablename__ = "facility_sectors"

    sector_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    level_number = Column(Integer, nullable=False, default=0)
    clearance_level = Column(Integer, nullable=False, default=0)
    unlocked = Column(Boolean, default=False)
    active_hazard = Column(String, nullable=True)
    pos_x = Column(Float, default=0.0)
    pos_y = Column(Float, default=0.0)
    pos_z = Column(Float, default=0.0)

    terminals = relationship("DBTerminalNode", back_populates="sector", cascade="all, delete-orphan")
    doors = relationship("DBDoorConnection", foreign_keys="[DBDoorConnection.source_sector_id]", back_populates="source_sector", cascade="all, delete-orphan")


class DBTerminalNode(Base):
    __tablename__ = "facility_terminals"

    node_id = Column(String, primary_key=True, index=True)
    sector_id = Column(String, ForeignKey("facility_sectors.sector_id"), nullable=False)
    name = Column(String, nullable=False)
    level_number = Column(Integer, nullable=False)
    terminal_id = Column(String, nullable=False)
    dataset = Column(String, nullable=False)
    problem_type = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")  # "LOCKED", "ACTIVE", "COMPLETED"
    pos_x = Column(Float, default=0.0)
    pos_y = Column(Float, default=0.0)
    pos_z = Column(Float, default=0.0)

    sector = relationship("DBSector", back_populates="terminals")


class DBDoorConnection(Base):
    __tablename__ = "facility_doors"

    door_id = Column(String, primary_key=True, index=True)
    source_sector_id = Column(String, ForeignKey("facility_sectors.sector_id"), nullable=False)
    target_sector_id = Column(String, ForeignKey("facility_sectors.sector_id"), nullable=False)
    target_node_id = Column(String, nullable=False)
    status = Column(String, default="SEALED")  # "SEALED", "UNLOCKED", "BREACHED"
    clearance_required = Column(Integer, default=1)

    source_sector = relationship("DBSector", foreign_keys=[source_sector_id], back_populates="doors")

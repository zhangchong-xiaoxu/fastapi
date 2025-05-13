"""
Database models for the Social Network Analysis System.
This module defines SQLAlchemy models for database tables.
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
import datetime
import os

# Create SQLite database engine
DATABASE_URL = "sqlite:///../local.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    """User model for storing preferences and settings."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    preferences = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AnalysisHistory(Base):
    """Model for storing analysis history."""
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    analysis_type = Column(String, index=True)
    algorithm = Column(String)
    parameters = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="analyses")

class NetworkData(Base):
    """Model for storing network metadata."""
    __tablename__ = "network_data"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    file_path = Column(String)
    node_count = Column(Integer)
    edge_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class NetworkComparison(Base):
    """Model for storing network comparison history."""
    __tablename__ = "network_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    snapshot1_id = Column(String, index=True)
    snapshot2_id = Column(String, index=True)
    comparison_result = Column(JSON)
    node_growth = Column(Integer)
    edge_growth = Column(Integer)
    new_communities = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="comparisons")

# Add relationships
User.analyses = relationship("AnalysisHistory", back_populates="user")
User.comparisons = relationship("NetworkComparison", back_populates="user")

def get_db():
    """
    Get a database session.
    
    Yields:
        Session: Database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize the database by creating all tables."""
    Base.metadata.create_all(bind=engine)

# Create tables when module is imported
init_db() 
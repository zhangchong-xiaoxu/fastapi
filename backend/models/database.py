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

class Auth(Base):
    """Model for lohin and sign up user info."""
    __tablename__ = "auth"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)  # Add password field
    is_admin = Column(Boolean, default=False)  # Add admin flag
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

def get_user_by_username(db, username: str):
    """Fetch a user by username."""
    return db.query(Auth).filter(Auth.username == username).first()

def create_user(db, username: str, password: str, is_admin: bool = False):
    """Create a new user."""
    new_user = Auth(username=username, password=password, is_admin=is_admin)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_all_users(db):
    """Fetch all users except admin."""
    return db.query(Auth).filter(Auth.is_admin == False).all()

# Create tables when module is imported
init_db() 

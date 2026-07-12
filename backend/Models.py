from DB import Base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Integer, ForeignKey, String, Date, DateTime
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid = True), primary_key=True, default = uuid.uuid4)
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)

class Note(Base):
    __tablename__ = "notes"
    id = Column(UUID(as_uuid = True), primary_key=True, default = uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable = False)
    content = Column(String, nullable = False)
    embedding = Column(Vector(768), nullable=True)
    tags = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    note_type= Column(String, nullable=True, default="text")
    group= Column(String, nullable=False, default= "none")
    created_at = Column(DateTime, default = datetime.utcnow , nullable=False)
    updated_at = Column(DateTime, default = datetime.utcnow , nullable=False)


class Converstions(Base):
    __tablename__ = "converstions"
    id = Column(UUID(as_uuid = True), primary_key=True, default = uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable = True)
    created_at = Column(DateTime , default = datetime.utcnow , nullable=False)

class Messages(Base):
    __tablename__ = "messages"
    id = Column(UUID(as_uuid = True), primary_key=True, default = uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("converstions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable = False)
    content = Column(String, nullable = False)
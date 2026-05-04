from DB import Base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Integer, ForeignKey, String
from pgvector.sqlalchemy import Vector
import uuid

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
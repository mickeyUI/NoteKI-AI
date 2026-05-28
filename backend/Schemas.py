from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class Login(BaseModel):
    email: str
    password: str

class Register(BaseModel):
    email: str
    password: str

class CreateNote(BaseModel):
    title: Optional[str] = "New Note"
    content: str
    tags: str
    source_url: str

class ReturnNotes(BaseModel):
    id: UUID
    title: str
    content: str
    tags: str
    source_url: str
    created_at: datetime
    updated_at: datetime
    
class Question(BaseModel):
    question: str

class CreateChat(BaseModel):
    title: Optional[str] = "New Conversation"

class CreateMessage(BaseModel):
    conversation_id: str
    role: str
    content: str

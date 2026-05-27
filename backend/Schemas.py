from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Login(BaseModel):
    email: str
    password: str

class Register(BaseModel):
    email: str
    password: str

class CreateNote(BaseModel):
    title: str
    content: str
    tags: str
    source_url: str

class ReturnNotes(BaseModel):
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

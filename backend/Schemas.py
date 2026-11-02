from pydantic import BaseModel, ConfigDict
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
    tags: Optional[str] = ""
    source_url: Optional[str] = ""
    group: Optional[str] = "none"

class UploadImg(BaseModel):
    title: Optional[str] = "Image"
    tags: Optional[str] = ""
    source_url: str
    group: Optional[str] = "none"
    
class ReturnNotes(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: Optional[str] = "New Note"
    content: Optional[str] = ""
    tags: Optional[str] = ""
    source_url: Optional[str] = None
    note_type: Optional[str] = "text"
    group: Optional[str] = "none"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
class Question(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    history: Optional[List[dict]] = None

class CreateChat(BaseModel):
    title: Optional[str] = "New Conversation"

class ReturnChat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: Optional[UUID] = None
    title: Optional[str] = "New Conversation"
    created_at: Optional[datetime] = None

class CreateMessage(BaseModel):
    conversation_id: str
    role: str
    content: str

class ReturnMessage(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    role: str
    content: str

class ReciveID(BaseModel):
    id: UUID

class ReciveGroup(BaseModel):
    group: str

class EditNote(BaseModel):
    id: UUID
    title: Optional[str] = "New Note"
    content: Optional[str] = ""
    tags: Optional[str] = ""
    source_url: Optional[str] = None
    # group: str

class GroupingCustom(BaseModel):
    groupName: str
    notes: list[ReturnNotes]
    
# this is to populate with data instead of manual entering each
class noticas(BaseModel):
    title: Optional[str] = "New Note"
    content: str
    tags: Optional[str] = ""

class lstofnotes(BaseModel):
    notes: list[noticas]
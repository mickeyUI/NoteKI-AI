from pydantic import BaseModel
from typing import List, Optional

class Login(BaseModel):
    email: str
    password: str

class Register(BaseModel):
    email: str
    password: str

class CreateNote(BaseModel):
    title: str
    content: str

class Question(BaseModel):
    question: str
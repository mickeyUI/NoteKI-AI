from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import requests
from Schemas import Register, Login, CreateNote, Question
from Auth import hash_password, verify_password, create_access_token, verify_token
from DB import get_db
from Models import User, Note
from LLM import get_embedding, generate
from fastapi.responses import StreamingResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        token = authorization.split(" ")[1]  # "Bearer <token>"
    except:
        raise HTTPException(status_code=401, detail="Invalid token format")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    return payload["user_id"]"""

def get_current_user():
    return "9406351d-ddcd-42f5-85e1-7c86270225b3"

@app.post("/Register")
def RegisterUser(register: Register, db = Depends(get_db)):
    user = db.query(User).filter(User.email == register.email).first()
    if user:
        raise HTTPException(status_code= 404, detail= "email is already used")
    newUser = User(email = register.email,password = hash_password(register.password))
    db.add(newUser)
    db.commit()
    return {"Registeration": "sucessfully"}

@app.post("/Login")
def LoginUser(login: Login, db = Depends(get_db)):
    user = db.query(User).filter(User.email == login.email).first()
    if not user:
        raise HTTPException(status_code= 404, detail= "user not found")
    if verify_password(login.password, user.password):
        token = create_access_token({"user_id": str(user.id)})
        return {"token": token}
    else:
        raise HTTPException(status_code= 404, detail= "incorrect password")

@app.post("/AddNote")
def AddNote(note: CreateNote, userID = Depends(get_current_user), db = Depends(get_db)):
    embeded = get_embedding(note.content)
    newNote = Note(user_id = userID,title = note.title, content = note.content, embedding= embeded )
    db.add(newNote)
    db.commit()
    return {"Note": "Added"}

@app.get("/GetNote/{noteID}", response_model= CreateNote)
def GetNote(noteID: str, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == noteID, Note.user_id == userID).first()
    if not note:
        raise HTTPException(status_code= 404, detail= "note not found")
    return note


@app.get("/GetNotes", response_model= list[CreateNote])
def GetNotes(userID = Depends(get_current_user), db = Depends(get_db)):
    notes = db.query(Note).filter(Note.user_id == userID).all()
    if not(notes):
        raise HTTPException(status_code= 404, detail= "no notes found")
    return notes

@app.put("/UpdateNote/{noteID}")
def UpdateNote(newNote: CreateNote,noteID: str, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == noteID, Note.user_id == userID).first()
    if not(note):
        raise HTTPException(status_code = 404, detail= "note not found")
    note.title = newNote.title
    note.content = newNote.content
    note.embedding = get_embedding(newNote.content)
    db.commit()
    return {"edit": "sucessful"}

@app.delete("/DelNote/{noteID}")
def DeleteNote(noteID: str, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == noteID, Note.user_id == userID).first()
    if not note:
        raise HTTPException(status_code= 404, detail= "note not found")
    db.delete(note)
    db.commit()
    return {"delete": "sucessful"}
    
@app.post("/question")
def Ask(question: Question, userID = Depends(get_current_user), db = Depends(get_db)):
    embeded = get_embedding(question.question)
    results = db.execute(
    text("""
        SELECT title, content
        FROM notes
        WHERE user_id = :user_id
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT 5
    """),
    {
        "user_id": str(userID),
        "embedding": str(embeded)
    }).fetchall()
    if not(results):
        return "you have no notes that match you question"
    lst_notes = [{"title": result.title, "content": result.content} for result in results]
    context = "\n\n".join([f"{n['title']}: {n['content']}" for n in lst_notes])
    prompt = f"""You are an expert assistant. I will give you a note (saved information) followed by a question or request.

=== NOTE START ===
{context}
=== NOTE END ===

Question:{question.question}

Instructions:
- Base your answers strictly on the note above. Do not add external knowledge unless the user explicitly asks for it.
- If the note doesn't contain enough information to answer, say so clearly.
- Be concise, precise, and well-structured.
- Use bullet points, tables, or numbered lists when they improve clarity.
- Think step-by-step before answering.
- you dont have to use all the notes only the ones that is related to the question."""

    return StreamingResponse(generate(prompt), media_type="text/plain")
     
@app.post("/search", response_model = list[str])
def Search(query: Question, userID = Depends(get_current_user), db = Depends(get_db)):
    if not query:
        raise HTTPException(status_code=404, detail="No query provided")
    embeded = get_embedding(query.question)
    results = db.execute(
    text("""
        SELECT title, content
        FROM notes
        WHERE user_id = :user_id
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT 5
    """),
    {
        "user_id": str(userID),
        "embedding": str(embeded)
    }).fetchall()
    if not results:
        raise HTTPException(status_code=404, detail="No results found")
    return results


    

   









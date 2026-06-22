from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from Schemas import Register, Login, CreateNote, Question, ReturnNotes, CreateChat, CreateMessage, ReciveID, EditNote
from Auth import hash_password, verify_password, create_access_token, verify_token
from DB import get_db
from Models import User, Note, Converstions, Messages
from LLM import get_embedding, generate, Img_Analysis
from fastapi.responses import StreamingResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    newNote = Note(user_id = userID,title = note.title, content = note.content, embedding= embeded, tags = note.tags, source_url = note.source_url )
    db.add(newNote)
    db.commit()
    return {"Note": "Added"}

@app.post("/UploadImg")
def UploadImage(note: CreateNote, userID = Depends(get_current_user), db = Depends(get_db)):
    # Validate URL before passing to Img_Analysis
    if not note.content or not (note.content.startswith("http://") or note.content.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid image URL. Must be a valid http/https URL")
    
    try:
        content = Img_Analysis(note.content)
        embeded = get_embedding(content.content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze image: {str(e)}")
    
    newNote = Note(user_id = userID, title = note.title, content = content, embedding= embeded, tags = note.tags, source_url = note.content
    , note_type="img" )
    db.add(newNote)
    db.commit()
    return {"img dis": content}


@app.get("/GetNote/{noteID}", response_model= ReturnNotes)
def GetNote(noteID: str, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == noteID, Note.user_id == userID).first()
    if not note:
        raise HTTPException(status_code= 404, detail= "note not found")
    return note


@app.get("/GetNotes", response_model= list[ReturnNotes])
def GetNotes(userID = Depends(get_current_user), db = Depends(get_db)):
    notes = db.query(Note).filter(Note.user_id == userID).all()
    if not(notes):
        raise HTTPException(status_code= 404, detail= "no notes found")
    return notes

@app.put("/UpdateNote")
def UpdateNote(newNote: EditNote, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == newNote.id, Note.user_id == userID).first()
    if not(note):
        raise HTTPException(status_code = 404, detail= "note not found")
    note.title = newNote.title
    note.content = newNote.content
    note.tags = newNote.tags
    note.source_url = newNote.source_url
    note.embedding = get_embedding(newNote.content)
    db.commit()
    return {"edit": "sucessful"}

@app.delete("/DelNote")
def DeleteNote(noteID: ReciveID, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == noteID.id, Note.user_id == userID).first()
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
        SELECT title, content, (embedding <=> CAST(:embedding AS vector)) AS distance
        FROM notes
        WHERE user_id = :user_id
          AND (embedding <=> CAST(:embedding AS vector)) < :threshold
        ORDER BY distance ASC
    """),
    {
        "user_id": str(userID),
        "embedding": str(embeded),
        "threshold": 0.7  # 0-1, identical-orthagonal respectivly
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
- if its an image, search throught the web and send back a brief note of what you found.
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

@app.get("/Chats")
def GetChats(userID = Depends(get_current_user), db = Depends(get_db)):
    chats = db.query(Converstions).filter(Converstions.user_id == userID).all()
    if not(chats):
        raise HTTPException(status_code= 404, detail= "no chats found")
    return chats

@app.post("/Messages")
def GetMessages(convoID: ReciveID, userID = Depends(get_current_user) ,db = Depends(get_db)):
    messages = db.query(Messages).all()
    if not(messages):
        raise HTTPException(status_code= 404, detail= "no messages found")
    return messages
                
@app.post("/AddChat")
def AddChat(chat: CreateChat, userID = Depends(get_current_user), db = Depends(get_db)):
    newChat = Converstions(user_id = userID, title = chat.title)
    db.add(newChat)
    db.commit()
    db.refresh(newChat)
    return {"id": newChat.id}

@app.post("/AddMessage")
def AddMsg(msg: CreateMessage , db = Depends(get_db)):
    newMsg = Messages(conversation_id = msg.conversation_id, role = msg.role, content = msg.content)
    db.add(newMsg)
    db.commit()
    db.refresh(newMsg)
    return newMsg

    

   









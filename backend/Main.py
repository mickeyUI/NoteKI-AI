from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from Schemas import Register, Login, CreateNote,UploadImg , Question, ReturnNotes, CreateChat, CreateMessage, ReciveID, ReciveGroup, EditNote, lstofnotes
from Auth import hash_password, verify_password, create_access_token, verify_token
from DB import get_db
from Models import User, Note, Converstions, Messages
from LLM import convertToEmbedable, get_embedding, generate, Img_Analysis, Name_Group
from fastapi.responses import StreamingResponse
import json
import numpy as np
import hdbscan
from datetime import datetime
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Citation"]
)

# def get_current_user(authorization: str = Header(None)):
#     if not authorization:
#         raise HTTPException(status_code=401, detail="No token provided")

#     try:
#         token = authorization.split(" ")[1]  # "Bearer <token>"
#     except:
#         raise HTTPException(status_code=401, detail="Invalid token format")

#     payload = verify_token(token)
#     if not payload:
#         raise HTTPException(status_code=401, detail="Invalid token")

#     return payload["user_id"]

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
    toEmbed= note.content
    if note.title: 
        toEmbed= f'Title: {note.title}, content: {note.content}'
    embeded = get_embedding(toEmbed)
    if not(embeded):
        return
    newNote = Note(user_id = userID,title = note.title, content = note.content, embedding= embeded, tags = note.tags, source_url = note.source_url )
    db.add(newNote)
    db.commit()
    return {  'id': newNote.id, 
            'title': newNote.title, 
            'content': newNote.content, 
            'tags': newNote.tags, 
            'source_url': newNote.source_url, 
            'note_type': newNote.note_type, 
            'group': newNote.group,
            'created_at': newNote.created_at,
            'updated_at': newNote.updated_at
        }

@app.post("/UploadImg")
def UploadImage(note: UploadImg, userID = Depends(get_current_user), db = Depends(get_db)):
    if not note.source_url or not (note.source_url.startswith("http://") or note.source_url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid image URL. Must be a valid http/https URL")
    try:
        content = Img_Analysis(note.source_url)
        toEmbed= content.content
        if note.title: 
            toEmbed= f'Title: {note.title}, content: {content.content}'
        embeded = get_embedding(toEmbed)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze image: {str(e)}")
    
    newNote = Note(user_id = userID, title = note.title, content = content.content, embedding= embeded, 
                   tags = note.tags, source_url = note.source_url, note_type="img" )
    db.add(newNote)
    db.commit()
    return {  'id': newNote.id, 
            'title': newNote.title, 
            'content': newNote.content, 
            'tags': newNote.tags, 
            'source_url': newNote.source_url, 
            'note_type': newNote.note_type, 
            'group': newNote.group,
            'created_at': newNote.created_at,
            'updated_at': newNote.updated_at
        }


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
    toEmbed= newNote.content
    if newNote.title: 
        toEmbed= f'Title: {newNote.title}, content: {newNote.content}'
    note.embedding = get_embedding(toEmbed)
    note.updated_at= datetime.utcnow()
    db.commit()
    return  {  'id': newNote.id, 
            'title': newNote.title, 
            'content': newNote.content, 
            'tags': newNote.tags, 
            'source_url': newNote.source_url, 
            'note_type': note.note_type, 
            'group': note.group,
            'created_at': note.created_at,
            'updated_at': datetime.utcnow
        }

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
    # embedable = convertToEmbedable(question.question);
    # print(embedable)
    embeded = get_embedding(question.question)
    results = db.execute(
    text("""
        SELECT id, title, content, (embedding <=> CAST(:embedding AS vector)) AS distance
        FROM notes
        WHERE user_id = :user_id
          AND (embedding <=> CAST(:embedding AS vector)) < :threshold
        ORDER BY distance ASC
    """),
    {
        "user_id": str(userID),
        "embedding": str(embeded),
        "threshold": 0.34  # 0-1, identical-orthagonal respectivly
    }).fetchall()
    if not(results):
        return "you have no notes that match you question"
    citation= [(str(result.id), result.title, result.content) for result in results]
    citationStringified= json.dumps(citation)
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

    return StreamingResponse(generate(prompt), media_type="text/plain", headers={"X-Citation": citationStringified})
           
     
@app.post("/search",)
def Search(query: Question, userID = Depends(get_current_user), db = Depends(get_db)):
    try:
        if not query:
            raise HTTPException(status_code=404, detail="No query provided")
        embeded = get_embedding(query.question)
        results = db.execute(
            text("""
                SELECT
                    id,
                    title,
                    content,
                    tags,
                    source_url,
                    note_type,
                    "group",
                    created_at,
                    updated_at
                FROM notes
                WHERE user_id = :user_id
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT 5
            """),
            {
                "user_id": str(userID),
                "embedding": str(embeded),
            },
        ).fetchall()
        if not results:
            raise HTTPException(status_code=404, detail="No results found")
        notes = [
            {
                "id": str(row[0]),
                "title": row[1],
                "content": row[2],
                "tags": row[3],
                "source_url": row[4],
                "note_type": row[5],
                "group": row[6],
                "created_at": row[7].isoformat(),
                "updated_at": row[8].isoformat(),
            } for row in results ]
        return notes
    except Exception as e:
        print(f"An unexpected error occurred: {type(e).__name__} - {e}")

    
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

@app.delete("/DelChat")
def DeleteChat(chatID: ReciveID, userID = Depends(get_current_user), db = Depends(get_db)):
    chat= db.query(Converstions).filter(Converstions.id == chatID.id, Converstions.user_id == userID).first()
    if not(chat):
        raise HTTPException(status_code=404, detail= "chat not found")
    db.delete(chat)
    db.commit()
    return  {"delete": "sucessful"}

@app.post("/AddMessage")
def AddMsg(msg: CreateMessage , db = Depends(get_db)):
    newMsg = Messages(conversation_id = msg.conversation_id, role = msg.role, content = msg.content)
    db.add(newMsg)
    db.commit()
    db.refresh(newMsg)
    return newMsg

@app.put("/Group")
def GroupNotes(
    userID=Depends(get_current_user),
    db=Depends(get_db),
):
    notes = db.query(Note).filter(Note.user_id == userID).all()

    if not notes:
        raise HTTPException(status_code=404, detail="No notes found")

    embeddings = np.array([note.embedding for note in notes])

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=2,
        min_samples=1,
        metric="euclidean",
    )

    labels = clusterer.fit_predict(embeddings).tolist()

    clusters = {}
    for note, label in zip(notes, labels):
        if label == -1:
            continue
        clusters.setdefault(label, []).append(note)

    # Name each cluster individually
    group_names = {}
    for label, group_notes in clusters.items():
        snippet = "\n".join(
            f"- {n.title}: {n.content[:200]}" for n in group_notes
        )
        group_names[label] = Name_Group(snippet)

    for note, label in zip(notes, labels):
        note.group = group_names.get(label, "none")

    db.commit()

    return {"groups": group_names}
    
@app.put("/UnGroup")
def Ungroup(Group: ReciveGroup ,userID=Depends(get_current_user), db=Depends(get_db)):
    notes= db.query(Note).filter(Note.group == Group.group).all()
    for note in notes:
        note.group = "none"
    db.commit()
    return {"ungrouped group:": Group.group}

# kinda experimental for note population
@app.post("/Populate")
def Populate(Data: lstofnotes, userID= Depends(get_current_user), db= Depends(get_db)):
    for note in Data.notes:
        toEmbed= note.content
        if note.title: 
            toEmbed= f'Title: {note.title}, content: {note.content}'
        embeded = get_embedding(toEmbed)
        newNote = Note(user_id = userID,title = note.title, content = note.content, embedding= embeded, tags = note.tags, source_url = "" )
        db.add(newNote)
    db.commit()
    return {"Note": "Added"}
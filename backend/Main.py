from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import httpx
from sqlalchemy import text
from Schemas import (
    Register,
    Login,
    CreateNote,
    UploadImg,
    Question,
    ReturnNotes,
    CreateChat,
    ReturnChat,
    CreateMessage,
    ReturnMessage,
    ReciveID,
    ReciveGroup,
    EditNote,
    lstofnotes,
    GroupingCustom,
)
from Auth import get_current_user
from DB import get_db, init_db
from Models import User, Note, Converstions, Messages
from LLM import convertToEmbedable, get_embedding, generate, Img_Analysis, Name_Group, link_preview, transcribe_audio
from fastapi.responses import StreamingResponse
import json
import uuid
import numpy as np
import hdbscan
from datetime import datetime, timezone
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as e:
        print(f"Database init warning: {e}")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Citation"]
)
#letter for onboarding and stuff
# @app.post("/Register")
# def RegisterUser(register: Register, db = Depends(get_db)):

@app.post("/AddNote")
async def AddNote(note: CreateNote, userID = Depends(get_current_user), db = Depends(get_db)):
    toEmbed = note.content
    if note.title: 
        toEmbed = f'Title: {note.title}, content: {note.content}'
    embeded = get_embedding(toEmbed)
    if not embeded:
        raise HTTPException(status_code=502, detail="Failed to generate embedding for note. Check GEMINI_API_KEY configuration.")
    newNote = Note(
        user_id=userID,
        title=note.title or "New Note",
        content=note.content,
        embedding=embeded,
        tags=note.tags or "",
        source_url=note.source_url or "",
        note_type=note.note_type or "text",
        group=note.group or "none"
    )
    if note.source_url:
        try:
            await link_preview(note.source_url)
        except Exception as e:
            print(f"Warning: link preview error: {e}")
    db.add(newNote)
    db.commit()
    db.refresh(newNote)
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
        toEmbed = content.content
        if note.title: 
            toEmbed = f'Title: {note.title}, content: {content.content}'
        embeded = get_embedding(toEmbed)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to analyze image: {str(e)}")
    
    newNote = Note(user_id=userID, title=note.title or "Image Note", content=content.content, embedding=embeded, 
                   tags=note.tags or "", source_url=note.source_url, note_type="img", group=note.group or "none")
    db.add(newNote)
    db.commit()
    db.refresh(newNote)
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


@app.post("/TranscribeAudio")
async def TranscribeAudioEndpoint(
    file: Optional[UploadFile] = File(None),
    audio_url: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    userID = Depends(get_current_user)
):
    try:
        if file:
            filename = file.filename or "audio.webm"
            file_bytes = await file.read()
        elif audio_url:
            async with httpx.AsyncClient(timeout=45) as client:
                res = await client.get(audio_url)
                if res.status_code >= 400:
                    raise HTTPException(status_code=400, detail="Failed to fetch audio from provided URL")
                file_bytes = res.content
                filename = audio_url.split("?")[0].split("/")[-1] or "audio.webm"
        else:
            raise HTTPException(status_code=400, detail="Either an audio file or an audio_url must be provided.")

        if not file_bytes:
            raise HTTPException(status_code=400, detail="Audio content is empty.")

        text_result = transcribe_audio(file_bytes=file_bytes, filename=filename, prompt=prompt)
        return {"text": text_result}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.get("/GetNote/{noteID}", response_model=ReturnNotes)
def GetNote(noteID: str, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == noteID, Note.user_id == userID).first()
    if not note:
        raise HTTPException(status_code=404, detail="note not found")
    return note


@app.get("/GetNotes", response_model=list[ReturnNotes])
def GetNotes(userID = Depends(get_current_user), db = Depends(get_db)):
    notes = db.query(Note).filter(Note.user_id == userID).all()
    return notes or []

@app.put("/UpdateNote")
def UpdateNote(newNote: EditNote, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == newNote.id, Note.user_id == userID).first()
    if not note:
        raise HTTPException(status_code=404, detail="note not found")
    note.title = newNote.title
    note.content = newNote.content
    note.tags = newNote.tags
    note.source_url = newNote.source_url
    toEmbed = newNote.content
    if newNote.title: 
        toEmbed = f'Title: {newNote.title}, content: {newNote.content}'
    new_embedding = get_embedding(toEmbed)
    if new_embedding:
        note.embedding = new_embedding
    note.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(note)
    return {  'id': note.id, 
            'title': note.title, 
            'content': note.content, 
            'tags': note.tags, 
            'source_url': note.source_url, 
            'note_type': note.note_type, 
            'group': note.group,
            'created_at': note.created_at,
            'updated_at': note.updated_at
        }

@app.delete("/DelNote")
def DeleteNote(noteID: ReciveID, userID = Depends(get_current_user), db = Depends(get_db)):
    note = db.query(Note).filter(Note.id == noteID.id, Note.user_id == userID).first()
    if not note:
        raise HTTPException(status_code=404, detail="note not found")
    db.delete(note)
    db.commit()
    return {"delete": "successful"}
    
@app.post("/question")
def Ask(question: Question, userID = Depends(get_current_user), db = Depends(get_db)):
    history_messages = []

    # 1. Retrieve conversation history if conversation_id is provided
    if question.conversation_id:
        try:
            convo_uuid = uuid.UUID(str(question.conversation_id))
            chat = db.query(Converstions).filter(
                Converstions.id == convo_uuid,
                Converstions.user_id == userID
            ).first()
            if chat:
                db_messages = db.query(Messages).filter(
                    Messages.conversation_id == chat.id
                ).order_by(Messages.id.asc()).all()
                for m in db_messages[-10:]:
                    role = "assistant" if m.role.lower() in ["ai", "assistant", "system"] else "user"
                    history_messages.append({"role": role, "content": m.content})
        except Exception as e:
            print(f"Error fetching conversation history for chat {question.conversation_id}: {e}")

    # Fallback to direct client-provided history if provided and DB had none
    if not history_messages and question.history:
        for item in question.history[-10:]:
            role = "assistant" if item.get("role", "").lower() in ["ai", "assistant", "system"] else "user"
            content = item.get("content", "")
            if content:
                history_messages.append({"role": role, "content": content})

    # 2. Semantic search for notes
    embeded = get_embedding(question.question)
    results = []
    if embeded:
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
                "threshold": 0.38
            }
        ).fetchall()

    # If neither notes nor conversation history exist, inform the user
    if not results and not history_messages:
        return StreamingResponse(
            iter(["You have no saved notes that match this question."]),
            media_type="text/plain",
            headers={"X-Citation": "[]"}
        )

    citation = [(str(result.id), result.title, result.content) for result in results]
    citationStringified = json.dumps(citation)
    lst_notes = [{"title": result.title, "content": result.content} for result in results]
    notes_context = "\n\n".join([f"{n['title']}: {n['content']}" for n in lst_notes]) if lst_notes else "No additional notes directly matched this follow-up query; rely on the ongoing conversation history below."

    system_instruction = f"""You are an expert AI assistant. You help the user understand, synthesize, and answer questions based on their saved notes and ongoing conversation history.

=== NOTE START ===
{notes_context}
=== NOTE END ===

Instructions:
- Base your answers strictly on the saved notes and the ongoing conversation history.
- When answering follow-up questions, seamlessly reference the prior conversation context.
- If neither the notes nor the conversation history contain enough information to answer, state that clearly.
- Be concise, precise, and well-structured.
- Use bullet points, tables, or numbered lists when they improve clarity.
- You do not have to use all notes, only the ones relevant to the user's inquiry."""

    messages_payload = [{"role": "system", "content": system_instruction}]
    messages_payload.extend(history_messages)
    messages_payload.append({"role": "user", "content": question.question})

    return StreamingResponse(
        generate(messages=messages_payload),
        media_type="text/plain",
        headers={"X-Citation": citationStringified}
    )
           
     
@app.post("/search")
def Search(query: Question, userID = Depends(get_current_user), db = Depends(get_db)):
    if not query or not query.question.strip():
        return []
    embeded = get_embedding(query.question)
    if not embeded:
        return []
    try:
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
                  AND (embedding <=> CAST(:embedding AS vector)) < :threshold
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT 5
            """),
            {
                "user_id": str(userID),
                "embedding": str(embeded),
                "threshold": 0.38,
            },
        ).fetchall()
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
        print(f"An unexpected error occurred during search: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

    
@app.get("/Chats", response_model=list[ReturnChat])
def GetChats(userID = Depends(get_current_user), db = Depends(get_db)):
    chats = db.query(Converstions).filter(Converstions.user_id == userID).order_by(Converstions.created_at.desc()).all()
    return chats or []

@app.post("/Messages", response_model=list[ReturnMessage])
def GetMessages(convoID: ReciveID, userID = Depends(get_current_user), db = Depends(get_db)):
    chat = db.query(Converstions).filter(Converstions.id == convoID.id, Converstions.user_id == userID).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    messages = db.query(Messages).filter(Messages.conversation_id == convoID.id).all()
    return messages or []
                
@app.post("/AddChat")
def AddChat(chat: CreateChat, userID = Depends(get_current_user), db = Depends(get_db)):
    newChat = Converstions(user_id = userID, title = chat.title)
    db.add(newChat)
    db.commit()
    db.refresh(newChat)
    return {"id": str(newChat.id), "title": newChat.title}

@app.delete("/DelChat")
def DeleteChat(chatID: ReciveID, userID = Depends(get_current_user), db = Depends(get_db)):
    chat = db.query(Converstions).filter(Converstions.id == chatID.id, Converstions.user_id == userID).first()
    if not chat:
        raise HTTPException(status_code=404, detail="chat not found")
    db.delete(chat)
    db.commit()
    return {"delete": "successful"}

@app.post("/AddMessage", response_model=ReturnMessage)
def AddMsg(msg: CreateMessage, userID = Depends(get_current_user), db = Depends(get_db)):
    chat = db.query(Converstions).filter(Converstions.id == msg.conversation_id, Converstions.user_id == userID).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    newMsg = Messages(conversation_id = msg.conversation_id, role = msg.role, content = msg.content)
    db.add(newMsg)
    db.commit()
    db.refresh(newMsg)
    return newMsg

@app.put("/Group")
def GroupNotes(
    userID = Depends(get_current_user),
    db = Depends(get_db),           
):
    notes = db.query(Note).filter(Note.user_id == userID, Note.group == "none").all()

    if not notes:
        return {"groups": {}, "message": "No unassigned notes found"}

    if len(notes) < 2:
        return {"groups": {}, "message": "Not enough unassigned notes to form clusters."}

    embeddings = np.array([note.embedding for note in notes], dtype=np.float32)
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / np.maximum(norms, 1e-12)

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=2,
        min_samples=1,
        metric="euclidean",
        cluster_selection_method="leaf",
    )

    labels = clusterer.fit_predict(embeddings).tolist()

    clusters = {}
    for note, label in zip(notes, labels):
        if label == -1:
            continue
        clusters.setdefault(label, []).append(note)

    group_names = {}
    for label, group_notes in clusters.items():
        snippet = "\n".join(
            f"- {n.title}: {n.content[:200]}" for n in group_notes
        )
        try:
            group_name = Name_Group(snippet).strip()
        except Exception:
            group_name = ""
        group_names[str(label)] = group_name or f"Note Group {label + 1}"

    for note, label in zip(notes, labels):
        if label != -1:
            note.group = group_names.get(str(label), "none")

    db.commit()

    return {"groups": group_names}
    
@app.put("/UnGroup")
def Ungroup(Group: ReciveGroup, userID=Depends(get_current_user), db=Depends(get_db)):
    notes = db.query(Note).filter(Note.group == Group.group, Note.user_id == userID).all()
    for note in notes:
        note.group = "none"
    db.commit()
    return {"ungrouped": Group.group}

@app.put("/CustomGroup")
def CustomGroup(nameAndNotes: GroupingCustom, userID=Depends(get_current_user), db=Depends(get_db)):
    for toGroupNote in nameAndNotes.notes:
        note = db.query(Note).filter(Note.id == toGroupNote.id, Note.user_id == userID).first()
        if note:
            note.group = nameAndNotes.groupName
    db.commit()
    return {nameAndNotes.groupName: nameAndNotes.notes}
        

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


import os

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from google import genai
from google.genai.types import EmbedContentConfig
from groq import Groq

load_dotenv()

api_key = os.environ.get("GEMINI_API_KEY")


def get_genai_client():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None
    return genai.Client(api_key=key)


def get_groq_client():
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        return None
    return Groq(api_key=key)


prompt_text = """

Analyze this image and produce a search-optimized description for semantic retrieval.

Your goal is NOT to describe the image naturally. Your goal is to generate text that will produce high-quality vector embeddings for later search.

Rules:

- Identify the primary category.
- Extract every visible proper name, title, brand, product, person, company, framework, library, language, location, or organization.
- Preserve exact spellings whenever possible.
- Include important keywords someone would naturally search for.
- Mention the purpose or topic.
- Include common aliases or synonyms when appropriate.
- Do not invent information that is not visible or strongly implied.

Category-specific instructions:

Movie / TV:
- Title
- Genre
- Actors, director, studio if visible
- Themes
- Mention this is entertainment content.

Website / App / Product:
- Name
- Purpose
- Main features visible
- Product category
- Company if visible

Programming / Technical:
- Programming language
- Frameworks
- Libraries
- APIs
- Algorithms
- Error messages
- Technologies
- What the code accomplishes
- Mention this is programming reference material.

Books / Articles / Documents:
- Title
- Author
- Main subject
- Keywords
- Topic

Brand / Logo:
- Brand name
- Company
- Industry
- Products or services

Quote / Meme:
- Extract all readable text exactly.
- Identify topic.
- Identify sentiment if obvious.
- Mention if humorous, motivational, educational, etc.

Charts / Diagrams:
- Topic
- Variables
- Labels
- Main takeaway

General images:
- Describe the main subject.
- Mention important objects.
- Mention location if identifiable.
- Mention activity or context.

Output format:

[category]

Search Description:
A compact paragraph containing important searchable entities, names, keywords, topics, and context. Prioritize nouns and identifying information over natural writing.

Keywords:
keyword1, keyword2, keyword3, keyword4, ...

Return only the output.
"""


def convertToEmbedable(text: str):
    groq_client = get_groq_client()
    if not groq_client:
        return text
    model = os.getenv("GROQ_EMBED_OPT_MODEL", "openai/gpt-oss-120b")
    chatCompletion = groq_client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": """You are a search optimization engine for a vector database (pgvector). Your task is to expand the user's input question into
            a semantically rich passage optimized for embedding similarity retrieval.Instructions:Rephrase the input question into a declarative summary
            of the underlying concept.Include likely keywords, synonyms, technical terms, and related entities that a stored note on this topic would contain.
            Output strictly raw text without conversational introductions, metadata, or markdown wrappers.""",
            },
            {
                "role": "user",
                "content": text,
            },
        ],
        model=model,
    )
    return chatCompletion.choices[0].message.content


def get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT"):
    if not text:
        return None
    client = get_genai_client()
    if not client:
        print("GEMINI_API_KEY not configured")
        return None
    model_name = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2")
    try:
        result = client.models.embed_content(
            model=model_name,
            contents=text,
            config=EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=768,
            ),
        )
        if result and result.embeddings:
            return result.embeddings[0].values
    except Exception as e:
        print(f"Embedding error with {model_name}: {e}")
        return None
    return None


def generate(prompt: str = None, messages: list = None):
    groq_client = get_groq_client()
    if not groq_client:
        yield "Groq API key not configured."
        return
    model = os.getenv("GROQ_CHAT_MODEL", "openai/gpt-oss-120b")
    chat_messages = (
        messages if messages else [{"role": "user", "content": prompt or ""}]
    )
    response = groq_client.chat.completions.create(
        model=model, messages=chat_messages, stream=True
    )
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content


def Img_Analysis(url: str):
    client = get_groq_client()
    if not client:
        raise ValueError("GROQ_API_KEY not configured")
    model = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {"type": "image_url", "image_url": {"url": url}},
                ],
            }
        ],
        temperature=1,
        reasoning_effort="none",
        reasoning_format="hidden",
        max_completion_tokens=300,
        top_p=1,
        stream=False,
        stop=None,
    )
    return completion.choices[0].message


def Name_Group(notes_snippet: str) -> str:
    prompt = f"""Here are a group of related notes from someone's personal knowledge base:
{notes_snippet}
Give this group a short, descriptive name (2-3 words max) that captures what they have in common.
Reply with ONLY the group name, nothing else."""
    groq_client = get_groq_client()
    if not groq_client:
        return "Note Group"
    model = os.getenv("GROQ_GROUP_MODEL", "openai/gpt-oss-20b")
    response = groq_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        stream=False,
    )
    return response.choices[0].message.content.strip()


async def link_preview(data):
    url = None
    if isinstance(data, str):
        url = data
    elif isinstance(data, dict):
        url = data.get("url") or data.get("id")
    elif hasattr(data, "url"):
        url = data.url
    elif hasattr(data, "id"):
        url = data.id

    if not url or not (url.startswith("http://") or url.startswith("https://")):
        return {}

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})

        if response.status_code >= 400:
            return {"url": url}

        soup = BeautifulSoup(response.text, "html.parser")

        def get_meta(property_name):
            tag = soup.find("meta", property=property_name)
            if tag:
                return tag.get("content")
            return None

        title = get_meta("og:title")
        if not title and soup.title:
            title = soup.title.string

        description = get_meta("og:description")
        if not description:
            tag = soup.find("meta", attrs={"name": "description"})
            if tag:
                description = tag.get("content")

        image = get_meta("og:image")
        site_name = get_meta("og:site_name")
        canonical_url = get_meta("og:url")

        return {
            "title": title or "",
            "description": description or "",
            "image": image or "",
            "site_name": site_name or "",
            "url": canonical_url or str(response.url),
        }
    except Exception as e:
        return {"url": url, "error": str(e)}


def transcribe_audio(file_bytes: bytes, filename: str = "audio.wav", prompt: str = None) -> str:
    client = get_groq_client()
    if not client:
        raise ValueError("Groq client not configured. Check GROQ_API_KEY.")

    # Ensure recognized extension for Whisper
    if not any(filename.lower().endswith(ext) for ext in [".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".wav", ".webm"]):
        filename = f"{filename}.webm"

    kwargs = {
        "file": (filename, file_bytes),
        "model": "whisper-large-v3-turbo",
        "response_format": "json",
        "temperature": 0.0,
    }
    if prompt:
        kwargs["prompt"] = prompt

    transcription = client.audio.transcriptions.create(**kwargs)
    return getattr(transcription, "text", str(transcription))

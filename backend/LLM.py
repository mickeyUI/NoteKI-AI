import os
import requests
import json
from groq import Groq
from dotenv import load_dotenv
from google import genai
from google.genai.types import EmbedContentConfig

load_dotenv()

api_key = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)


def get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT"):
    try:
        result = client.models.embed_content(
            model="gemini-embedding-2",
            contents=text,
            config=EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=768,
            ),
        )
        if (result.embeddings is not None):
            return result.embeddings[0].values
    except: 
        return 

def generate(prompt: str):
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        stream=True
    )
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content

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
def Img_Analysis(url: str):
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    completion = client.chat.completions.create(
        model="qwen/qwen3.6-27b",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt_text
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": url
                        }
                    }
                ]
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
    """
    Takes a string of note titles and content snippets,
    returns a 2-4 word group name from the LLM.
    """
    prompt = f"""Here are a group of related notes from someone's personal knowledge base:

{notes_snippet}

Give this group a short, descriptive name (2-4 words max) that captures what they have in common.
Reply with ONLY the group name, nothing else."""
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=20,
        stream=False
    )
    return response.choices[0].message.content.strip()
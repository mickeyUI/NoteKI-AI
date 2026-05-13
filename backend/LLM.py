import os
import requests
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()


def get_embedding(text: str):
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={
            "model": "nomic-embed-text",
            "prompt": text
        }
    )
    return response.json()["embedding"]

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
import requests
import json



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
    response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen2.5-coder:7b",
                "prompt": prompt,
                "stream": True
            },
            stream=True
        )
    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            chunk = data.get("response", "")
            yield chunk
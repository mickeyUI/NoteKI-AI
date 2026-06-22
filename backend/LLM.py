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

prompt_text = """You are analyzing a screenshot or image saved to someone's personal 
knowledge base. Your job is to identify WHAT this is and extract the information that 
would make it findable later through search.

Follow these rules based on what the image contains:

- If it's a movie/TV show poster or title card: identify the exact title, genre, and 
  any visible cast or director names. Note that this is a movie/show recommendation or 
  reference.

- If it's a website, app, or product screenshot: identify the name of the website/app/
  product, what it does or offers, and the category it belongs to (e.g. productivity tool, 
  online shop, SaaS platform, recipe site).

- If it's a code snippet, programming screenshot, or technical content: identify the 
  programming language, the concept or library being shown, and summarize what the code 
  does. Mention this is a coding/technical reference.

- If it's a logo or brand: identify the company/brand name and what industry or product 
  category it's associated with.

- If it's a quote, meme, or text-based image: extract the exact text and summarize the 
  underlying message or topic.

- For anything else: identify the core subject and what real-world category it falls 
  under (travel, fitness, fashion, finance, etc).

Always start your response with a one-word category tag in brackets, like [movie], [app], 
[code], [brand], [quote], or [general]. Then give a concise 2-4 sentence note capturing 
the key identifying details — title, name, or text exactly as it appears, followed by 
context about what it is and why someone might save it."""

def Img_Analysis(url: str):
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    completion = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
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
        max_completion_tokens=1024,
        top_p=1,
        stream=False,
        stop=None,
    )

    return completion.choices[0].message

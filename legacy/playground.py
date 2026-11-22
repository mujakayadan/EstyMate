from openai import OpenAI
from api_key import openai_api_key

# Set up your OpenAI API key
client = OpenAI(api_key=openai_api_key)


response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": "You are a model for creating estimation questions."},
        {"role": "user", "content": prompt}
    ],
    max_tokens=50
)
text = response.choices[0].message.content
print(text)

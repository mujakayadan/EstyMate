from openai import OpenAI
import psycopg2
from psycopg2 import sql
from api_key import openai_api_key
from prompt import prompt
import logging
import re

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Set up your OpenAI API key
client = OpenAI(api_key=openai_api_key)

# Database connection details
DB_NAME = "esty_mate"
DB_USER = "postgres"
DB_PASSWORD = "admin"
DB_HOST = "localhost"
DB_PORT = "5432"


# Function to generate estimation questions
def generate_estimation_questions_batch(batch_size):
    messages = [
        {"role": "system", "content": "You are a model for creating estimation questions."},
        {"role": "user", "content": prompt}
    ]

    responses = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=100,
        n=batch_size  # Generate a batch of questions
    )

    questions = []
    for response in responses.choices:
        text = response.message.content.strip()
        question_text, correct_answer = parse_question_answer(text)
        if question_text and correct_answer:
            questions.append((question_text, correct_answer))
    return questions


def parse_question_answer(output):
    # Regular expression to match the pattern
    pattern = r"Question: \[(.+?)\] Answer: \[(.*?)\]"

    # Find the match
    match = re.search(pattern, output)

    if match:
        question_part = match.group(1)
        correct_answer = match.group(2)

        if correct_answer:  # Ensure there is an answer
            if len(correct_answer) > 5:
                return None, None
            correct_answer = correct_answer.replace(',', '')
            return question_part, correct_answer

    return None, None


# Function to populate questions in the database
def populate_questions(total_questions, batch_size):
    try:
        # Attempt to establish a connection
        logging.debug("Connecting to the database...")
        conn = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT
        )
        logging.debug("Database connection established.")
    except Exception as e:
        logging.error("Failed to connect to the database: %s", e)
        return

    try:
        cur = conn.cursor()

        insert_query = sql.SQL(
            "INSERT INTO questions (question_text, correct_answer, category) VALUES (%s, %s, %s)"
        )

        categories = ["science", "math", "general_knowledge", "technology"]  # Example categories

        for i in range(0, total_questions, batch_size):
            batch_questions = generate_estimation_questions_batch(batch_size)
            if not batch_questions:
                logging.warning("No valid questions generated in this batch.")
                continue

            for question_text, correct_answer in batch_questions:
                category = categories[i % len(categories)]  # Rotate through categories
                cur.execute(insert_query, (question_text, correct_answer, category))
                logging.debug("Inserted question: %s", question_text)

            conn.commit()
            logging.debug("Batch transaction committed.")
    except Exception as e:
        logging.error("An error occurred while inserting data: %s", e)
    finally:
        cur.close()
        conn.close()
        logging.debug("Database connection closed.")


# Generate and populate 2000 questions with a batch size of 50
populate_questions(2000, 50)

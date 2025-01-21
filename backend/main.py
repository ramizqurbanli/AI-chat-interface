from fastapi import FastAPI, HTTPException #type: ignore
from pydantic import BaseModel #type: ignore
import google.generativeai as genai #type: ignore
from fastapi.middleware.cors import CORSMiddleware #type: ignore
import logging
import os

# Initialize the FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Validate and configure the Gemini API

API_KEY = '' # Replace with your API key
genai.configure(api_key=API_KEY)


# Configure generation settings
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",  # Requesting HTML response
}


try:
    # Create the generative model
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=generation_config,
    )

    # Initialize a chat session
    chat_session = model.start_chat(history=[])
except Exception as e:
    raise RuntimeError(f"Failed to initialize Gemini model or chat session: {str(e)}")

# Set up logging to save logs to a file
LOG_FILE = "chat_logs.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),  # Also log to console
    ],
)
logger = logging.getLogger(__name__)

# Request body model
class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        logger.info(f"Received message: {request.message}")

        # Validate the message
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty.")

        # Generate a response
        prompt = f"""
Respond to the user's query in this format:

[Natural Language Explanation]
{'{'}Optional Code Block (only if code examples are necessary){'}'}
{'{'}Optional Formula (only for mathematical/scientific content){'}'}

Follow these rules:
1. Use code blocks ONLY for executable code examples, never for text/descriptions
2. Use LaTeX ONLY for equations/formulas, not for text formatting
3. Prioritize clear text explanations unless technical precision is required
4. Avoid code/formulas for simple questions

Query: {request.message}
"""
        response = chat_session.send_message(prompt)

        # Ensure the response is valid
        if not response or not response.text:
            raise HTTPException(status_code=500, detail="Received an empty response from Gemini API.")

        # Clean the response
        cleaned_response = response.text.strip()
        logger.info(f"Cleaned response: {cleaned_response}")

        return {"response": cleaned_response}

    except HTTPException as e:
        logger.error(f"HTTPException: {e.detail}")
        raise e
    except Exception as e:
        logger.exception("Error in chat endpoint")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# Run the application (use uvicorn to start the server)
if __name__ == "__main__":
    import uvicorn #type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)

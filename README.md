Web Project - FastAPI Chatbot with Gemini API Integration

This project is a simple backend chatbot using FastAPI and the Gemini API (Google Generative AI).
It allows users to send a message, and the chatbot responds with HTML-formatted text.
The project also logs user messages and chatbot responses to a log file for debugging purposes.

Features:
- Handles user chat messages and sends requests to the Gemini API.
- Responds with HTML-formatted content.
- Strips unnecessary markdown (e.g., \```html and \```).
- Logs all chat messages and responses to a file (chat_logs.log).
- CORS support for client-side integration.

Requirements:
- Python 3.8 or higher
- Gemini API key (Google Generative AI)

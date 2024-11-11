from flask import Flask, request, jsonify
import os
import google.generativeai as genai
from flask_cors import CORS
from dotenv import load_dotenv
from google.cloud import texttospeech
from google.oauth2 import service_account
import base64
import json

load_dotenv()
app = Flask(__name__)
# Replace the simple CORS() with specific configuration
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "https://nao-medical-transcriber.onrender.com"  # This needs to be updated
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Gemini API configuration
# backend/app.py
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.0-pro")
model2 = genai.GenerativeModel("gemini-1.5-flash")

# Google Cloud TTS configuration
credentials = service_account.Credentials.from_service_account_info(
    # Load credentials from environment variable to support deployment
    json.loads(os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON', '{}'))
)
tts_client = texttospeech.TextToSpeechClient(credentials=credentials)

@app.route('/enhance_transcription', methods=['POST'])
def enhance_transcription():
    data = request.get_json()
    text = data.get('text', '')
    context = data.get('context', '')
    prompt = (
    "You are a medical transcription repair tool. Your tasks:\n"
    "1. Fix transcription errors using conversation context\n"
    "2. Only repair the current speech, not previous conversation\n"
    "3. Detect speaker changes\n"
    "4. Preserve all original content including small talk - do not fabricate or replace content\n"
    "5. Overall, make the transcripted conversation make sense while changing as little words as possible\n"
    "Format Requirements:\n"
    "• No speaker labels\n"
    "• Separate speakers with one blank line\n"
    "• Each speaker's continuous speech forms one paragraph\n\n"
    
    "Format Example:\n"
    "[Speaker A's continuous speech]\n\n"
    "[Speaker B's continuous speech]\n\n"
    "[Speaker A's next speech segment]\n\n"
    
    f"Previous conversation:\n{context}\n\n"
    f"Current speech:\n{text}\n\n"
    
    "Output the repaired transcription only. Your output will be directly used in patient records.\n"
    "Note: Being in current speech does not mean that the speaker has not changed. "
    "Many times, the speaker might change in between the text that is given to you as current speech. "
    "You need to detect these changes and format the output accordingly. \n"
    "Note 2: Multiple speaker changes is also possible. Apply the same formatting logic if that happens. If speaker changes, write what next speaker says in a new paragraph with a blank line between the paragraphs in your output.\n"
    "Note 3: Also punctuate the output."
    )

    try:
        response = model.generate_content(prompt)
        return jsonify({"enhanced_text": response.text.strip()})
    except Exception as e:
        print(f"Enhancement error: {str(e)}")  # Add detailed logging
        return jsonify({"error": str(e)}), 500

@app.route('/translate_text', methods=['POST'])
def translate_text():
    data = request.get_json()
    text = data.get('text', '')
    context = data.get('context', '')
    target_language = data.get('target_language', 'es')

    prompt = (
        f"Translate the following medical conversation to {target_language}. "
        "Return ONLY the translation, no explanations or additional text.\n\n"
        "Previous translations for context:\n"
        f"{context}\n\n"
        "Text to translate:\n"
        f"{text}"
    )

    try:
        response = model2.generate_content(prompt)
        return jsonify({"translated_text": response.text.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/synthesize_speech', methods=['POST'])
def synthesize_speech():
    try:
        data = request.get_json()
        text = data.get('text', '')
        language_code = data.get('language_code', 'en-US')

        input_text = texttospeech.SynthesisInput(text=text)
        
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = tts_client.synthesize_speech(
            input=input_text,
            voice=voice,
            audio_config=audio_config
        )

        # Convert audio content to base64
        audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')
        
        return jsonify({
            'audio': audio_base64,
            'success': True
        })

    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

# Add port configuration
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
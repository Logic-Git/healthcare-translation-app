from flask import Flask, request, jsonify
import os
import google.generativeai as genai
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.0-pro")

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
        response = model.generate_content(prompt)
        return jsonify({"translated_text": response.text.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
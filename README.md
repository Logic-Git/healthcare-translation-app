# Healthcare Translation Web App with Generative AI

A web-based prototype that enables real-time, multilingual translation between patients and healthcare providers. Converts spoken input into text, provides a live transcript, and offers a translated version with audio playback.

## Features

- **Voice-to-Text with Generative AI**: Enhanced transcription accuracy using AI, especially for medical terms.
- **Real-Time Translation**: Live translation of transcripts between selected languages.
- **Audio Playback**: Play translated text using synthesized speech.
- **Dual Transcript Display**: View both original and translated transcripts side by side.
- **Language Selection**: Choose input and output languages for translation.
- **Mobile-First Design**: Responsive design optimized for mobile and desktop use.

## Technologies Used

- **Front-End**: HTML, CSS, JavaScript
- **Back-End**: Flask, Python
- **APIs and Services**:
  - Google Generative AI for transcription enhancement and translation
  - Web Speech API for speech recognition
  - Google Cloud Text-to-Speech for audio playback

## Installation

### Prerequisites

- Python 3.x
- Node.js and npm (optional, if additional front-end tooling is used)

### Backend Setup

1. **Clone the Repository**:

``` bash
git clone https://github.com/your-username/healthcare-translation-app.git
```
2. **Navigate to the Backend Directory**:
``` bash
python -m venv venv
```
4. **Activate the Virtual Environment**:
 - On macOS/Linux:
   ```bash
   source venv/bin/activate
   ```
  - On Windows:
  ```bash
  venv\Scripts\activate
  ```
5. **Install Dependencies**:  
``` bash
pip install -r requirements.txt
```
6. **Set Up Environment Variables**: 
Create a `.env` file in the `backend` directory with the following content:
```ini
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS_JSON=your_google_credentials_json
```
  - Replace `your_gemini_api_key` with your actual Gemini API key.
  - Replace `your_google_credentials_json` with your Google service account JSON string.

### Frontend Setup

1. **Navigate to the Frontend Directory**:

   ```bash
   cd ../frontend
   ```
2. **Start a Local Server (optional)**:

   You can use any static file server to serve `index.html`. For example:

   - Using Python:

     ```bash
     python -m http.server 8000
     ```

   - Open `http://localhost:8000` in your browser.

## Usage

1. **Run the Backend Server**:

   ```bash
   cd backend
   python app.py
   ```

2. **Access the Frontend**:

Open `index.html` in your web browser or navigate to the local server URL if you started one.

3. **Use the Application**:

- Select input and output languages from the dropdown menus.
- Click **Start Speaking** and begin speaking into your microphone.
- View the real-time transcription and translation.
- Click **Speak Translation** to hear the translated text.

## Deployment

The app can be deployed on platforms like Render, Vercel, or any hosting service that supports Flask applications.

## Security Considerations

- **API Keys**: Keep your API keys and credentials secure. Do not expose them in public repositories.
- **HTTPS**: Use HTTPS for secure data transmission when deploying the app.
- **Data Privacy**: Ensure that no sensitive user data is logged or stored insecurely.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

- [Google Generative AI](https://cloud.google.com/genai/)
- [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech)
- [Flask Framework](https://flask.palletsprojects.com/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
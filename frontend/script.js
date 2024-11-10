// frontend/script.js

// Selecting DOM elements
const speakBtn = document.getElementById('speak-btn');
const playBtn = document.getElementById('play-btn');
const originalText = document.getElementById('original-text');
const translatedText = document.getElementById('translated-text');
const inputLang = document.getElementById('input-lang');
const outputLang = document.getElementById('output-lang');
const newConvBtn = document.getElementById('new-conv-btn');

// Add to script.js
function getTranscriptionContext(text) {
    return getContextWindow(text, 1000);
}

function getTranslationContext(text) {
    return getContextWindow(text, 500);
}

// Update data structure
let conversationHistory = {
    activeSegment: '',
    historicalContext: '',
    translated: [],
    pendingEnhancement: false,
    paragraphSpacing: '\n\n'  // Define standard paragraph spacing
};
let isRecording = false;

// Initialize Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.interimResults = true;
recognition.maxAlternatives = 1;
recognition.continuous = true;

function updateDisplay() {
    // Show real-time transcription with history and proper paragraph spacing
    const displayText = conversationHistory.historicalContext + 
        (conversationHistory.historicalContext && conversationHistory.activeSegment ? 
            conversationHistory.paragraphSpacing : '') +
        (conversationHistory.pendingEnhancement ? 
            '<span class="pending">' + conversationHistory.activeSegment + '</span>' : 
            conversationHistory.activeSegment);
    
    originalText.innerHTML = displayText;
    translatedText.innerHTML = conversationHistory.translated.join(conversationHistory.paragraphSpacing);
    
    // Auto-scroll both panels
    originalText.scrollTop = originalText.scrollHeight;
    translatedText.scrollTop = translatedText.scrollHeight;
}

function getContextWindow(text, windowSize) {
    const words = text.split(/\s+/);
    return words.slice(-windowSize).join(' ');
}

// Start Speech Recognition on button click
speakBtn.addEventListener('click', () => {
    if (!isRecording) {
        recognition.start();
        isRecording = true;
        speakBtn.textContent = 'Pause Speaking';
    } else {
        recognition.stop();
        isRecording = false;
        speakBtn.textContent = 'Start Speaking';
    }
    speakBtn.disabled = false;
});

// Update recognition handler
recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    const isFinal = result.isFinal;
    
    if (isFinal) {
        // Add to active segment
        conversationHistory.activeSegment += ' ' + transcript;
        
        // Show immediate feedback
        originalText.innerHTML = conversationHistory.historicalContext + 
            (conversationHistory.historicalContext ? '\n\n' : '') + 
            conversationHistory.activeSegment;
        
        // Enhance full active segment
        enhanceTranscription(
            conversationHistory.activeSegment,
            conversationHistory.historicalContext
        );
    } else {
        // Show interim results
        originalText.innerHTML = conversationHistory.historicalContext + 
            (conversationHistory.historicalContext ? '\n\n' : '') + 
            conversationHistory.activeSegment + ' ' + transcript;
    }
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    speakBtn.disabled = false;
    speakBtn.textContent = 'Start Speaking';
};

recognition.onend = () => {
    if (isRecording) {
        recognition.start(); // Restart if not manually stopped
    }
};

// Function to enhance transcription using backend
function enhanceTranscription(text, context) {
    const limitedContext = getTranscriptionContext(context);
    conversationHistory.pendingEnhancement = true;

    fetch('http://localhost:5000/enhance_transcription', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, context: limitedContext })
    })
    .then(response => response.json())
    .then(data => {
        if (data.enhanced_text) {
            // Move current segment to history
            if (conversationHistory.historicalContext) {
                conversationHistory.historicalContext += '\n\n';
            }
            conversationHistory.historicalContext += data.enhanced_text;
            conversationHistory.activeSegment = '';
            conversationHistory.pendingEnhancement = false;
            
            updateDisplay();
            translateText(data.enhanced_text);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        conversationHistory.pendingEnhancement = false;
    });
}

// Function to translate text using backend
function translateText(text) {
    const selectedOutputLang = outputLang.value;
    const translationContext = getTranslationContext(
        conversationHistory.translated.join('\n\n')
    );

    fetch('http://localhost:5000/translate_text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            text: text, 
            context: translationContext,
            target_language: selectedOutputLang 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.translated_text) {
            conversationHistory.translated.push(data.translated_text);
            updateDisplay();
        }
    })
    .catch(error => console.error('Error:', error));
}

// Function to play translated text as audio
playBtn.addEventListener('click', () => {
    const text = translatedText.textContent;
    if (text === "") return;

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedOutputLang = outputLang.value;
    utterance.lang = selectedOutputLang === 'es' ? 'es-ES' : 'en-US'; // Adjust as needed

    window.speechSynthesis.speak(utterance);
});

newConvBtn.addEventListener('click', () => {
    conversationHistory = {
        activeSegment: '',
        historicalContext: '',
        translated: [],
        pendingEnhancement: false,
        paragraphSpacing: '\n\n'
    };
    updateDisplay();
});
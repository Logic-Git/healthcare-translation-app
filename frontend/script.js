// frontend/script.js

// Selecting DOM elements
const speakBtn = document.getElementById('speak-btn');
const playBtn = document.getElementById('play-btn');
const originalText = document.getElementById('original-text');
const translatedText = document.getElementById('translated-text');
const inputLang = document.getElementById('input-lang');
const outputLang = document.getElementById('output-lang');
const newConvBtn = document.getElementById('new-conv-btn');
const loadingNotice = document.getElementById('loading-notice');

// Add state tracking at the top
let isRecording = false;
let isProcessing = false;
let hasPendingWork = false;
let isSpeaking = false;

// Add at the top with other state variables
let audioContext = null;

// Updated button disable function
function setButtonsState(disabled) {
    speakBtn.disabled = disabled;
    playBtn.disabled = disabled;
    newConvBtn.disabled = disabled;
    inputLang.disabled = disabled;
    outputLang.disabled = disabled;
}

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

// Update speak button handler
speakBtn.addEventListener('click', () => {
    if (!isRecording) {
        // Starting recording
        recognition.start();
        isRecording = true;
        speakBtn.textContent = 'Pause Speaking';
        // Disable all controls except speak button
        setButtonsState(true); 
        speakBtn.disabled = false;
        loadingNotice.style.display = 'block';
        isProcessing = true;
    } else {
        // Stopping recording
        recognition.stop();
        isRecording = false;
        speakBtn.textContent = 'Start Speaking';
        // Only enable controls if no pending work
        if (!hasPendingWork) {
            setButtonsState(false); 
            isProcessing = false;
            loadingNotice.style.display = 'none';
        }
    }
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

// Replace all instances of http://localhost:5000 with
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:10000'
    : 'https://healthcare-translation-backend.onrender.com';

// Update enhanceTranscription function
function enhanceTranscription(text, context) {
    hasPendingWork = true;
    conversationHistory.pendingEnhancement = true;

    fetch(`${API_URL}/enhance_transcription`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, context: getTranscriptionContext(context) })
    })
    .then(response => response.json())
    .then(data => {
        if (data.enhanced_text) {
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
        hasPendingWork = false;
        if (!isRecording) {
            setProcessingState(false);
        }
    });
}

// Update translateText function
function translateText(text) {
    hasPendingWork = true;

    fetch(`${API_URL}/translate_text`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            text: text, 
            context: getTranslationContext(conversationHistory.translated.join('\n\n')),
            target_language: outputLang.value 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.translated_text) {
            conversationHistory.translated.push(data.translated_text);
            updateDisplay();
            hasPendingWork = false;
            if (!isRecording) {
                setProcessingState(false);
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        hasPendingWork = false;
        if (!isRecording) {
            setProcessingState(false);
        }
    });
}



// Replace the play button handler
playBtn.addEventListener('click', async () => {
    try {
        if (!translatedText.textContent.trim()) {
            throw new Error("No text to speak");
        }

        setButtonsState(true);
        playBtn.style.opacity = "0.5";

        const response = await fetch(`${API_URL}/synthesize_speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: translatedText.textContent,
                language_code: outputLang.value === 'es' ? 'es-ES' : 'en-US'
            })
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Speech synthesis failed');
        }

        // Initialize AudioContext on first use
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const audioData = base64ToArrayBuffer(data.audio);
        const audioBuffer = await audioContext.decodeAudioData(audioData);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        source.onended = () => {
            setButtonsState(false); 
            playBtn.style.opacity = "1";
        };

        source.start(0);

    } catch (error) {
        console.error('Speech synthesis error:', error);
        alert(`Failed to play translation: ${error.message}`);
        setButtonsState(false); 
        playBtn.style.opacity = "1";
    }
});

// Add cleanup when starting new conversation
newConvBtn.addEventListener('click', () => {
    isSpeaking = false;
    setButtonsState(false);

    conversationHistory = {
        activeSegment: '',
        historicalContext: '',
        translated: [],
        pendingEnhancement: false,
        paragraphSpacing: '\n\n'
    };
    updateDisplay();
});



// Utility function for base64 conversion
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Add this function that's referenced but missing:
function setProcessingState(processing) {
    isProcessing = processing;
    loadingNotice.style.display = processing ? 'block' : 'none';
    if (!processing) {
        setButtonsState(false); 
        setButtonsState(false);
    }
}
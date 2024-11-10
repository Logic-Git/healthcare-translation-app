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
let synthesis = window.speechSynthesis;

// Add utility function for button state management
function setControlsState(disabled) {
    speakBtn.disabled = disabled;
    playBtn.disabled = disabled;
    newConvBtn.disabled = disabled;
    inputLang.disabled = disabled;
    outputLang.disabled = disabled;
}

// Function to check voice availability
function getVoiceForLanguage(langCode) {
    const voices = synthesis.getVoices();
    return voices.find(voice => voice.lang.startsWith(langCode)) || voices[0];
}

function setProcessingState(processing) {
    // Only allow changing processing state when not recording
    if (!isRecording) {
        isProcessing = processing;
        playBtn.disabled = processing;
        newConvBtn.disabled = processing;
        loadingNotice.style.display = processing ? 'block' : 'none';
    }
}

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
        // Force processing state true and disable buttons
        isProcessing = true;
        playBtn.disabled = true;
        newConvBtn.disabled = true;
        loadingNotice.style.display = 'block';
    } else {
        // Stopping recording
        recognition.stop();
        isRecording = false;
        speakBtn.textContent = 'Start Speaking';
        // Only remove processing state if no pending work
        if (!hasPendingWork) {
            setProcessingState(false);
        }
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

// Update enhanceTranscription function
function enhanceTranscription(text, context) {
    hasPendingWork = true;
    conversationHistory.pendingEnhancement = true;

    fetch('http://localhost:5000/enhance_transcription', {
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

    fetch('http://localhost:5000/translate_text', {
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

// Updated play button handler
playBtn.addEventListener('click', () => {
    // Guard clauses
    if (!synthesis) {
        alert("Speech synthesis not supported in your browser");
        return;
    }
    
    if (isSpeaking || !translatedText.textContent.trim()) {
        return;
    }

    const utterance = new SpeechSynthesisUtterance(translatedText.textContent);
    
    // Set language based on output selection
    const langCode = outputLang.value === 'es' ? 'es' : 'en-US';
    utterance.voice = getVoiceForLanguage(langCode);
    utterance.lang = langCode;

    // Event handlers
    utterance.onstart = () => {
        isSpeaking = true;
        setControlsState(true);
        playBtn.style.opacity = "0.5";
    };

    utterance.onend = () => {
        isSpeaking = false;
        setControlsState(false);
        playBtn.style.opacity = "1";
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        isSpeaking = false;
        setControlsState(false);
        playBtn.style.opacity = "1";
        alert("Error playing translation. Please try again.");
    };

    // Cancel any ongoing speech
    synthesis.cancel();
    
    // Start speaking
    synthesis.speak(utterance);
});

// Ensure voices are loaded (needed for some browsers)
if (synthesis) {
    synthesis.onvoiceschanged = () => {
        synthesis.getVoices();
    };
}

// Add cleanup when starting new conversation
newConvBtn.addEventListener('click', () => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
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
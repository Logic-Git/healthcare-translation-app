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

// Add at the top with other state variables
let availableVoices = [];
let voicesLoaded = false;

// Add to top of file
const SPEECH_CONFIG = {
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 5000,
    forceReload: true // Force Chrome to reload voices
};

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
    return availableVoices.find(voice => voice.lang.startsWith(langCode)) || null;
}

// Add new function to check if required voice is available
function hasRequiredVoice(langCode) {
    return availableVoices.some(voice => voice.lang.startsWith(langCode));
}

// Add function to update play button state
function updatePlayButtonState() {
    const langCode = outputLang.value === 'es' ? 'es-ES' : 'en-US';
    const hasVoice = hasRequiredVoice(langCode);
    playBtn.disabled = !hasVoice || !voicesLoaded;
    playBtn.style.opacity = hasVoice && voicesLoaded ? "1" : "0.5";
    playBtn.title = hasVoice ? "Speak Translation" : "Loading voices...";
}

// Initialize voices when page loads
async function initializeVoices() {
    console.log('Starting voice initialization...');
    
    for (let attempt = 1; attempt <= SPEECH_CONFIG.retryAttempts; attempt++) {
        try {
            console.log(`Attempt ${attempt} of ${SPEECH_CONFIG.retryAttempts}`);
            
            // Force reload voices in Chrome
            if (SPEECH_CONFIG.forceReload) {
                window.speechSynthesis.cancel();
            }
            
            // Try immediate load
            let voices = window.speechSynthesis.getVoices();
            
            if (!voices.length) {
                console.log('Waiting for voices...');
                voices = await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Voice loading timeout'));
                    }, SPEECH_CONFIG.timeout);
                    
                    window.speechSynthesis.onvoiceschanged = () => {
                        clearTimeout(timeoutId);
                        const loadedVoices = window.speechSynthesis.getVoices();
                        console.log(`Loaded ${loadedVoices.length} voices`);
                        resolve(loadedVoices);
                    };
                });
            }
            
            if (voices.length) {
                availableVoices = voices;
                voicesLoaded = true;
                console.log('Voice initialization successful');
                updatePlayButtonState();
                return;
            }
            
        } catch (error) {
            console.warn(`Attempt ${attempt} failed:`, error);
            if (attempt < SPEECH_CONFIG.retryAttempts) {
                console.log(`Waiting ${SPEECH_CONFIG.retryDelay}ms before retry...`);
                await new Promise(r => setTimeout(r, SPEECH_CONFIG.retryDelay));
            }
        }
    }
    
    console.error('Voice initialization failed after all attempts');
    voicesLoaded = false;
    updatePlayButtonState();
}

// Update output language change handler
outputLang.addEventListener('change', updatePlayButtonState);

// Call initialization when page loads
document.addEventListener('DOMContentLoaded', initializeVoices);

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
        // Disable all controls except speak button
        setControlsState(true);
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
            setControlsState(false);
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

// Ensure voices are loaded before proceeding
function loadVoices() {
    return new Promise((resolve) => {
        let voices = synthesis.getVoices();
        if (voices.length !== 0) {
            resolve(voices);
        } else {
            synthesis.onvoiceschanged = () => {
                voices = synthesis.getVoices();
                resolve(voices);
            };
        }
    });
}

// Replace the play button handler
playBtn.addEventListener('click', async () => {
    try {
        if (!synthesis || !translatedText.textContent.trim()) {
            throw new Error("No text to speak or synthesis not supported");
        }

        setControlsState(true);
        playBtn.style.opacity = "0.5";
        
        // Clear any ongoing speech
        synthesis.cancel();
        
        // Keep-alive interval for Chrome
        let keepAliveInterval;
        
        await new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(translatedText.textContent);
            const langCode = outputLang.value === 'es' ? 'es-ES' : 'en-US';
            utterance.lang = langCode;
            
            // Get appropriate voice
            const voices = synthesis.getVoices();
            const voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
            
            if (!voice) {
                reject(new Error(`No voice available for ${langCode}`));
                return;
            }
            
            utterance.voice = voice;
            
            // Keep speech alive in Chrome
            keepAliveInterval = setInterval(() => {
                if (synthesis.speaking) {
                    synthesis.pause();
                    synthesis.resume();
                }
            }, 250);
            
            utterance.onstart = () => {
                console.log('Speech started');
                isSpeaking = true;
            };
            
            utterance.onend = () => {
                console.log('Speech ended');
                clearInterval(keepAliveInterval);
                isSpeaking = false;
                resolve();
            };
            
            utterance.onerror = (error) => {
                console.error('Speech error:', error);
                clearInterval(keepAliveInterval);
                reject(error);
            };
            
            synthesis.speak(utterance);
        });
        
    } catch (error) {
        console.error('Speech synthesis error:', error);
        alert(`Failed to play translation: ${error.message}`);
    } finally {
        setControlsState(false);
        playBtn.style.opacity = "1";
        isSpeaking = false;
    }
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

function testSpeech() {
    console.log('Starting test speech...');
    
    // Ensure synthesis is available
    if (!window.speechSynthesis) {
        console.error('Speech synthesis not supported');
        return;
    }

    // Force sync voice loading
    window.speechSynthesis.cancel();
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length === 0) {
        console.log('No voices available, waiting for voices to load...');
        // Wait for voices
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            continueWithSpeech(voices);
        };
    } else {
        continueWithSpeech(voices);
    }
}

function continueWithSpeech(voices) {
    console.log('Available voices:', voices.length);
    
    const testUtterance = new SpeechSynthesisUtterance("Test message");
    testUtterance.lang = 'en-US';
    
    // Find English voice
    const voice = voices.find(v => v.lang.startsWith('en'));
    if (!voice) {
        console.error('No English voice found');
        return;
    }
    
    console.log('Selected voice:', {
        name: voice.name,
        lang: voice.lang,
        default: voice.default
    });
    
    testUtterance.voice = voice;
    
    testUtterance.onstart = () => console.log('🎤 Speech started');
    testUtterance.onend = () => console.log('✅ Speech ended');
    testUtterance.onerror = (e) => console.log('❌ Speech error:', e);
    
    console.log('Speaking...');
    window.speechSynthesis.speak(testUtterance);
}

// Add after state variables
async function initializeSpeechSynthesis() {
    if (!window.speechSynthesis) {
        throw new Error('Speech synthesis not supported');
    }
    
    synthesis = window.speechSynthesis;
    try {
        availableVoices = await loadVoicesWithRetry();
        voicesLoaded = true;
        updatePlayButtonState();
    } catch (error) {
        console.error('Failed to initialize speech synthesis:', error);
        playBtn.disabled = true;
        playBtn.title = 'Speech synthesis unavailable';
    }
}

async function loadVoicesWithRetry() {
    for (let i = 0; i < SPEECH_CONFIG.retryAttempts; i++) {
        try {
            const voices = await new Promise((resolve, reject) => {
                const voices = synthesis.getVoices();
                if (voices.length) {
                    resolve(voices);
                } else {
                    synthesis.onvoiceschanged = () => resolve(synthesis.getVoices());
                    setTimeout(() => reject('Voice loading timeout'), SPEECH_CONFIG.timeout);
                }
            });
            
            if (voices.length) return voices;
            
        } catch (error) {
            console.warn(`Voice loading attempt ${i + 1} failed:`, error);
            await new Promise(r => setTimeout(r, SPEECH_CONFIG.retryDelay));
        }
    }
    throw new Error('Failed to load voices after multiple attempts');
}

// Call on page load
document.addEventListener('DOMContentLoaded', initializeSpeechSynthesis);

async function testSpeechSystem() {
    console.log('=== Speech System Test ===');
    
    // 1. Test configuration
    console.log('Config:', SPEECH_CONFIG);
    
    // 2. Test synthesis availability
    console.log('Speech synthesis available:', !!window.speechSynthesis);
    
    // 3. Test voice loading
    const voices = window.speechSynthesis.getVoices();
    console.log('Initial voices:', voices.length);
    
    // 4. Test specific language voices
    const enVoice = getVoiceForLanguage('en');
    const esVoice = getVoiceForLanguage('es');
    console.log('English voice:', enVoice?.name);
    console.log('Spanish voice:', esVoice?.name);
    
    // 5. Attempt speech
    try {
        const testUtterance = new SpeechSynthesisUtterance('Test message');
        testUtterance.voice = enVoice;
        testUtterance.onstart = () => console.log('Speech started');
        testUtterance.onend = () => console.log('Speech complete');
        testUtterance.onerror = (e) => console.error('Speech error:', e);
        
        window.speechSynthesis.speak(testUtterance);
    } catch (error) {
        console.error('Speech test failed:', error);
    }
}

// Add this test function
async function fullSpeechTest() {
    console.log('=== Full Speech Test ===');

    // 1. Reset speech system
    window.speechSynthesis.cancel();
    
    // 2. Get current state
    console.log('Loaded voices:', availableVoices.length);
    console.log('Synthesis ready:', !!window.speechSynthesis);
    
    // 3. Create test utterance
    const utterance = new SpeechSynthesisUtterance('Testing speech synthesis system');
    
    // 4. Configure utterance
    const voice = availableVoices.find(v => v.lang.startsWith('en'));
    console.log('Selected voice:', voice?.name);
    
    utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // 5. Speak with timeout protection
    try {
        await Promise.race([
            new Promise((resolve, reject) => {
                utterance.onstart = () => console.log('🎤 Speech started');
                utterance.onend = () => {
                    console.log('✅ Speech completed');
                    resolve();
                };
                utterance.onerror = (e) => {
                    console.error('❌ Speech error:', e);
                    reject(e);
                };
                
                // Chrome fix: resume if paused
                utterance.onpause = () => window.speechSynthesis.resume();
                
                window.speechSynthesis.speak(utterance);
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject('Speech timeout'), 5000)
            )
        ]);
    } catch (error) {
        console.error('Speech test failed:', error);
    }
}

async function testSpanishVoiceDirectly() {
    console.log('=== Spanish Voice Direct Test ===');
    
    // Wait for voices to load
    let voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
        console.log('Waiting for voices to load...');
        await new Promise(resolve => {
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                resolve();
            };
        });
    }
    
    console.log('Available voices:', voices.length);
    
    const spanishVoice = voices.find(v => v.name === 'Google español');
    console.log('Spanish voice found:', spanishVoice?.name);
    
    if (!spanishVoice) {
        console.error('Spanish voice not found!');
        return;
    }
    
    // Clear any ongoing speech
    window.speechSynthesis.cancel();
    
    // Chrome fix: keep-alive interval
    let keepAliveInterval;
    
    try {
        await new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance('Hola, esta es una prueba');
            utterance.voice = spanishVoice;
            utterance.lang = 'es-ES';
            
            // Keep speech alive in Chrome
            keepAliveInterval = setInterval(() => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 250);
            
            utterance.onstart = () => console.log('🎤 Speech started');
            utterance.onend = () => {
                console.log('✅ Speech ended');
                clearInterval(keepAliveInterval);
                resolve();
            };
            utterance.onerror = e => {
                console.error('❌ Error:', e);
                clearInterval(keepAliveInterval);
                reject(e);
            };
            
            console.log('Starting speech...');
            window.speechSynthesis.speak(utterance);
        });
    } catch (error) {
        console.error('Speech failed:', error);
    } finally {
        clearInterval(keepAliveInterval);
    }
}
// Global variables for speech recognition and audio state management
let recognition;
let isAudioPlaying = false;
let audioRetryCount = 0;
const MAX_AUDIO_RETRIES = 3;

// DOM element references
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const clearButton = document.getElementById('clearButton');
const status = document.getElementById('status');
const chatBox = document.getElementById('chatBox');
const audioPlayer = document.getElementById('audioPlayer');

/**
 * Automatically scrolls the chat box to the bottom
 * Used when new messages are added
 */
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Formats AI messages with special section handling
 * Supports different message types like Correction, Explanation, Response, etc.
 * @param {string} text - The AI message text to format
 * @returns {string} Formatted HTML string
 */
function formatAIMessage(text) {
    const specialSections = ['Correction', 'Explanation', 'Response', 'ResponseJaksel', 'Suggestion', 'SuggestionJaksel'];
    const hasSpecialSections = specialSections.some(section => text.includes(`[${section}]`));

    if (!hasSpecialSections) {
        return `<div class="message ai-message">${text}</div>`;
    }

    let formatted = text;
    specialSections.forEach(section => {
        const sectionClass = section.toLowerCase().replace('jaksel', '-jaksel');
        if (text.includes(`[${section}]`)) {
            formatted = formatted.replace(
                new RegExp(`\\[${section}\\](.*?)(?=\\[|$)`, 'gs'),
                `<div class="message-section ${sectionClass}">$1</div>`
            );
        }
    });
    return formatted;
}

/**
 * Adds a new message to the chat box
 * @param {string} text - Message content
 * @param {boolean} isUser - True if message is from user, false if from AI
 */
function addMessage(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    if (!isUser) {
        messageDiv.innerHTML = formatAIMessage(text);
    } else {
        messageDiv.textContent = text;
    }
    
    chatBox.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Plays audio with retry mechanism on failure
 * @param {string} audioFile - Audio file name/path
 * @returns {Promise} Resolves when audio completes or fails after max retries
 */
async function playAudioWithRetry(audioFile) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(`https://nyari.me/api/audio/${audioFile}`);
        
        audio.addEventListener('ended', () => {
            isAudioPlaying = false;
            audioRetryCount = 0;
            resolve();
        });
        
        audio.addEventListener('error', async (e) => {
            console.error('Audio playback error:', e);
            
            if (audioRetryCount < MAX_AUDIO_RETRIES) {
                audioRetryCount++;
                console.log(`Retrying audio playback (${audioRetryCount}/${MAX_AUDIO_RETRIES})...`);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                audio.load();
                audio.play().catch(error => {
                    console.error('Retry failed:', error);
                    if (audioRetryCount === MAX_AUDIO_RETRIES) {
                        isAudioPlaying = false;
                        reject(new Error('Max retry attempts reached'));
                    }
                });
            } else {
                isAudioPlaying = false;
                reject(new Error('Max retry attempts reached'));
            }
        });

        audio.play().catch(error => {
            console.error('Initial playback failed:', error);
            reject(error);
        });
    });
}

/**
 * Handles server response and performs error checking
 * @param {Response} response - Fetch API response object
 * @returns {Promise} JSON response data
 */
async function handleServerResponse(response) {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
    }
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Stops the speech recognition
 */
function stopRecording() {
    if (recognition) {
        recognition.stop();
        startButton.disabled = false;
        stopButton.disabled = true;
        status.textContent = 'Click the microphone button to start speaking';
    }
}

/**
 * Starts the speech recognition if audio is not currently playing
 */
function startRecording() {
    if (!isAudioPlaying && recognition) {
        recognition.start();
        startButton.disabled = true;
        stopButton.disabled = false;
        status.textContent = 'Listening...';
    }
}

// Speech Recognition initialization and event handling
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Recognition start event handler
    recognition.onstart = () => {
        status.textContent = 'Listening...';
        startButton.disabled = true;
        stopButton.disabled = false;
    };

    // Recognition end event handler
    recognition.onend = () => {
        if (!isAudioPlaying) {
            status.textContent = 'Click the microphone button to start speaking';
            startButton.disabled = false;
            stopButton.disabled = true;
        }
    };

    // Recognition result event handler
    recognition.onresult = async (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript = event.results[i][0].transcript;
                stopRecording();
                
                try {
                    // Send transcribed text to server
                    const response = await fetch('https://nyari.me/api/speaking.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            action: 'speech_to_text',
                            text: finalTranscript
                        })
                    });
                    
                    const data = await handleServerResponse(response);
                    
                    if (data.success) {
                        // Add messages to chat and handle audio response
                        addMessage(data.user_message, true);
                        addMessage(data.ai_response, false);
                        
                        if (data.audio_file) {
                            isAudioPlaying = true;
                            status.textContent = 'Listening to AI response...';
                            startButton.disabled = true;
                            
                            try {
                                await playAudioWithRetry(data.audio_file);
                                setTimeout(() => {
                                    startRecording();
                                }, 500);
                            } catch (error) {
                                console.error('Audio playback failed:', error);
                                status.textContent = 'Error playing audio. Please try again.';
                                startButton.disabled = false;
                            }
                        } else {
                            status.textContent = 'No audio available. Please try again.';
                            startButton.disabled = false;
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    status.textContent = 'Error communicating with server: ' + error.message;
                    startButton.disabled = false;
                }
            }
        }
    };

    // Recognition error event handler
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        status.textContent = 'Error: ' + event.error;
        isAudioPlaying = false;
        startButton.disabled = false;
    };
} else {
    // Browser compatibility check
    status.textContent = 'Speech Recognition is not supported in this browser.';
    startButton.disabled = true;
    stopButton.disabled = true;
}

// Button event listeners
startButton.onclick = startRecording;
stopButton.onclick = stopRecording;

// Clear chat history handler
clearButton.onclick = async () => {
    try {
        const response = await fetch('https://nyari.me/api/speaking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'clear_chat'
            })
        });
        
        const data = await handleServerResponse(response);
        
        if (data.success) {
            // Reset chat UI
            chatBox.innerHTML = `
                <div class="message ai-message">
                    Hello! I'm your English tutor. Feel free to start a conversation in English, and I'll help you improve your speaking skills.
                </div>
            `;
            audioPlayer.innerHTML = '';
            status.textContent = 'Chat history has been cleared';
            isAudioPlaying = false;
        }
    } catch (error) {
        console.error('Error:', error);
        status.textContent = 'Error clearing chat history: ' + error.message;
    }
};

// Initial scroll to bottom
scrollToBottom();

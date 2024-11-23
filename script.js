let recognition;
let isAudioPlaying = false;
let audioRetryCount = 0;
const MAX_AUDIO_RETRIES = 3;

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const clearButton = document.getElementById('clearButton');
const status = document.getElementById('status');
const chatBox = document.getElementById('chatBox');
const audioPlayer = document.getElementById('audioPlayer');

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

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

function stopRecording() {
    if (recognition) {
        recognition.stop();
        startButton.disabled = false;
        stopButton.disabled = true;
        status.textContent = 'Click the microphone button to start speaking';
    }
}

function startRecording() {
    if (!isAudioPlaying && recognition) {
        recognition.start();
        startButton.disabled = true;
        stopButton.disabled = false;
        status.textContent = 'Listening...';
    }
}

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        status.textContent = 'Listening...';
        startButton.disabled = true;
        stopButton.disabled = false;
    };

    recognition.onend = () => {
        if (!isAudioPlaying) {
            status.textContent = 'Click the microphone button to start speaking';
            startButton.disabled = false;
            stopButton.disabled = true;
        }
    };

    recognition.onresult = async (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript = event.results[i][0].transcript;
                stopRecording();
                
                try {
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

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        status.textContent = 'Error: ' + event.error;
        isAudioPlaying = false;
        startButton.disabled = false;
    };
} else {
    status.textContent = 'Speech Recognition is not supported in this browser.';
    startButton.disabled = true;
    stopButton.disabled = true;
}

startButton.onclick = startRecording;
stopButton.onclick = stopRecording;

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

scrollToBottom();
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Meta tags for character encoding and responsive viewport -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Learning Chat</title>
    
    <!-- External CSS dependencies -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Main chat container -->
    <div class="chat-container">
        <h1>English Learning Chat</h1>
        
        <!-- Chat messages display area -->
        <div class="chat-box" id="chatBox">
            <!-- Initial AI greeting message -->
            <div class="message ai-message">
                Hello! I'm your English tutor. Feel free to start a conversation in English, and I'll help you improve your speaking skills.
            </div>
            
            <?php 
            // Start session for maintaining chat history
            session_start();
            
            /**
             * Formats AI messages with special sections for different types of responses
             * @param string $text The message text to format
             * @return string Formatted HTML for the message
             */
            function formatAIMessage($text) {
                // Define special sections that need custom formatting
                $specialSections = ['Correction', 'Explanation', 'Response', 'ResponseJaksel', 
                                  'Suggestion', 'SuggestionJaksel'];
                $hasSpecialSections = false;
                
                // Check if message contains any special sections
                foreach ($specialSections as $section) {
                    if (strpos($text, "[$section]") !== false) {
                        $hasSpecialSections = true;
                        break;
                    }
                }
                
                // Return simple message if no special sections found
                if (!$hasSpecialSections) {
                    return "<div class='message ai-message'>" . htmlspecialchars($text) . "</div>";
                }
                
                // Process and format special sections
                $formatted = $text;
                foreach ($specialSections as $section) {
                    $sectionLower = strtolower($section);
                    if (strpos($text, "[$section]") !== false) {
                        $pattern = "/\[$section\](.*?)(?=\[|$)/s";
                        $replacement = '<div class="message-section ' . $sectionLower . '">$1</div>';
                        $formatted = preg_replace($pattern, $replacement, $formatted);
                    }
                }
                
                return $formatted;
            }
            
            // Display chat history if it exists
            if (isset($_SESSION['chat_history'])) {
                foreach ($_SESSION['chat_history'] as $message): ?>
                    <?php if ($message['role'] === 'user'): ?>
                        <div class="message user-message">
                            <?php echo htmlspecialchars($message['message']); ?>
                        </div>
                    <?php else: ?>
                        <?php echo formatAIMessage($message['message']); ?>
                    <?php endif; ?>
                <?php endforeach;
            }
            ?>
        </div>
        
        <!-- Status indicator for user guidance -->
        <div class="status" id="status">Click the microphone button and speak in English</div>
        
        <!-- Control buttons for recording and clearing chat -->
        <div class="controls">
            <button id="startButton">
                <i class="fas fa-microphone"></i> Start Recording
            </button>
            <button id="stopButton" disabled>
                <i class="fas fa-stop"></i> Stop
            </button>
            <button id="clearButton">
                <i class="fas fa-trash"></i> Clear Chat
            </button>
        </div>
        
        <!-- Container for audio playback -->
        <div class="audio-player" id="audioPlayer"></div>
    </div>

    <!-- JavaScript for chat functionality -->
    <script src="script.js"></script>
</body>
</html>

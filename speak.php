<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Learning Chat</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="chat-container">
        <h1>English Learning Chat</h1>
        <div class="chat-box" id="chatBox">
            <div class="message ai-message">
                Hello! I'm your English tutor. Feel free to start a conversation in English, and I'll help you improve your speaking skills.
            </div>
            <?php 
            session_start();
            
            function formatAIMessage($text) {
                $specialSections = ['Correction', 'Explanation', 'Response', 'ResponseJaksel', 'Suggestion', 'SuggestionJaksel'];
                $hasSpecialSections = false;
                
                foreach ($specialSections as $section) {
                    if (strpos($text, "[$section]") !== false) {
                        $hasSpecialSections = true;
                        break;
                    }
                }
                
                if (!$hasSpecialSections) {
                    return "<div class='message ai-message'>" . htmlspecialchars($text) . "</div>";
                }
                
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
        
        <div class="status" id="status">Click the microphone button and speak in English</div>
        
        <div class="controls">
            <button id="startButton"><i class="fas fa-microphone"></i> Start Recording</button>
            <button id="stopButton" disabled><i class="fas fa-stop"></i> Stop</button>
            <button id="clearButton"><i class="fas fa-trash"></i> Clear Chat</button>
        </div>
        
        <div class="audio-player" id="audioPlayer"></div>
    </div>

    <script src="script.js"></script>
</body>
</html>
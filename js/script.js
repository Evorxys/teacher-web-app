document.addEventListener('DOMContentLoaded', function() {
    const messageBox = document.getElementById('messagebox');
    const chatbox = document.getElementById('chatbox');
    const sendBtn = document.getElementById('send-btn');
    const speakBtn = document.getElementById('speak-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const printBtn = document.getElementById('print-btn');

    let recognition;
    let recognizing = false;
    let interimSpeech = '';  // Interim recognized speech
    let finalSpeech = '';    // Final recognized speech
    let debounceTimer = null; // Timer for debouncing the interim updates

    // Socket.IO connection
    const socket = io('https://websocket-server-teacher-student.onrender.com');  // Connect to your WebSocket server

    // Socket event to handle incoming messages from students
    socket.on('receiveMessage', function(data) {
        // Check if data is a string or an object with a message property
        let message;
        if (typeof data === 'string') {
            message = data;  // If it's a string, use it directly
        } else if (data.message) {
            message = data.message;  // If it's an object, use the message property
        } else {
            console.error('Received data without message:', data);
            return; // Exit the function if there's no message
        }
        
        // Log the received message to the console
        console.log("Received message: ", message);

        // Display the message as coming from the student
        receiveMessage('Student', message);
    });

    // Function to send a message (teacher's message)
    function sendMessage() {
        const message = messageBox.value.trim();
        
        if (message) {
            // Send message to the WebSocket server
            socket.emit('teacher-message', { message: message });

            // Create message element for the chatbox
            const newMessage = document.createElement('p');
            newMessage.classList.add('teacher');  // Add 'teacher' class for styling
            newMessage.innerHTML = `<span class="label">Teacher: </span>${message}`;
            chatbox.appendChild(newMessage);

            messageBox.value = '';  
            finalSpeech = '';  // Reset final speech after sending
            clearTypingMessage();  // Clear the typing message
            autoScrollChatbox();  // Auto-scroll to the bottom
        }
    }

    // Function to receive and display a message (from students)
    function receiveMessage(from, message) {
        const newMessage = document.createElement('p');
        newMessage.classList.add('chat-message');

        if (from === 'Student') {
            newMessage.classList.add('student-message');
            newMessage.innerHTML = `<span style="color:red;"><strong>Student:</strong></span> ${message}`;
        } else {
            newMessage.classList.add('teacher-message');
            newMessage.innerHTML = `<span style="color:blue;"><strong>Teacher:</strong></span> ${message}`;
        }

        // Append the new message to the chatbox
        chatbox.appendChild(newMessage);
        autoScrollChatbox();  // Ensure the chatbox scrolls to the latest message
    }

    // Function to auto-scroll chatbox to show the latest message
    function autoScrollChatbox() {
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    // Function to clear the message box
    function clearMessageBox() {
        messageBox.value = '';
        finalSpeech = ''; // Clear the speech as well
        clearTypingMessage();  // Clear the typing message
    }

    // Function to clear typing message from chatbox
    function clearTypingMessage() {
        const typingMessage = document.getElementById('typing-message');
        if (typingMessage) {
            chatbox.removeChild(typingMessage);
        }
    }

    // Function to update typing message
    function updateTypingMessage() {
        const typingMessage = document.getElementById('typing-message');
        const message = messageBox.value.trim();
    
        if (message) {
            if (!typingMessage) {
                const newTypingMessage = document.createElement('p');
                newTypingMessage.id = 'typing-message';
                newTypingMessage.classList.add('teacher-typing');  // Updated class for typing messages
                newTypingMessage.innerHTML = `<span class="label">Teacher (Typing): </span>${message}`;
                chatbox.appendChild(newTypingMessage);
            } else {
                typingMessage.innerHTML = `<span class="label">Teacher (Typing): </span>${message}`;
            }
            autoScrollChatbox();  // Auto-scroll to the bottom
        } else {
            clearTypingMessage();  // Clear typing message if input is empty
        }
    }

    // Speech recognition setup (remains unchanged)
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;  
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = function() {
            recognizing = true;
            speakBtn.textContent = 'Stop Speaking';
        };

        recognition.onresult = function(event) {
            interimSpeech = ''; // Clear interim speech for this round

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalSpeech += event.results[i][0].transcript.trim() + ' ';
                } else {
                    interimSpeech += event.results[i][0].transcript.trim() + ' ';
                }
            }

            // Debounce updating the chatbox to avoid duplicate speech display on mobile
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Display real-time speech in chatbox
                displayRealTimeMessage(finalSpeech + interimSpeech);
            }, 500); // 500ms delay to debounce updates
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error: ', event.error);
        };

        recognition.onend = function() {
            recognizing = false;
            speakBtn.textContent = 'Start Speaking';

            // On stop, copy final speech to messagebox and treat it as sent
            messageBox.value = finalSpeech.trim(); // Set the final speech in message box
            sendMessage();  // Simulate sending the message
        };
    } else {
        alert('Speech Recognition API not supported in this browser.');
    }

    // Attach event listeners to buttons
    sendBtn.addEventListener('click', sendMessage);
    speakBtn.addEventListener('click', toggleSpeechRecognition);
    clearBtn.addEventListener('click', clearMessageBox);
    saveBtn.addEventListener('click', saveMessages);
    printBtn.addEventListener('click', printMessages);
});

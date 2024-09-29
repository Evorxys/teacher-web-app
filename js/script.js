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
        // Ensure the data has the 'message' property correctly
        receiveMessage('Student', data.message ? data.message : 'No message received');  // Display student's message
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

    // Function to receive a message (from students)
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

        chatbox.appendChild(newMessage);
        autoScrollChatbox();  // Ensure the chatbox scrolls to the latest message
    }

    // Function to clear the message box
    function clearMessageBox() {
        messageBox.value = '';
        finalSpeech = ''; // Clear the speech as well
        clearTypingMessage();  // Clear the typing message
    }

    // Auto-scroll chatbox to show the latest message
    function autoScrollChatbox() {
        chatbox.scrollTop = chatbox.scrollHeight;
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

    // Speech recognition setup
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

    // Function to start/stop speech recognition
    function toggleSpeechRecognition() {
        if (recognizing) {
            recognition.stop();  // Stop speech recognition and trigger sending the message
        } else {
            recognition.start();  // Start speech recognition
        }
    }

    // Function to display teacher's real-time speech in chatbox
    function displayRealTimeMessage(text) {
        const previousRealTimeMessage = document.getElementById('real-time-message');

        // Remove the previous "Teacher (talking)" message to make space for a new one
        if (previousRealTimeMessage) {
            chatbox.removeChild(previousRealTimeMessage);
        }

        const realTimeMessageElement = document.createElement('p');
        realTimeMessageElement.id = 'real-time-message';
        realTimeMessageElement.classList.add('chat-message');
        realTimeMessageElement.innerHTML = `<span style="color:green;font-size: 15px"><strong>Teacher (talking):</strong><span style="color:black;font-size: 15px"> ${text}`;
        chatbox.appendChild(realTimeMessageElement);

        autoScrollChatbox();  // Auto-scroll to the bottom
    }
    
    // Save messages to a file
    function saveMessages() {
        let teacherMessages = '';
        chatbox.querySelectorAll('p').forEach(message => {
            if (message.innerHTML.includes('<strong>Teacher:</strong>')) {
                teacherMessages += message.innerText + '\n';
            }
        });

        if (teacherMessages.trim() === '') {
            alert('No Teacher messages to save.');
            return;
        }

        let fileName = prompt('Enter a name for your file:', 'TeacherMessages');
        if (!fileName) {
            alert('File name cannot be empty!');
            return;
        }

        fileName = fileName.replace(/\.docx$/, '') + '.docx';
        const docxContent = new Blob([teacherMessages], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        saveAs(docxContent, fileName);
    }

    // Print messages
    function printMessages() {
        let printContent = '';
        chatbox.querySelectorAll('p').forEach(message => {
            if (message.innerHTML.includes('<strong>Teacher:</strong>')) {
                printContent += message.innerHTML + '<br>';
            }
        });

        if (printContent) {
            const printWindow = window.open('', '', 'height=400,width=600');
            printWindow.document.write('<html><head><title>Print Teacher Messages</title></head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        } else {
            alert("No teacher messages to print.");
        }
    }

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    speakBtn.addEventListener('click', toggleSpeechRecognition);
    clearBtn.addEventListener('click', clearMessageBox);
    saveBtn.addEventListener('click', saveMessages);
    printBtn.addEventListener('click', printMessages);
    messageBox.addEventListener('input', updateTypingMessage);

    // Handle 'Enter' key to send messages
    messageBox.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });
});

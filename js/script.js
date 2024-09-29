document.addEventListener('DOMContentLoaded', function () {
    const messageBox = document.getElementById('messagebox');
    const chatbox = document.getElementById('chatbox');
    const sendBtn = document.getElementById('send-btn');
    const speakBtn = document.getElementById('speak-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const printBtn = document.getElementById('print-btn');

    let recognition;
    let recognizing = false;
    let interimSpeech = '';
    let finalSpeech = '';
    let debounceTimer = null;

    // Socket.IO connection
    const socket = io('https://websocket-server-teacher-student.onrender.com');

    // Socket event to handle incoming messages from students
    socket.on('receiveMessage', function (data) {
        let message;
        if (typeof data === 'string') {
            message = data;
        } else if (data.message) {
            message = data.message;
        } else {
            console.error('Received data without message:', data);
            return;
        }
        receiveMessage('Student', message);
    });

    function sendMessage() {
        const message = messageBox.value.trim();

        if (message) {
            socket.emit('teacher-message', { message: message });

            const newMessage = document.createElement('p');
            newMessage.classList.add('teacher-message');
            newMessage.innerHTML = `<span class="label" style="color:blue;"><strong>Teacher:</strong></span> ${message}`;
            chatbox.appendChild(newMessage);

            messageBox.value = '';
            finalSpeech = '';
            clearTypingMessage();
            autoScrollChatbox();
        }
    }

    function receiveMessage(from, message) {
        const newMessage = document.createElement('p');
        newMessage.classList.add('chat-message');

        if (from === 'Student') {
            newMessage.classList.add('student-message');
            newMessage.innerHTML = `<span class="label" style="color:red;"><strong>Student:</strong></span> ${message}`;
        } else {
            newMessage.classList.add('teacher-message');
            newMessage.innerHTML = `<span class="label" style="color:blue;"><strong>Teacher:</strong></span> ${message}`;
        }

        chatbox.appendChild(newMessage);
        autoScrollChatbox();
    }

    function clearMessageBox() {
        messageBox.value = '';
        finalSpeech = '';
        clearTypingMessage();
    }

    function autoScrollChatbox() {
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    function clearTypingMessage() {
        const typingMessage = document.getElementById('typing-message');
        if (typingMessage) {
            chatbox.removeChild(typingMessage);
        }
    }

    function updateTypingMessage() {
        const typingMessage = document.getElementById('typing-message');
        const message = messageBox.value.trim();

        if (message) {
            if (!typingMessage) {
                const newTypingMessage = document.createElement('p');
                newTypingMessage.id = 'typing-message';
                newTypingMessage.classList.add('teacher-typing');
                newTypingMessage.innerHTML = `<span class="label" style="color:blue;"><strong>Teacher (Typing):</strong></span> ${message}`;
                chatbox.appendChild(newTypingMessage);
            } else {
                typingMessage.innerHTML = `<span class="label" style="color:blue;"><strong>Teacher (Typing):</strong></span> ${message}`;
            }
            autoScrollChatbox();
        } else {
            clearTypingMessage();
        }
    }

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = function () {
            recognizing = true;
            speakBtn.textContent = 'Stop Speaking';
        };

        recognition.onresult = function (event) {
            interimSpeech = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalSpeech += event.results[i][0].transcript.trim() + ' ';
                } else {
                    interimSpeech += event.results[i][0].transcript.trim() + ' ';
                }
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                displayRealTimeMessage(finalSpeech + interimSpeech);
            }, 500);
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error: ', event.error);
        };

        recognition.onend = function () {
            recognizing = false;
            speakBtn.textContent = 'Start Speaking';
            messageBox.value = finalSpeech.trim();
            sendMessage();
        };
    } else {
        alert('Speech Recognition API not supported in this browser.');
    }

    function toggleSpeechRecognition() {
        if (recognizing) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    function displayRealTimeMessage(text) {
        const previousRealTimeMessage = document.getElementById('real-time-message');
        if (previousRealTimeMessage) {
            chatbox.removeChild(previousRealTimeMessage);
        }

        const realTimeMessageElement = document.createElement('p');
        realTimeMessageElement.id = 'real-time-message';
        realTimeMessageElement.classList.add('chat-message');
        realTimeMessageElement.innerHTML = `<span style="color:green;font-size: 15px"><strong>Teacher (talking):</strong></span> ${text}`;
        chatbox.appendChild(realTimeMessageElement);

        autoScrollChatbox();
    }

    function saveMessages() {
        let teacherMessages = '';
        chatbox.querySelectorAll('p.teacher-message').forEach(message => {
            teacherMessages += message.innerText + '\n';
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

        fileName = fileName.replace(/\.txt$/, '') + '.txt'; // Save as .txt for readability
        const textContent = new Blob([teacherMessages], { type: 'text/plain' }); // Create a text blob
        saveAs(textContent, fileName); // Use saveAs to download the text file
    }

    function printMessages() {
        let printContent = '';
        chatbox.querySelectorAll('p.teacher-message').forEach(message => {
            printContent += message.innerHTML + '<br>';
        });

        if (printContent) {
            const printWindow = window.open('', '', 'height=400,width=600');
            printWindow.document.write('<html><head><title>Print Messages</title>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        } else {
            alert('No Teacher messages to print.');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    speakBtn.addEventListener('click', toggleSpeechRecognition);
    clearBtn.addEventListener('click', clearMessageBox);
    saveBtn.addEventListener('click', saveMessages);
    printBtn.addEventListener('click', printMessages);
});

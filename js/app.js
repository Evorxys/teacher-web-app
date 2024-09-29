document.addEventListener('DOMContentLoaded', () => {
    const socket = io();  // Connect to the server using Socket.IO

    // Elements
    const toggleCameraBtn = document.getElementById('toggleCameraBtn');
    const cameraFeed = document.getElementById('cameraFeed');
    const cameraPanel = document.getElementById('cameraPanel');
    const messageInput = document.getElementById('messageInput');
    const gestureInput = document.createElement('input'); // Separate field for gesture input
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatbox = document.getElementById('chatbox');
    const staticImage = document.createElement('img');
    staticImage.src = "https://static-00.iconduck.com/assets.00/camera-icon-512x454-qkhu7ta2.png";
    staticImage.classList.add('static-image');

    let cameraOpen = false;
    let stream = null;
    let model = null;
    let currentPage = 0;
    const messagesPerPage = 10;

    // Add the gesture input field below the main message input field
    gestureInput.type = 'text';
    gestureInput.placeholder = 'Gesture detected...';
    gestureInput.disabled = true; // Disable it by default
    messageInput.parentElement.insertBefore(gestureInput, sendMessageBtn);

    // Load the HandPose model
    async function loadModel() {
        try {
            model = await handpose.load();
            console.log("HandPose model loaded.");
            detectHands(); // Start detecting once the model is loaded
        } catch (error) {
            console.error("Error loading HandPose model:", error);
        }
    }

    // Start detecting hand gestures
    async function detectHands() {
        if (!cameraOpen || !model) return; // Ensure camera is on and model is loaded

        const predictions = await model.estimateHands(cameraFeed); // Detect hands

        if (predictions.length > 0) {
            console.log("Hand detected", predictions);
            const gesture = interpretGesture(predictions); // Interpret the detected gesture
            if (gesture) {
                gestureInput.value = gesture; // Display the interpreted gesture in the gesture input field
                highlightMessageInput(); // Add visual feedback for gesture detection
                provideGestureFeedback(predictions); // Provide real-time feedback
            }
        }

        if (cameraOpen) {
            requestAnimationFrame(detectHands); // Continue detection while camera is open
        }
    }

    // Interpret gestures based on predictions
    function interpretGesture(predictions) {
        const hand = predictions[0]; // Assuming there's at least one hand detected
        const fingerCount = hand.landmarks.length;

        // Example: If the hand is in a certain position, return a predefined message.
        if (fingerCount === 21) {
            return "Detected a full hand gesture!";
        }

        return null; // No gesture recognized
    }

    // Add visual feedback by highlighting message input when a gesture is detected
    function highlightMessageInput() {
        gestureInput.style.border = "2px solid #ffaa00"; // Highlight border of gesture input
        setTimeout(() => {
            gestureInput.style.border = "2px solid #5c6400"; // Revert after 1 second
        }, 1000);
    }

    // Provide real-time visual feedback on gestures
    function provideGestureFeedback(predictions) {
        // Highlight or mark detected finger positions in some way (visual feedback implementation)
        console.log("Providing visual feedback for gesture", predictions);
        // This could be enhanced by drawing on the video feed to highlight finger points, for example
    }

    // Toggle camera and load model only once when camera is opened
    toggleCameraBtn.addEventListener('click', () => {
        if (!cameraOpen) {
            openCamera();  // Open camera
            loadModel();   // Load the HandPose model when the camera opens
            startCameraGlowEffect(); // Start glow effect
        } else {
            closeCamera(); // Close camera
            stopCameraGlowEffect(); // Stop glow effect
        }
    });

    // Open the camera and stream video feed
    function openCamera() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function (streamObj) {
                    stream = streamObj;
                    cameraFeed.srcObject = stream;
                    toggleCameraBtn.innerText = "Close Camera";
                    cameraOpen = true;
                    cameraFeed.style.display = 'block'; // Show camera feed
                    staticImage.style.display = 'none'; // Hide static image
                })
                .catch(function (error) {
                    console.error("Error accessing camera:", error);
                    alert("Unable to access camera. Please check your device or browser permissions.");
                });
        } else {
            alert("Camera not supported in this browser.");
        }
    }

    // Close the camera feed
    function closeCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            cameraFeed.srcObject = null;
        }
        toggleCameraBtn.innerText = "Open Camera";
        cameraOpen = false;
        cameraFeed.style.display = 'none'; // Hide camera feed
        staticImage.style.display = 'block'; // Show static image
    }

    // Add a glowing effect or rotating light animation when the camera is active
    function startCameraGlowEffect() {
        cameraPanel.classList.add("camera-glow");
    }

    function stopCameraGlowEffect() {
        cameraPanel.classList.remove("camera-glow");
    }

    // Handle sending messages from the message box
    sendMessageBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        const gestureMessage = gestureInput.value.trim();

        if (message === "" && gestureMessage === "") return;

        // Allow user to confirm and edit the gesture message before sending
        const finalMessage = message || gestureMessage;

        // Send the message to the server using Socket.IO
        socket.emit('studentMessage', finalMessage);

        // Add the student's message to the chatbox
        appendMessage('student', finalMessage);
        messageInput.value = ""; // Clear message input
        gestureInput.value = ""; // Clear gesture input
    });

    // Append messages to the chatbox
    function appendMessage(sender, message) {
        const messageElement = document.createElement('p');
        messageElement.classList.add(sender);
        messageElement.innerHTML = `<span class="label">${sender.charAt(0).toUpperCase() + sender.slice(1)}:</span> <span class="content">${message}</span>`;
        chatbox.appendChild(messageElement);
        chatbox.scrollTop = chatbox.scrollHeight; // Scroll to the bottom of the chatbox
    }

    // Handle chat pagination or load-on-scroll for long conversations
    chatbox.addEventListener('scroll', () => {
        if (chatbox.scrollTop === 0 && currentPage > 0) {
            loadPreviousMessages();
        }
    });

    function loadPreviousMessages() {
        // Simulating pagination by loading older messages
        currentPage -= 1;
        console.log(`Loading messages for page ${currentPage}`);
        // Fetch older messages from the server or local storage based on the current page
        // Append older messages to the top of the chatbox
    }

    // Listen for incoming messages from the teacher
    socket.on('teacherMessage', (message) => {
        appendMessage('teacher', message);
    });

    // Add the static image to the camera panel
    document.getElementById('cameraPanel').appendChild(staticImage);
});

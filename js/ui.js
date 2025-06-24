/**
 * ui.js - User Interface management for Leontine
 * Handles all UI interactions, updates, and event listeners
 */

// UI Controller module
const UI = (function () {
    // DOM Elements cache
    let elements = {};

    // UI state
    let state = {
        fileSelected: false,
        currentFileName: null,
        apiStatus: "unknown", // 'unknown', 'checking', 'available', 'unavailable'
        transcriptionComplete: false,
        currentJobId: null,
        resultUrl: null,
        transcribing: false, // Indicates if transcription is in progress
        animationInterval: null, // Interval ID for processing animation
        animationFrame: 0, // Current frame in the animation sequence
        originalMessage: "", // Original message without animation
        messageIsHtml: false, // Whether the original message is HTML
    };

    // Reference to external modules
    let api;

    /**
     * Initializes the UI elements and event listeners
     * @param {Object} apiModule - Reference to the API module
     */
    function init(apiModule) {
        // Store reference to API module
        api = apiModule;

        // Cache DOM elements
        cacheElements();

        // Set up event listeners
        setupEventListeners();

        // Load saved API URL
        loadSavedApiUrl();

        // Update initial UI state
        updateTranscriptionUI();

        // Check for pending job (display will be handled when API initializes)
        const jobId = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_JOB_ID);
        if (jobId) {
            // Update UI to show there's a pending job
            const jobFilename =
                localStorage.getItem(CONFIG.STORAGE_KEYS.JOB_FILENAME) ||
                "Unknown file";

            // Add animation to the message to indicate job is in progress
            const message = `Found pending transcription job for "${jobFilename}"\nResuming job processing...`;

            // Start processing animation immediately for better user feedback
            setTimeout(() => {
                startProcessingAnimation(message);
            }, 100);

            // Update message with animation
            updateMessage(message);

            // Show the transcription UI section
            if (elements.transcribeButton) {
                elements.transcribeButton.style.display = "none";
            }
        }
    }

    /**
     * Cache DOM elements for better performance
     */
    function cacheElements() {
        elements = {
            // API configuration elements
            apiUrlInput: document.getElementById("api-url"),
            saveApiUrlButton: document.getElementById("save-api-url"),
            apiUrlValidation: document.getElementById("api-url-validation"),

            // File selection elements
            fileInput: document.getElementById("audio-file-input"),
            fileSelectButton: document.getElementById("file-select-button"),
            selectedFileDisplay: document.getElementById(
                "selected-file-display",
            ),

            // Transcription elements
            transcribeButton: document.getElementById("transcribe-button"),
            messageDisplay: document.getElementById("message-display"),

            // Results elements
            resultContainer: document.createElement("div"),
            downloadButton: document.createElement("button"),
            transcriptionStatus: document.createElement("div"),

            // API status elements
            apiStatusIndicator: document.getElementById("api-status-indicator"),
            apiStatusMessage: document.getElementById("api-status-message"),
        };
    }

    /**
     * Set up event listeners for UI interactions
     */
    function setupEventListeners() {
        // API URL events
        elements.apiUrlInput.addEventListener("input", validateApiUrl);
        elements.saveApiUrlButton.addEventListener("click", saveApiUrl);

        // File selection events
        elements.fileSelectButton.addEventListener("click", triggerFileSelect);
        elements.fileInput.addEventListener("change", handleFileSelect);

        // Transcription events
        elements.transcribeButton.addEventListener(
            "click",
            handleTranscribeClick,
        );
    }

    /**
     * Validates the API URL
     * Shows validation message if URL is invalid
     * @returns {boolean} Whether URL is valid
     */
    function validateApiUrl() {
        const url = elements.apiUrlInput.value.trim();

        if (!url) {
            elements.apiUrlValidation.textContent = "Please enter an API URL";
            return false;
        }

        try {
            // Check if it's a valid URL
            new URL(url);

            // Clear validation message
            elements.apiUrlValidation.textContent = "";
            return true;
        } catch (e) {
            elements.apiUrlValidation.textContent = "Please enter a valid URL";
            return false;
        }
    }

    /**
     * Saves the API URL to localStorage
     */
    function saveApiUrl() {
        // First validate the URL
        if (!validateApiUrl()) return;

        const url = elements.apiUrlInput.value.trim();

        try {
            // Save to localStorage
            localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL, url);

            // Show success message
            elements.apiUrlValidation.textContent =
                "API URL saved successfully!";
            elements.apiUrlValidation.style.color = CONFIG.UI.SUCCESS_COLOR;

            // Reset message color after a delay
            setTimeout(() => {
                elements.apiUrlValidation.style.color = CONFIG.UI.ERROR_COLOR; // Reset to default error color
                elements.apiUrlValidation.textContent = "";
            }, CONFIG.UI.SUCCESS_MESSAGE_TIMEOUT);

            // Check API availability with new URL and start periodic checking
            if (api) {
                if (api.checkApiAvailability) {
                    api.checkApiAvailability(url);
                }
                if (api.startPeriodicApiCheck) {
                    api.startPeriodicApiCheck(url);
                }
            }
        } catch (e) {
            elements.apiUrlValidation.textContent =
                "Error saving API URL. Please try again.";
        }
    }

    /**
     * Loads saved API URL from localStorage
     */
    function loadSavedApiUrl() {
        const savedUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL);

        if (savedUrl) {
            elements.apiUrlInput.value = savedUrl;

            // No need to check availability here as it's handled in API.init()
        }
    }

    /**
     * Opens the file selector when the select button is clicked
     */
    function triggerFileSelect() {
        elements.fileInput.click();
    }

    /**
     * Handles the file selection from the file input
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];

        if (file) {
            // Update state
            state.fileSelected = true;
            state.currentFileName = file.name;

            // Display the selected file name
            elements.selectedFileDisplay.textContent = file.name;

            // Update the transcription UI
            updateTranscriptionUI();
        } else {
            // Reset state
            state.fileSelected = false;
            state.currentFileName = null;

            // Reset the display if no file is selected
            elements.selectedFileDisplay.textContent = "No file selected";

            // Update the transcription UI
            updateTranscriptionUI();
        }
    }

    /**
     * Updates the transcription UI based on current state
     */
    function updateTranscriptionUI() {
        // Check if there's a pending job from localStorage
        const pendingJobId = localStorage.getItem(
            CONFIG.STORAGE_KEYS.CURRENT_JOB_ID,
        );

        if (pendingJobId) {
            // We have a pending job, hide the transcribe button
            elements.transcribeButton.style.display = "none";

            // Don't update message here - it will be handled by API.checkForPendingJobs
            return;
        }

        if (state.fileSelected) {
            if (state.transcribing) {
                elements.transcribeButton.style.display = "none";
            } else {
                elements.transcribeButton.style.display = "block";
                elements.messageDisplay.textContent =
                    "Ready to transcribe. Click the button to start.";
            }
        } else {
            elements.transcribeButton.style.display = "none";
            elements.messageDisplay.textContent = CONFIG.UI.INITIAL_MESSAGE;
        }
    }

    /**
     * Handles the transcribe button click
     * Calls the API module directly
     */
    function handleTranscribeClick() {
        // Update UI to show processing state
        elements.messageDisplay.textContent =
            "Preparing to send file for transcription...";

        // Disable/hide the transcribe button
        state.transcribing = true;
        updateTranscriptionUI();

        // Call API module's transcribe method if available
        if (api && api.handleTranscription) {
            api.handleTranscription(elements.fileInput.files[0]);
        }
    }

    /**
     * Updates the message display with new text
     * @param {string|Object} message - The message to display
     * @param {boolean} [isHtml=false] - Whether the message contains HTML
     */
    function updateMessage(message, isHtml = false) {
        // Convert objects or non-strings to string representation
        let messageText = message;
        if (typeof message !== "string") {
            try {
                messageText = JSON.stringify(message, null, 2);
            } catch (e) {
                messageText = String(message);
            }
        }

        // Start or stop animation based on job status
        const jobId = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_JOB_ID);
        const jobStatus = localStorage.getItem(CONFIG.STORAGE_KEYS.JOB_STATUS);

        if (
            jobId &&
            jobStatus !== CONFIG.STATUS.JOB_COMPLETED &&
            jobStatus !== CONFIG.STATUS.JOB_FAILED
        ) {
            // We have a pending job, start animation if not already running
            startProcessingAnimation(messageText, isHtml);
        } else if (
            messageText.includes("Preparing to send") ||
            messageText.includes("Sending") ||
            messageText.includes("Queued") ||
            messageText.includes("Processing") ||
            messageText.includes("Resuming")
        ) {
            // Message indicates active processing, start animation
            startProcessingAnimation(messageText, isHtml);
        } else {
            // No active processing, stop animation and display normal message
            stopProcessingAnimation();

            if (isHtml) {
                elements.messageDisplay.innerHTML = messageText;
            } else {
                // Format plain text with line breaks
                const formattedText = messageText.replace(/\n/g, "<br>");
                elements.messageDisplay.innerHTML = formattedText;
            }
        }

        // Ensure the message display is scrolled to the bottom
        elements.messageDisplay.scrollTop =
            elements.messageDisplay.scrollHeight;
    }

    /**
     * Starts the processing animation in the message display
     * @param {string} baseMessage - The base message to display with animation
     * @param {boolean} [isHtml=false] - Whether the message contains HTML
     */
    function startProcessingAnimation(baseMessage, isHtml = false) {
        // Stop any existing animation first
        stopProcessingAnimation();

        // Store the original message without animation
        state.originalMessage = baseMessage;
        state.messageIsHtml = isHtml;

        // Initialize animation frame if not already set
        if (state.animationFrame === undefined) {
            state.animationFrame = 0;
        }

        // Start the animation interval
        state.animationInterval = setInterval(() => {
            // Toggle between animation frames
            state.animationFrame =
                (state.animationFrame + 1) %
                CONFIG.UI.ANIMATION.ANIMATION_FRAMES.length;

            // Get current animation frame
            const animationIcon =
                CONFIG.UI.ANIMATION.ANIMATION_FRAMES[state.animationFrame];

            // Format the message with animation frame
            let displayMessage = `${animationIcon} ${state.originalMessage}`;

            // Update the message display
            if (state.messageIsHtml) {
                elements.messageDisplay.innerHTML = displayMessage;
            } else {
                const formattedText = displayMessage.replace(/\n/g, "<br>");
                elements.messageDisplay.innerHTML = formattedText;
            }

            // Ensure the message display is scrolled to the bottom
            elements.messageDisplay.scrollTop =
                elements.messageDisplay.scrollHeight;
        }, CONFIG.UI.ANIMATION.ANIMATION_INTERVAL);
    }

    /**
     * Stops the processing animation
     */
    function stopProcessingAnimation() {
        if (state.animationInterval) {
            clearInterval(state.animationInterval);
            state.animationInterval = null;
        }

        // If there was an original message, restore it without the animation
        if (state.originalMessage) {
            if (state.messageIsHtml) {
                elements.messageDisplay.innerHTML = state.originalMessage;
            } else {
                const formattedText = state.originalMessage.replace(
                    /\n/g,
                    "<br>",
                );
                elements.messageDisplay.innerHTML = formattedText;
            }
        }
    }

    /**
     * Gets the current selected file object
     * @returns {File|null} The selected file or null if none selected
     */
    function getSelectedFile() {
        return elements.fileInput.files[0] || null;
    }

    /**
     * Gets the API URL from input field
     * @returns {string} The API URL
     */
    function getApiUrl() {
        return elements.apiUrlInput.value.trim();
    }

    /**
     * Updates the API status indicator and message
     * @param {string} status - The status ('checking', 'available', 'unavailable')
     * @param {string} [errorMessage] - Optional error message for unavailable status
     * @param {string} [queueInfo] - Optional queue information when API is available
     */
    function updateApiStatus(status, errorMessage, queueInfo) {
        // Update state
        state.apiStatus = status;

        // Clear existing classes
        elements.apiStatusIndicator.classList.remove(
            "available",
            "unavailable",
            "checking",
        );

        // Update indicator and message based on status
        switch (status) {
            case CONFIG.STATUS.API_CHECKING:
                elements.apiStatusIndicator.classList.add("checking");
                elements.apiStatusMessage.textContent =
                    "Checking API availability...";
                break;

            case CONFIG.STATUS.API_AVAILABLE:
                elements.apiStatusIndicator.classList.add("available");
                elements.apiStatusMessage.textContent = queueInfo
                    ? `API is accessible - ${queueInfo}`
                    : "API is accessible";
                elements.apiStatusMessage.setAttribute(
                    "title",
                    `Last checked: ${new Date().toLocaleTimeString()}`,
                );
                break;

            case CONFIG.STATUS.API_UNAVAILABLE:
                elements.apiStatusIndicator.classList.add("unavailable");
                elements.apiStatusMessage.textContent = errorMessage
                    ? `Server not accessible: ${errorMessage}`
                    : "Server not accessible";
                elements.apiStatusMessage.setAttribute(
                    "title",
                    `Last checked: ${new Date().toLocaleTimeString()}`,
                );
                break;

            default:
                elements.apiStatusMessage.textContent = "";
        }
    }

    /**
     * Shows the download button when a transcription is complete
     * @param {string} jobId - The completed job ID
     * @param {string} resultUrl - The URL to download the transcription from
     */
    function showDownloadButton(jobId, resultUrl) {
        // Stop processing animation since job is complete
        stopProcessingAnimation();

        // Store in state for reference
        state.transcriptionComplete = true;
        state.currentJobId = jobId;
        state.resultUrl = resultUrl;
        state.transcribing = true; // Keep the transcribe button hidden

        // Create a container for the download section if not exists
        let downloadSection = document.getElementById("download-section");
        if (!downloadSection) {
            downloadSection = document.createElement("div");
            downloadSection.id = "download-section";
            downloadSection.className = "download-section";
            elements.messageDisplay.insertAdjacentElement(
                "afterend",
                downloadSection,
            );
        } else {
            // Clear existing content
            downloadSection.innerHTML = "";
        }

        // Add a success message
        const statusMessage = document.createElement("div");
        statusMessage.className = "transcription-status success";
        statusMessage.textContent = "Transcription available";
        downloadSection.appendChild(statusMessage);

        // Create download button
        const downloadButton = document.createElement("button");
        downloadButton.id = "download-transcription";
        downloadButton.className = "download-button";
        downloadButton.textContent = "Download Transcription";
        downloadSection.appendChild(downloadButton);

        // Format selector removed as requested

        // Add event listener for download button
        downloadButton.addEventListener("click", () => {
            // Call API to download with default format
            if (api && api.downloadTranscription) {
                api.downloadTranscription(jobId);
            }
        });
    }

    /**
     * Shows an error message when transcription fails
     * @param {string} errorMessage - The error message to display
     */
    function showTranscriptionError(errorMessage) {
        // Stop any running animation
        stopProcessingAnimation();

        // Update state
        state.transcriptionComplete = false;
        state.currentJobId = null;
        state.resultUrl = null;
        state.transcribing = false; // Re-enable the transcribe button

        // Create a container for the status section if not exists
        let statusSection = document.getElementById("download-section");
        if (!statusSection) {
            statusSection = document.createElement("div");
            statusSection.id = "download-section";
            statusSection.className = "download-section";
            elements.messageDisplay.insertAdjacentElement(
                "afterend",
                statusSection,
            );
        } else {
            // Clear existing content
            statusSection.innerHTML = "";
        }

        // Add an error message
        const statusMessage = document.createElement("div");
        statusMessage.className = "transcription-status error";
        statusMessage.textContent = "Transcription failed";
        statusSection.appendChild(statusMessage);

        // Add detailed error message
        const errorDetail = document.createElement("div");
        errorDetail.className = "error-detail";
        errorDetail.textContent = errorMessage;
        statusSection.appendChild(errorDetail);

        // Update UI to show transcribe button again
        updateTranscriptionUI();
    }

    /**
     * Resets the entire UI to initial state
     * Called after successful download to clean up the UI
     */
    function removeTranscriptionArea() {
        // Reset all state variables
        state.transcriptionComplete = false;
        state.currentJobId = null;
        state.resultUrl = null;
        state.transcribing = false;
        state.fileSelected = false;
        state.currentFileName = null;
        state.status = CONFIG.STATUS.UI_RESET;

        // Reset the file input value
        if (elements.fileInput) {
            elements.fileInput.value = "";
        }

        // Reset the selected file display
        if (elements.selectedFileDisplay) {
            elements.selectedFileDisplay.textContent = "No file selected";
        }

        // Find and animate the download section before removing
        const downloadSection = document.getElementById("download-section");
        if (downloadSection) {
            // Add removing class to trigger animation
            downloadSection.classList.add("removing");

            // Remove after animation completes
            setTimeout(() => {
                downloadSection.remove();

                // Update message to return to initial state
                updateMessage(CONFIG.UI.INITIAL_MESSAGE);

                // Update UI to reset transcribe button visibility
                updateTranscriptionUI();
            }, 500); // Match animation duration from CSS
        } else {
            // Update message immediately if section doesn't exist
            updateMessage(CONFIG.UI.INITIAL_MESSAGE);

            // Update UI to reset transcribe button visibility
            updateTranscriptionUI();
        }
    }

    /**
     * Formats time in seconds to a readable timecode format
     * @param {number} timeInSeconds - Time in seconds
     * @returns {string} Formatted timecode (MM:SS.ms)
     */
    function formatTimeCode(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
    }

    /**
     * Resets the transcribing state to enable the transcribe button again
     * Used when errors occur or transcription process is cancelled
     */
    function resetTranscribing() {
        state.transcribing = false;
        stopProcessingAnimation();
        updateTranscriptionUI();
    }

    // Public methods
    return {
        init: init,
        updateMessage: updateMessage,
        getApiUrl: getApiUrl,
        getSelectedFile: getSelectedFile,
        updateApiStatus: updateApiStatus,
        showDownloadButton: showDownloadButton,
        showTranscriptionError: showTranscriptionError,
        removeTranscriptionArea: removeTranscriptionArea,
        resetTranscribing: resetTranscribing,
        updateTranscriptionUI: updateTranscriptionUI,
    };
})();

// Make UI available globally
window.UI = UI;

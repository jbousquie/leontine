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
            copyResultButton: document.createElement("button"),

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
        if (state.fileSelected) {
            elements.transcribeButton.style.display = "block";
            elements.messageDisplay.textContent =
                "Ready to transcribe. Click the button to start.";
        } else {
            elements.transcribeButton.style.display = "none";
            elements.messageDisplay.textContent =
                "Select a file to start transcription";
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

        if (isHtml) {
            elements.messageDisplay.innerHTML = messageText;
        } else {
            // Format plain text with line breaks
            const formattedText = messageText.replace(/\n/g, "<br>");
            elements.messageDisplay.innerHTML = formattedText;
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
     * Displays structured transcription results
     * @param {Object} results - The transcription results object
     */
    function displayTranscriptionResults(results) {
        if (!results) {
            updateMessage("No transcription results available.");
            return;
        }

        // Create a formatted HTML display of the transcription
        let resultHtml = '<div class="transcription-result">';

        // Add full text
        if (results.text) {
            resultHtml += `<div class="full-text">${results.text.replace(/\n/g, "<br>")}</div>`;
        }

        // Add language if available
        if (results.language) {
            resultHtml += `<div class="language"><strong>Language:</strong> ${results.language}</div>`;
        }

        // Add segments if available
        if (results.segments && results.segments.length > 0) {
            resultHtml += "<h3>Segments</h3>";
            results.segments.forEach((segment, index) => {
                const startTime = formatTimeCode(segment.start);
                const endTime = formatTimeCode(segment.end);
                resultHtml += `
                <div class="segment">
                    <span class="timestamp">[${startTime} → ${endTime}]</span>
                    <span class="segment-text">${segment.text}</span>
                </div>`;
            });
        }

        resultHtml += "</div>";

        // Add copy button
        resultHtml +=
            '<button class="copy-button" id="copy-transcription">Copy Transcription</button>';

        // Update message with HTML
        updateMessage(resultHtml, true);

        // Add event listener for copy button
        setTimeout(() => {
            const copyButton = document.getElementById("copy-transcription");
            if (copyButton) {
                copyButton.addEventListener("click", () => {
                    navigator.clipboard
                        .writeText(results.text)
                        .then(() => {
                            copyButton.textContent = "Copied!";
                            setTimeout(() => {
                                copyButton.textContent = "Copy Transcription";
                            }, 2000);
                        })
                        .catch((err) => {
                            console.error("Failed to copy text: ", err);
                            copyButton.textContent = "Copy failed";
                        });
                });
            }
        }, 100);
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

    // Public methods
    return {
        init: init,
        updateMessage: updateMessage,
        getSelectedFile: getSelectedFile,
        getApiUrl: getApiUrl,
        updateApiStatus: updateApiStatus,
        displayTranscriptionResults: displayTranscriptionResults,
    };
})();

// Make UI available globally
window.UI = UI;

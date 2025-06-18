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
            localStorage.setItem("leontine_api_url", url);

            // Show success message
            elements.apiUrlValidation.textContent =
                "API URL saved successfully!";
            elements.apiUrlValidation.style.color = "#4CAF50"; // Green color

            // Reset message color after a delay
            setTimeout(() => {
                elements.apiUrlValidation.style.color = "#d32f2f"; // Reset to default error color
                elements.apiUrlValidation.textContent = "";
            }, 3000);
        } catch (e) {
            elements.apiUrlValidation.textContent =
                "Error saving API URL. Please try again.";
        }
    }

    /**
     * Loads saved API URL from localStorage
     */
    function loadSavedApiUrl() {
        const savedUrl = localStorage.getItem("leontine_api_url");

        if (savedUrl) {
            elements.apiUrlInput.value = savedUrl;
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
     * @param {string} message - The message to display
     */
    function updateMessage(message) {
        elements.messageDisplay.textContent = message;
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

    // Public methods
    return {
        init: init,
        updateMessage: updateMessage,
        getSelectedFile: getSelectedFile,
        getApiUrl: getApiUrl,
    };
})();

// Make UI available globally
window.UI = UI;

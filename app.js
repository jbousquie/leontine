// app.js - Main application logic for Leontine

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const apiUrlInput = document.getElementById("api-url");
    const saveApiUrlButton = document.getElementById("save-api-url");
    const apiUrlValidation = document.getElementById("api-url-validation");
    const fileInput = document.getElementById("audio-file-input");
    const fileSelectButton = document.getElementById("file-select-button");
    const selectedFileDisplay = document.getElementById(
        "selected-file-display",
    );
    const transcribeButton = document.getElementById("transcribe-button");
    const messageDisplay = document.getElementById("message-display");

    // Constants
    const STORAGE_KEY_API_URL = "leontine_api_url";

    // Load saved API URL from localStorage if available
    loadSavedApiUrl();

    // Event listeners
    apiUrlInput.addEventListener("input", validateApiUrl);
    saveApiUrlButton.addEventListener("click", saveApiUrl);
    fileSelectButton.addEventListener("click", triggerFileSelect);
    fileInput.addEventListener("change", handleFileSelect);
    transcribeButton.addEventListener("click", handleTranscribe);

    /**
     * Validates the API URL
     * Shows validation message if URL is invalid
     */
    function validateApiUrl() {
        const url = apiUrlInput.value.trim();

        if (!url) {
            apiUrlValidation.textContent = "Please enter an API URL";
            return false;
        }

        try {
            // Check if it's a valid URL
            new URL(url);

            // Clear validation message
            apiUrlValidation.textContent = "";
            return true;
        } catch (e) {
            apiUrlValidation.textContent = "Please enter a valid URL";
            return false;
        }
    }

    /**
     * Saves the API URL to localStorage
     */
    function saveApiUrl() {
        // First validate the URL
        if (!validateApiUrl()) return;

        const url = apiUrlInput.value.trim();

        try {
            // Save to localStorage
            localStorage.setItem(STORAGE_KEY_API_URL, url);

            // Show success message
            apiUrlValidation.textContent = "API URL saved successfully!";
            apiUrlValidation.style.color = "#4CAF50"; // Green color

            // Reset message color after a delay
            setTimeout(() => {
                apiUrlValidation.style.color = "#d32f2f"; // Reset to default error color
                apiUrlValidation.textContent = "";
            }, 3000);
        } catch (e) {
            apiUrlValidation.textContent =
                "Error saving API URL. Please try again.";
        }
    }

    /**
     * Loads saved API URL from localStorage
     */
    function loadSavedApiUrl() {
        const savedUrl = localStorage.getItem(STORAGE_KEY_API_URL);

        if (savedUrl) {
            apiUrlInput.value = savedUrl;
        }
    }

    /**
     * Opens the file selector when the select button is clicked
     */
    function triggerFileSelect() {
        fileInput.click();
    }

    /**
     * Handles the file selection from the file input
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];

        if (file) {
            // Display the selected file name
            selectedFileDisplay.textContent = file.name;
            // Show the transcribe button
            transcribeButton.style.display = "block";
            // Update the message display
            messageDisplay.textContent =
                "Ready to transcribe. Click the button to start.";
        } else {
            // Reset the display if no file is selected
            selectedFileDisplay.textContent = "No file selected";
            // Hide the transcribe button
            transcribeButton.style.display = "none";
            // Reset the message display
            messageDisplay.textContent = "Select a file to start transcription";
        }
    }
    /**
     * Handles the transcribe button click
     * Currently just updates the message zone - no actual transcription yet
     */
    function handleTranscribe() {
        // Update message display to simulate process
        messageDisplay.textContent =
            "Transcription would start here...\nWaiting for implementation of API connection.";
    }
});

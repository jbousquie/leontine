/**
 * ui.js - UI Element Cache for Leontine
 * This module's sole responsibility is to cache references to DOM elements
 * that are present in the initial HTML. This provides a single, performant
 * way for the main application to access these elements.
 */

// Private variable within the module scope to hold cached elements
let elements = {};

/**
 * Caches DOM elements for better performance and centralized access.
 * This is a private function within the module.
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
        selectedFileDisplay: document.getElementById("selected-file-display"),

        // Processing indicator
        processingIndicator: document.getElementById("processing-indicator"),

        // Transcription elements
        transcribeButton: document.getElementById("transcribe-button"),
        messageDisplay: document.getElementById("message-display"),

        // API status elements
        apiStatusIndicator: document.getElementById("api-status-indicator"),
        apiStatusMessage: document.getElementById("api-status-message"),
    };
    console.log("UI elements cached.");
}

/**
 * The UI object encapsulates methods for interacting with the UI elements.
 */
export const UI = {
    /**
     * Initializes the UI module by caching elements.
     */
    init() {
        cacheElements();
    },

    /**
     * Returns the cached DOM elements.
     * @returns {object} The object containing cached DOM elements.
     */
    getElements() {
        return elements;
    },
};

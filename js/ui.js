/**
 * ui.js - UI Element Cache for Leontine
 * This module's sole responsibility is to cache references to DOM elements
 * that are present in the initial HTML. This provides a single, performant
 * way for the main application to access these elements.
 */
const UI = (function () {
    // DOM Elements cache
    let elements = {};

    /**
     * Caches DOM elements for better performance and centralized access.
     * Note: Dynamically created elements (like the download/error section) are not
     * cached here; they will be managed by the main `render` function.
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

            // Processing indicator
            processingIndicator: document.getElementById(
                "processing-indicator",
            ),

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
     * Initializes the UI module by caching elements.
     */
    function init() {
        cacheElements();
    }

    /**
     * Returns the cached DOM elements.
     * @returns {object} The object containing cached DOM elements.
     */
    function getElements() {
        return elements;
    }

    // --- Public API ---
    return {
        init,
        getElements,
    };
})();

// Expose the UI module to the global scope so main.js can access it
window.UI = UI;

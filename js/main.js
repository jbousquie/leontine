/**
 * main.js - Main entry point for Leontine application
 * Initializes and coordinates UI and API modules
 */

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing Leontine application...");

    // Check if configuration is loaded
    if (typeof CONFIG === "undefined") {
        console.error(
            "Configuration not loaded! Make sure conf.js is included before other scripts.",
        );
        return;
    }

    // Initialize modules with cross-references
    UI.init(API);
    API.init(UI);

    console.log("Application initialization complete.");
});

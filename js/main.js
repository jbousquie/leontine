/**
 * main.js - Main entry point for Leontine application
 * Initializes and coordinates UI and API modules
 */

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing Leontine application...");

    // Initialize modules with cross-references
    UI.init(API);
    API.init(UI);

    console.log("Application initialization complete.");
});

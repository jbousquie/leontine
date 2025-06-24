/**
 * conf.js - Configuration constants for Leontine application
 * Centralizes all constants used throughout the application
 */

const CONFIG = {
    // API URLs and endpoints
    API_ENDPOINTS: {
        TEST: "/transcription/00", // Endpoint for API availability test
        SUBMIT: "/transcription", // Endpoint to submit a new transcription job
        STATUS: "/transcription/{job_id}", // Endpoint to check status (replace {job_id})
        RESULT: "/transcription/{job_id}/result", // Endpoint to get results (replace {job_id})
        CANCEL: "/transcription/{job_id}/cancel", // Endpoint to cancel job (replace {job_id})
    },

    // Timing intervals
    INTERVALS: {
        STATUS_CHECK_INTERVAL: 20000, // Interval to check job status (20 seconds in milliseconds)
        API_CHECK_INTERVAL: 30000, // Interval to check API availability (30 seconds in milliseconds)
        RESET_DELAY: 2000, // Delay before resetting UI after download (2 seconds)
    },

    // LocalStorage keys
    STORAGE_KEYS: {
        API_URL: "leontine_api_url",
    },

    // Status constants
    STATUS: {
        // Job status values
        JOB_QUEUED: "Queued",
        JOB_PROCESSING: "Processing",
        JOB_COMPLETED: "Completed",
        JOB_FAILED: "Failed",

        // UI state status values
        UI_IDLE: "idle",
        UI_SENDING: "sending",
        UI_ERROR: "error",
        UI_TRANSCRIPTION_COMPLETE: "transcription_complete",
        UI_TRANSCRIPTION_FAILED: "transcription_failed",
        UI_DOWNLOADING: "downloading",
        UI_CLEANUP: "cleanup",
        UI_RESET: "reset",
        UI_INITIAL: "initial",

        // API availability status values
        API_CHECKING: "checking",
        API_AVAILABLE: "available",
        API_UNAVAILABLE: "unavailable",
    },

    // UI Constants
    UI: {
        SUCCESS_MESSAGE_TIMEOUT: 3000, // How long to show success messages (3 seconds)
        ERROR_COLOR: "#d32f2f",
        SUCCESS_COLOR: "#4CAF50",
        INITIAL_MESSAGE: "Select a file to start transcription",
    },
};

// Make configuration available globally
window.CONFIG = CONFIG;

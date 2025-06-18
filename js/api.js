/**
 * api.js - API communication functionality for Leontine
 * Handles all interactions with the WhisperX API
 */

// API Controller module
const API = (function () {
    // Current transcription job state
    let currentJob = {
        jobId: null,
        file: null,
        status: null, // 'idle', 'sending', 'processing', 'completed', 'error'
    };

    // Reference to external modules
    let ui;

    /**
     * Initializes the API module
     * @param {Object} uiModule - Reference to the UI module
     */
    function init(uiModule) {
        // Store reference to UI module
        ui = uiModule;
    }

    /**
     * Handles a transcription request directly from UI
     * @param {File} file - The audio file to transcribe
     */
    function handleTranscription(file) {
        if (!file) {
            ui.updateMessage("Error: No file selected");
            return;
        }

        // Get the API URL
        const apiUrl = ui.getApiUrl();

        if (!apiUrl) {
            ui.updateMessage("Error: API URL not configured");
            return;
        }

        // Update UI with request preparation message
        ui.updateMessage(`Preparing to send ${file.name} for transcription...`);

        // Store current job info
        currentJob = {
            jobId: null,
            file: file,
            status: "sending",
        };

        // In a real implementation, this would call the API
        // For now, we'll just simulate the API call with a timeout
        simulateApiRequest(apiUrl, file);
    }

    /**
     * Simulates an API request (to be replaced with actual API calls)
     * @param {string} apiUrl - The API URL to send the request to
     * @param {File} file - The audio file to be transcribed
     */
    function simulateApiRequest(apiUrl, file) {
        // Update message to show we're "sending"
        ui.updateMessage(
            `Sending ${file.name} to ${apiUrl}...\nThis is a simulation, no actual API call is made yet.`,
        );

        // Simulate network delay
        setTimeout(() => {
            // Generate a fake job ID
            const jobId = "job_" + Math.random().toString(36).substring(2, 10);

            // Update current job
            currentJob.jobId = jobId;
            currentJob.status = "processing";

            // Update UI
            ui.updateMessage(
                `File submitted successfully!\nJob ID: ${jobId}\nWaiting for processing to complete...`,
            );

            // Simulate checking status
            simulateStatusCheck(jobId);
        }, 1500);
    }

    /**
     * Simulates periodic status checks of a transcription job
     * @param {string} jobId - The simulated job ID
     */
    function simulateStatusCheck(jobId) {
        // Initial queue position
        let queuePosition = 2;

        // Status check interval
        const statusInterval = setInterval(() => {
            // Simulate progress
            if (queuePosition > 0) {
                queuePosition--;
                ui.updateMessage(
                    `Job ID: ${jobId}\nStatus: In queue\nPosition: ${queuePosition}`,
                );
            } else {
                // "Processing" phase after queue
                clearInterval(statusInterval);
                ui.updateMessage(
                    `Job ID: ${jobId}\nStatus: Processing\nEstimated time remaining: calculating...`,
                );

                // Simulate completion after some time
                setTimeout(() => {
                    currentJob.status = "completed";
                    ui.updateMessage(
                        `Job ID: ${jobId}\nStatus: Completed\n\nTranscription (simulated result):\n` +
                            `"This is where the actual transcription text would appear. ` +
                            `The WhisperX API would return the transcribed content of your audio file, ` +
                            `potentially with timestamps and speaker identification if enabled."`,
                    );
                }, 3000);
            }
        }, 1500);
    }

    /**
     * Cancels the current transcription job
     * @returns {boolean} Whether cancellation was successful
     */
    function cancelTranscription() {
        if (!currentJob.jobId) {
            return false;
        }

        // In a real implementation, would call the cancel API endpoint

        // Reset current job
        currentJob = {
            jobId: null,
            file: null,
            status: "idle",
        };

        // Update UI
        ui.updateMessage("Transcription job cancelled.");

        return true;
    }

    // Public methods
    return {
        init: init,
        handleTranscription: handleTranscription,
        cancelTranscription: cancelTranscription,
    };
})();

// Make API available globally
window.API = API;

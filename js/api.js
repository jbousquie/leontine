/**
 * api.js - API communication functionality for Leontine
 * Handles all interactions with the WhisperX API
 */

// API Controller module
const API = (function () {
    // API endpoints
    const API_ENDPOINTS = {
        TEST: "/transcription/00", // Endpoint for API availability test
        SUBMIT: "/transcription", // Endpoint to submit a new transcription job
        STATUS: "/transcription/{job_id}", // Endpoint to check status (replace {job_id})
        RESULT: "/transcription/{job_id}", // Endpoint to get results (replace {job_id})
        CANCEL: "/transcription/{job_id}", // Endpoint to cancel job (replace {job_id})
    };

    // Current transcription job state
    let currentJob = {
        jobId: null,
        file: null,
        status: null, // 'idle', 'sending', 'processing', 'completed', 'error'
    };

    // API status
    let apiStatus = {
        available: false,
        lastChecked: null,
        errorMessage: null,
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

        // Check API availability if URL is stored
        const apiUrl = ui.getApiUrl();
        if (apiUrl) {
            checkApiAvailability(apiUrl);
        }
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

    /**
     * Checks if the API is available by making a test request
     * @param {string} url - The API URL to check
     */
    function checkApiAvailability(url) {
        // Update UI to show checking status
        updateApiStatusUI("checking");

        // Make a request to a non-existent job to test the API
        // The API should return a 404, but that still means it's accessible
        fetch(`${url}${API_ENDPOINTS.TEST}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        })
            .then((response) => {
                // If we get any response (even 404), the API is available
                apiStatus.available = true;
                apiStatus.lastChecked = new Date();
                apiStatus.errorMessage = null;

                // Update UI to show available status
                updateApiStatusUI("available");
                return true;
            })
            .catch((error) => {
                // If we get a network error, the API is not available
                apiStatus.available = false;
                apiStatus.lastChecked = new Date();
                apiStatus.errorMessage = error.message;

                // Update UI to show unavailable status
                updateApiStatusUI("unavailable", error.message);
                return false;
            });
    }

    /**
     * Updates the UI to reflect the current API status
     * @param {string} status - The status to display ('checking', 'available', 'unavailable')
     * @param {string} [errorMessage] - Optional error message for unavailable status
     */
    function updateApiStatusUI(status, errorMessage) {
        // Call UI update method if available
        if (ui && ui.updateApiStatus) {
            ui.updateApiStatus(status, errorMessage);
        }
    }

    // Public methods
    return {
        init: init,
        handleTranscription: handleTranscription,
        cancelTranscription: cancelTranscription,
        checkApiAvailability: checkApiAvailability,
    };
})();

// Make API available globally
window.API = API;

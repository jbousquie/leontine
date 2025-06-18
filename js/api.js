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

        // Send file to the API
        sendTranscriptionRequest(apiUrl, file);
    }

    /**
     * Sends a transcription request to the API
     * @param {string} apiUrl - The API URL to send the request to
     * @param {File} file - The audio file to be transcribed
     */
    function sendTranscriptionRequest(apiUrl, file) {
        // Update message to show we're sending
        ui.updateMessage(`Sending ${file.name} to API...\nPlease wait...`);

        // Create FormData to send the file
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sync", "false"); // Request async mode

        // Send the POST request to the API
        fetch(`${apiUrl}${API_ENDPOINTS.SUBMIT}`, {
            method: "POST",
            body: formData,
        })
            .then((response) => {
                if (!response.ok) {
                    // If response is not ok, parse error message if available
                    return response
                        .json()
                        .then((errorData) => {
                            throw new Error(
                                errorData.error ||
                                    `Server error: ${response.status}`,
                            );
                        })
                        .catch((err) => {
                            // If can't parse JSON, use status text
                            throw new Error(
                                `Server error: ${response.status} ${response.statusText}`,
                            );
                        });
                }
                return response.json();
            })
            .then((data) => {
                // Handle successful response
                // Expected format: { job_id: "...", status_url: "..." }
                if (data.job_id) {
                    // Update current job info
                    currentJob.jobId = data.job_id;
                    currentJob.status = "queued";

                    // Update UI with success message
                    ui.updateMessage(
                        `File submitted successfully!\n` +
                            `Job ID: ${data.job_id}\n` +
                            `Status: Queued for processing\n\n` +
                            `Check the status URL for updates: ${data.status_url}`,
                    );
                } else {
                    throw new Error("Invalid response: Missing job_id");
                }
            })
            .catch((error) => {
                // Handle errors
                currentJob.status = "error";
                ui.updateMessage(`Error submitting file: ${error.message}`);
            });
    }

    // Note: Status checking will be implemented in a future step

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

/**
 * api.js - API communication functionality for Leontine
 * Handles all interactions with the WhisperX API
 */

// API Controller module
const API = (function () {
    // Configuration is now imported from conf.js

    // Current transcription job state
    let currentJob = {
        jobId: null,
        file: null,
        status: null, // 'idle', 'sending', 'queued', 'processing', 'completed', 'error'
        statusCheckInterval: null, // Interval ID for status checking
        lastUpdated: null, // Timestamp of last status update
    };

    // API status
    let apiStatus = {
        available: false,
        lastChecked: null,
        errorMessage: null,
        checkInterval: null, // Interval ID for periodic API checking
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
            // Initial check
            checkApiAvailability(apiUrl);

            // Start periodic checking
            startPeriodicApiCheck(apiUrl);
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
            statusCheckInterval: null,
            lastUpdated: null,
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
        fetch(`${apiUrl}${CONFIG.API_ENDPOINTS.SUBMIT}`, {
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
                    currentJob.status = CONFIG.STATUS.JOB_QUEUED;
                    currentJob.lastUpdated = new Date();

                    // Update UI with success message
                    ui.updateMessage(
                        `File submitted successfully!\n` +
                            `Job ID: ${data.job_id}\n` +
                            `Status: Queued for processing\n` +
                            `Status URL: ${data.status_url || apiUrl + API_ENDPOINTS.STATUS.replace("{job_id}", data.job_id)}\n` +
                            `Last updated: ${formatTime(currentJob.lastUpdated)}`,
                    );

                    // Start polling for status updates
                    startStatusChecking(apiUrl, data.job_id);
                } else {
                    throw new Error("Invalid response: Missing job_id");
                }
            })
            .catch((error) => {
                // Handle errors
                currentJob.status = CONFIG.STATUS.UI_SENDING;
                ui.updateMessage(`Error submitting file: ${error.message}`);
            });
    }

    /**
     * Starts periodic status checking for a transcription job
     * @param {string} apiUrl - Base API URL
     * @param {string} jobId - The job ID to check
     */
    function startStatusChecking(apiUrl, jobId) {
        // Clear any existing interval
        stopStatusChecking();

        // Set up interval for status checking
        currentJob.statusCheckInterval = setInterval(() => {
            checkJobStatus(apiUrl, jobId);
        }, CONFIG.INTERVALS.STATUS_CHECK_INTERVAL);

        // Do an immediate check
        checkJobStatus(apiUrl, jobId);
    }

    /**
     * Stops the periodic status checking
     */
    function stopStatusChecking() {
        if (currentJob.statusCheckInterval) {
            clearInterval(currentJob.statusCheckInterval);
            currentJob.statusCheckInterval = null;
        }
    }

    /**
     * Checks the status of a transcription job
     * @param {string} apiUrl - Base API URL
     * @param {string} jobId - The job ID to check
     */
    function checkJobStatus(apiUrl, jobId) {
        // Replace the job_id placeholder in the endpoint
        const statusEndpoint = CONFIG.API_ENDPOINTS.STATUS.replace(
            "{job_id}",
            jobId,
        );

        fetch(`${apiUrl}${statusEndpoint}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        })
            .then((response) => {
                // Handle different response status codes
                if (response.status === 404) {
                    // Job not found (no longer in queue)
                    stopStatusChecking();
                    throw new Error("Job not found or no longer in the queue");
                } else if (response.status >= 500) {
                    // Server error, but continue polling
                    throw new Error(
                        `Server temporarily unavailable (${response.status}). Will retry in ${CONFIG.STATUS_CHECK_INTERVAL / 1000} seconds.`,
                    );
                } else if (!response.ok) {
                    // Other errors - stop polling
                    stopStatusChecking();
                    throw new Error(
                        `Status check failed: ${response.status} ${response.statusText}`,
                    );
                }
                return response.json();
            })
            .then((data) => {
                // Data received from API
                console.log("Status response:", data);

                // Debug information for troubleshooting status display
                console.log("Status type:", typeof data.status);
                console.log("Status value:", data.status);

                // Process response data and extract relevant information
                const processedData = {
                    status: "",
                    queuePosition: null,
                    data: null,
                    result: null,
                };

                // Parse status based on various possible formats
                if (data.status) {
                    // Handle different types of status values
                    if (typeof data.status === "string") {
                        // String status - use directly
                        processedData.status = data.status;
                    } else if (typeof data.status === "object") {
                        // Object status - extract nested values
                        if (data.status.status) {
                            processedData.status = data.status.status;
                        } else if (data.status.state) {
                            processedData.status = data.status.state;
                        } else {
                            // If no clear property, stringify but remove brackets
                            const stringified = JSON.stringify(data.status);
                            processedData.status = stringified
                                .replace(/[{}]/g, "")
                                .trim();
                        }
                    } else {
                        // For any other type, convert to string
                        processedData.status = String(data.status);
                    }

                    // Processing status is just shown as is
                    // Keep the original status - no need for special handling
                }

                // Extract queue position if available (only included when status is "Queued")
                if (data.queue_position !== undefined) {
                    processedData.queuePosition =
                        typeof data.queue_position === "object"
                            ? JSON.stringify(data.queue_position)
                            : String(data.queue_position);
                }

                // Store additional data if present
                if (data.data) {
                    processedData.data = data.data;
                }

                // Update current job with processed status
                currentJob.status = processedData.status;
                currentJob.lastUpdated = new Date();

                // Construct status message
                let statusMessage =
                    `Job ID: ${jobId}\n` +
                    `Status: ${processedData.status || "Unknown"}\n` +
                    `Last updated: ${formatTime(currentJob.lastUpdated)}`;

                // Add queue position if available
                if (processedData.queuePosition !== null) {
                    statusMessage += `\nQueue position: ${processedData.queuePosition}`;
                }

                // Update UI
                ui.updateMessage(statusMessage);

                // Check if job is completed or failed - we keep polling for processing
                if (
                    processedData.status === CONFIG.STATUS.JOB_COMPLETED ||
                    processedData.status === CONFIG.STATUS.JOB_FAILED
                ) {
                    stopStatusChecking();

                    // If completed, show additional info
                    if (
                        processedData.status === "completed" ||
                        processedData.status === "Completed"
                    ) {
                        // Show completion message
                        const completionMessage =
                            "Transcription is complete. Results are available.";

                        // Add result endpoint URL and a message with an option to view results
                        const resultUrl =
                            apiUrl +
                            CONFIG.API_ENDPOINTS.RESULT.replace(
                                "{job_id}",
                                jobId,
                            );
                        const resultMessage =
                            completionMessage +
                            "\nResults available at: " +
                            resultUrl +
                            "\n\nRetrieving transcription results...";

                        ui.updateMessage(
                            statusMessage + "\n\n" + resultMessage,
                        );

                        // Automatically fetch results after a short delay
                        setTimeout(() => {
                            getTranscriptionResults(jobId);
                        }, 1000);
                    } else if (
                        processedData.status === CONFIG.STATUS.JOB_FAILED
                    ) {
                        // Show detailed error information if available
                        let failureMessage = "Transcription failed.";
                        if (processedData.data) {
                            failureMessage +=
                                "\nReason: " +
                                (typeof processedData.data === "string"
                                    ? processedData.data
                                    : JSON.stringify(processedData.data));
                        }

                        ui.updateMessage(
                            statusMessage + "\n\n" + failureMessage,
                        );
                    }
                }
            })
            .catch((error) => {
                // If error contains "temporarily unavailable", the polling continues
                // Otherwise, it has already been stopped if needed
                const errorPrefix = error.message.includes(
                    "temporarily unavailable",
                )
                    ? "Warning"
                    : "Error";

                ui.updateMessage(
                    `${errorPrefix}: ${error.message}\n` +
                        `Last successful update: ${
                            currentJob.lastUpdated
                                ? formatTime(currentJob.lastUpdated)
                                : "None"
                        }`,
                );
            });
    }

    /**
     * Formats a date object as a readable time string
     * @param {Date} date - The date to format
     * @returns {string} Formatted time string
     */
    function formatTime(date) {
        if (!date) return "Unknown";
        return date.toLocaleTimeString();
    }

    /**
     * Cancels the current transcription job
     * @returns {boolean} Whether cancellation was successful
     */
    function cancelTranscription() {
        if (!currentJob.jobId) {
            return false;
        }

        // Stop status checking
        stopStatusChecking();

        // Get the API URL
        const apiUrl = ui.getApiUrl();

        if (!apiUrl) {
            ui.updateMessage("Error: API URL not configured");
            return false;
        }

        // Replace the job_id placeholder in the endpoint
        const cancelEndpoint = CONFIG.API_ENDPOINTS.CANCEL.replace(
            "{job_id}",
            currentJob.jobId,
        );

        // Update UI
        ui.updateMessage(`Cancelling job ${currentJob.jobId}...`);

        // Call the cancel API endpoint
        fetch(`${apiUrl}${cancelEndpoint}`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Cancel failed: ${response.status} ${response.statusText}`,
                    );
                }
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    // Reset current job
                    currentJob = {
                        jobId: null,
                        file: null,
                        status: CONFIG.STATUS.UI_IDLE,
                        statusCheckInterval: null,
                        lastUpdated: null,
                    };

                    // Update UI with success message
                    ui.updateMessage(
                        `Transcription job cancelled: ${data.message || "Job successfully cancelled"}`,
                    );
                    return true;
                } else {
                    throw new Error(data.error || "Failed to cancel job");
                }
            })
            .catch((error) => {
                // Update UI with error message
                ui.updateMessage(`Error cancelling job: ${error.message}`);
                return false;
            });

        return true; // Return true to indicate cancellation request was sent
    }

    /**
     * Checks if the API is available by making a test request
     * @param {string} url - The API URL to check
     * @returns {Promise<boolean>} - Promise resolving to API availability
     */
    function checkApiAvailability(url) {
        if (!url) return Promise.resolve(false);

        // Update UI to show checking status
        updateApiStatusUI(CONFIG.STATUS.API_CHECKING);

        // Make a request to a non-existent job to test the API
        // The API should return a 404, but that still means it's accessible
        return fetch(`${url}${CONFIG.API_ENDPOINTS.TEST}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        })
            .then((response) => {
                // Only consider the API available if we get a 404 response
                // This ensures we're talking to the actual API and not a proxy
                if (response.status === 404) {
                    apiStatus.available = true;
                    apiStatus.lastChecked = new Date();
                    apiStatus.errorMessage = null;

                    // Update UI to show available status
                    updateApiStatusUI(CONFIG.STATUS.API_AVAILABLE);
                    return true;
                } else {
                    // Any other response suggests we're not reaching the actual API
                    throw new Error(`Unexpected response (${response.status})`);
                }
            })
            .catch((error) => {
                // If we get a network error, the API is not available
                apiStatus.available = false;
                apiStatus.lastChecked = new Date();
                apiStatus.errorMessage = error.message;

                // Update UI to show unavailable status
                updateApiStatusUI(CONFIG.STATUS.API_UNAVAILABLE, error.message);
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

    /**
     * Retrieves transcription results for a completed job
     * @param {string} jobId - The job ID to fetch results for
     * @returns {Promise} - Promise resolving to transcription results
     */
    function getTranscriptionResults(jobId) {
        // Get the API URL
        const apiUrl = ui.getApiUrl();
        if (!apiUrl || !jobId) {
            ui.updateMessage("Error: API URL or Job ID not available");
            return Promise.reject(new Error("API URL or Job ID not available"));
        }

        // Update UI
        ui.updateMessage(`Retrieving results for job ${jobId}...`);

        // Replace the job_id placeholder in the endpoint
        const resultEndpoint = API_ENDPOINTS.RESULT.replace("{job_id}", jobId);

        // Fetch the results
        return fetch(`${apiUrl}${resultEndpoint}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `Failed to retrieve results: ${response.status} ${response.statusText}`,
                    );
                }
                return response.json();
            })
            .then((data) => {
                // Use the enhanced UI display method for results
                ui.displayTranscriptionResults(data);

                // Return the data for further processing if needed
                return data;
            })
            .catch((error) => {
                ui.updateMessage(`Error retrieving results: ${error.message}`);
                return Promise.reject(error);
            });
    }

    /**
     * Formats time in seconds to a readable timecode format
     * @param {number} timeInSeconds - Time in seconds
     * @returns {string} Formatted timecode (MM:SS.ms)
     */
    function formatTimeCode(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
    }

    /**
     * Starts periodic checking of API availability
     * @param {string} url - The API URL to check
     */
    function startPeriodicApiCheck(url) {
        // Clear any existing interval
        stopPeriodicApiCheck();

        // Set up new interval for API checking
        apiStatus.checkInterval = setInterval(() => {
            console.log(
                `Checking API availability at ${new Date().toLocaleTimeString()}`,
            );
            checkApiAvailability(url);
        }, CONFIG.INTERVALS.API_CHECK_INTERVAL);
    }

    /**
     * Stops periodic checking of API availability
     */
    function stopPeriodicApiCheck() {
        if (apiStatus.checkInterval) {
            clearInterval(apiStatus.checkInterval);
            apiStatus.checkInterval = null;
        }
    }

    // Public methods
    return {
        init: init,
        handleTranscription: handleTranscription,
        cancelTranscription: cancelTranscription,
        checkApiAvailability: checkApiAvailability,
        getTranscriptionResults: getTranscriptionResults,
        startPeriodicApiCheck: startPeriodicApiCheck,
        stopPeriodicApiCheck: stopPeriodicApiCheck,
    };
})();

// Make API available globally
window.API = API;

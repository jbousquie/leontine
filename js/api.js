/**
 * api.js - API management for Leontine
 * Handles all communication with the WhisperX API, including job submission,
 * status polling, and result retrieval.
 */
const API = (function () {
    // --- Module State ---
    let ui; // Reference to the UI module
    let currentJob = {
        id: null,
        status: null,
        filename: null,
        timestamp: null,
        lastUpdated: null,
    };
    let statusCheckInterval = null; // Interval ID for status checking
    let apiCheckInterval = null; // Interval ID for API availability checking

    // --- Initialization ---

    /**
     * Initializes the API module
     * @param {object} uiModule - Reference to the UI module
     */
    function init(uiModule) {
        ui = uiModule;
        console.log("API module initialized");

        const savedApiUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL);
        if (savedApiUrl) {
            startPeriodicApiCheck(savedApiUrl);
        }

        checkForPendingJobs();
    }

    // --- Job Persistence ---

    /**
     * Saves the current job details to localStorage
     */
    function saveJobToStorage() {
        if (!currentJob.id) return;
        try {
            localStorage.setItem(
                CONFIG.STORAGE_KEYS.CURRENT_JOB_ID,
                currentJob.id,
            );
            localStorage.setItem(
                CONFIG.STORAGE_KEYS.JOB_STATUS,
                currentJob.status,
            );
            localStorage.setItem(
                CONFIG.STORAGE_KEYS.JOB_FILENAME,
                currentJob.filename,
            );
            localStorage.setItem(
                CONFIG.STORAGE_KEYS.JOB_TIMESTAMP,
                currentJob.timestamp,
            );
        } catch (e) {
            console.error("Failed to save job to storage:", e);
        }
    }

    /**
     * Clears the current job details from localStorage
     */
    function clearJobFromStorage() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_JOB_ID);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.JOB_STATUS);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.JOB_FILENAME);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.JOB_TIMESTAMP);
    }

    /**
     * Checks for a pending job from a previous session and resumes polling
     */
    function checkForPendingJobs() {
        const jobId = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_JOB_ID);
        const apiUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL);

        if (jobId && apiUrl) {
            currentJob.id = jobId;
            currentJob.status = localStorage.getItem(
                CONFIG.STORAGE_KEYS.JOB_STATUS,
            );
            currentJob.filename = localStorage.getItem(
                CONFIG.STORAGE_KEYS.JOB_FILENAME,
            );
            currentJob.timestamp = localStorage.getItem(
                CONFIG.STORAGE_KEYS.JOB_TIMESTAMP,
            );
            currentJob.lastUpdated = new Date();

            console.log(`Found pending job ${jobId}. Resuming status checks.`);
            startStatusChecking(apiUrl, jobId);
        }
    }

    // --- Transcription Workflow ---

    /**
     * Main entry point for starting a transcription
     * @param {File} file - The audio file to transcribe
     */
    function handleTranscription(file) {
        if (!file) {
            ui.updateMessage("Error: No file selected.");
            return;
        }

        const apiUrl = ui.getApiUrl();
        if (!apiUrl) {
            ui.updateMessage("Error: API URL is not configured.");
            return;
        }

        sendTranscriptionRequest(apiUrl, file);
    }

    /**
     * Sends the audio file to the WhisperX API
     * @param {string} apiUrl - The base URL of the API
     * @param {File} file - The audio file
     */
    function sendTranscriptionRequest(apiUrl, file) {
        const formData = new FormData();
        // Use 'file' as the key, per API documentation
        formData.append("file", file);

        ui.updateMessage(`Sending "${file.name}" for transcription...`);

        fetch(`${apiUrl}${CONFIG.API_ENDPOINTS.SUBMIT}`, {
            method: "POST",
            body: formData,
            headers: {
                Accept: "application/json",
            },
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json().then((err) => {
                        throw new Error(
                            `Server returned an error: ${
                                err.detail || response.statusText
                            }`,
                        );
                    });
                }
                return response.json();
            })
            .then((data) => {
                if (!data.job_id) {
                    throw new Error("API did not return a job ID.");
                }
                currentJob = {
                    id: data.job_id,
                    status: "Submitted",
                    filename: file.name,
                    timestamp: new Date().toISOString(),
                    lastUpdated: new Date(),
                };
                saveJobToStorage();
                ui.updateMessage(
                    `File sent successfully.\nJob ID: ${data.job_id}`,
                );
                startStatusChecking(apiUrl, data.job_id);
            })
            .catch((error) => {
                // Any error during submission is a permanent failure for this attempt
                handleJobFailure(error.message);
            });
    }

    // --- Status Polling ---

    /**
     * Starts polling for the status of a transcription job
     * @param {string} apiUrl - The base URL of the API
     * @param {string} jobId - The ID of the job to check
     */
    function startStatusChecking(apiUrl, jobId) {
        stopStatusChecking(); // Ensure no other polling is running
        console.log(`Starting status checks for job ${jobId}.`);
        checkJobStatus(apiUrl, jobId); // Initial check
        statusCheckInterval = setInterval(
            () => checkJobStatus(apiUrl, jobId),
            CONFIG.INTERVALS.STATUS_CHECK_INTERVAL,
        );
    }

    /**
     * Stops the periodic status checking
     */
    function stopStatusChecking() {
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
            console.log("Stopped status checking.");
        }
    }

    /**
     * A unified handler for all *permanent* job failure scenarios.
     * This function should not be called for temporary server issues.
     * @param {string} errorMessage - The message explaining the failure.
     */
    function handleJobFailure(errorMessage) {
        console.error("Job has failed permanently:", errorMessage);
        stopStatusChecking();
        clearJobFromStorage();

        if (ui && ui.showTranscriptionError) {
            ui.showTranscriptionError(errorMessage);
        } else {
            // Fallback if the specific UI function isn't available
            ui.updateMessage(`Error: ${errorMessage}`);
        }
    }

    /**
     * Fetches and processes the status of a specific job
     * @param {string} apiUrl - The base URL of the API
     * @param {string} jobId - The ID of the job
     */
    function checkJobStatus(apiUrl, jobId) {
        const statusEndpoint = CONFIG.API_ENDPOINTS.STATUS.replace(
            "{job_id}",
            jobId,
        );

        fetch(`${apiUrl}${statusEndpoint}`, {
            method: "GET",
            headers: { Accept: "application/json" },
        })
            .then((response) => {
                if (response.status === 404) {
                    // Permanent failure: Job is gone.
                    throw new Error(
                        "Job not found. It may have expired or been cleared from the server.",
                    );
                }
                if (response.status >= 500) {
                    // Temporary failure: Server issue.
                    throw new Error(
                        `Server temporarily unavailable (${response.status}).`,
                    );
                }
                if (!response.ok) {
                    // Permanent failure: Other client-side error.
                    throw new Error(
                        `Status check failed with status: ${response.status}`,
                    );
                }
                return response.json();
            })
            .then((data) => {
                console.log("Status response:", data);

                const queuePosition = data.queue_position;

                // Add robust status parsing to handle strings or objects
                let status = "Unknown";
                if (data.status) {
                    if (
                        typeof data.status === "object" &&
                        data.status !== null
                    ) {
                        // If status is an object, look for a nested status/state property
                        status =
                            data.status.status ||
                            data.status.state ||
                            JSON.stringify(data.status);
                    } else {
                        // Otherwise, convert it to a string
                        status = String(data.status);
                    }
                }

                currentJob.status = status;
                currentJob.lastUpdated = new Date();
                saveJobToStorage();

                let statusMessage =
                    `Job: "${currentJob.filename}"\n` +
                    `Status: ${status}\n` +
                    `Last checked: ${formatTime(currentJob.lastUpdated)}`;
                if (queuePosition !== undefined) {
                    statusMessage += `\nQueue position: ${queuePosition}`;
                }
                ui.updateMessage(statusMessage);

                if (status === CONFIG.STATUS.JOB_COMPLETED) {
                    stopStatusChecking();
                    const resultUrl =
                        apiUrl +
                        CONFIG.API_ENDPOINTS.RESULT.replace("{job_id}", jobId);
                    ui.showDownloadButton(jobId, resultUrl);
                } else if (status === CONFIG.STATUS.JOB_FAILED) {
                    // Permanent failure: The job failed on the server.
                    const reason = data.data
                        ? JSON.stringify(data.data)
                        : "No reason provided by server.";
                    handleJobFailure(`Job failed on server. Reason: ${reason}`);
                }
            })
            .catch((error) => {
                // Differentiate between temporary and permanent errors here
                if (error.message.includes("temporarily unavailable")) {
                    // This is a TEMPORARY issue. We display a warning but do NOT stop polling.
                    const warning =
                        `Warning: ${error.message} Will retry in ${
                            CONFIG.INTERVALS.STATUS_CHECK_INTERVAL / 1000
                        } seconds.\n` +
                        `Last successful update: ${
                            currentJob.lastUpdated
                                ? formatTime(currentJob.lastUpdated)
                                : "None"
                        }`;
                    ui.updateMessage(warning);
                } else {
                    // This is a PERMANENT failure (404, etc.).
                    handleJobFailure(error.message);
                }
            });
    }

    /**
     * Formats a Date object into a readable time string
     * @param {Date} date - The date to format
     * @returns {string} Formatted time string
     */
    function formatTime(date) {
        return date ? date.toLocaleTimeString() : "N/A";
    }

    // --- API Availability ---

    /**
     * Checks if the WhisperX API is available
     * @param {string} apiUrl - The base URL of the API to check
     */
    function checkApiAvailability(apiUrl) {
        if (!apiUrl) {
            updateApiStatusUI(false, "API URL is not set.");
            return;
        }

        updateApiStatusUI(null, "Checking API status..."); // 'checking' state

        fetch(`${apiUrl}${CONFIG.API_ENDPOINTS.API_STATUS}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const queueInfo = `Queue: ${
                    data.queue_state ? data.queue_state.queued_jobs : "N/A"
                }`;
                updateApiStatusUI(true, "API is accessible", queueInfo);
            })
            .catch((error) => {
                updateApiStatusUI(
                    false,
                    `Server not accessible: ${error.message}`,
                );
            });
    }

    /**
     * Updates the UI with the current API status
     * @param {boolean|null} isAvailable - True, false, or null for 'checking'
     * @param {string} message - The message to display
     * @param {string} [queueInfo] - Optional queue information
     */
    function updateApiStatusUI(isAvailable, message, queueInfo) {
        let status;
        if (isAvailable === null) status = CONFIG.STATUS.API_CHECKING;
        else if (isAvailable) status = CONFIG.STATUS.API_AVAILABLE;
        else status = CONFIG.STATUS.API_UNAVAILABLE;

        if (ui && ui.updateApiStatus) {
            ui.updateApiStatus(status, message, queueInfo);
        }
    }

    /**
     * Starts a periodic check for API availability
     * @param {string} apiUrl - The API URL to check
     */
    function startPeriodicApiCheck(apiUrl) {
        stopPeriodicApiCheck();
        checkApiAvailability(apiUrl);
        apiCheckInterval = setInterval(
            () => checkApiAvailability(apiUrl),
            CONFIG.INTERVALS.API_CHECK_INTERVAL,
        );
    }

    /**
     * Stops the periodic API availability check
     */
    function stopPeriodicApiCheck() {
        if (apiCheckInterval) {
            clearInterval(apiCheckInterval);
            apiCheckInterval = null;
        }
    }

    // --- Result Handling ---

    /**
     * Downloads the transcription result
     * @param {string} jobId - The ID of the job to download
     */
    function downloadTranscription(jobId) {
        const apiUrl = ui.getApiUrl();
        const resultUrl = `${apiUrl}${CONFIG.API_ENDPOINTS.RESULT.replace(
            "{job_id}",
            jobId,
        )}`;

        fetch(resultUrl)
            .then((response) => {
                if (!response.ok) throw new Error("Failed to download result.");
                return response.blob();
            })
            .then((blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;

                const filename =
                    localStorage.getItem(CONFIG.STORAGE_KEYS.JOB_FILENAME) ||
                    "transcription";
                a.download = `${filename.split(".").slice(0, -1).join(".")}.txt`;

                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

                ui.updateMessage("Download complete. Resetting interface.");
                setTimeout(() => {
                    if (ui.removeTranscriptionArea) {
                        ui.removeTranscriptionArea();
                    }
                }, CONFIG.INTERVALS.RESET_DELAY);

                clearJobFromStorage();
            })
            .catch((error) => {
                handleJobFailure(`Download failed: ${error.message}`);
            });
    }

    // --- Public API ---
    return {
        init,
        handleTranscription,
        checkApiAvailability,
        startPeriodicApiCheck,
        stopPeriodicApiCheck,
        downloadTranscription,
    };
})();

// Expose the API module to the global scope
window.API = API;

/**
 * state.js - State management for Leontine
 * Defines the application's state shape and the pure update function (reducer).
 */

const State = (function () {
    const initialState = {
        // API and configuration details
        api: {
            url: null, // The user-provided API URL
            status: "UNKNOWN", // 'UNKNOWN', 'CHECKING', 'AVAILABLE', 'UNAVAILABLE'
            statusMessage: "", // Text message for API status
            validationMessage: "", // For the URL input field
        },
        // File selection details
        file: {
            name: null, // The name of the selected file
            handle: null, // The actual File object
        },
        // Current transcription job details
        job: {
            id: null,
            status: "IDLE", // 'IDLE', 'SUBMITTING', 'POLLING', 'COMPLETED', 'FAILED'
            message: CONFIG.UI.INITIAL_MESSAGE, // The message in the transcription area
            filename: null, // Filename for the active job
            resultUrl: null, // URL for downloading the result
        },
    };

    /**
     * The update function (reducer). Takes an action and the current state,
     * and returns the new state. This is a PURE function.
     * @param {object} action - The action to process.
     * @param {object} currentState - The current application state.
     * @returns {object} The new application state.
     */
    function update(action, currentState) {
        switch (action.type) {
            // API Configuration
            case "API_URL_LOADED":
            case "API_URL_INPUT_CHANGED":
                return {
                    ...currentState,
                    api: {
                        ...currentState.api,
                        url: action.payload,
                        validationMessage: "",
                    },
                };
            case "API_URL_SAVE_CLICKED":
                return {
                    ...currentState,
                    api: { ...currentState.api, validationMessage: "Saving..." },
                };
            case "API_URL_SAVE_SUCCESS":
                return {
                    ...currentState,
                    api: {
                        ...currentState.api,
                        validationMessage: "API URL saved successfully!",
                    },
                };
            case "API_URL_VALIDATION_RESET":
                return {
                    ...currentState,
                    api: { ...currentState.api, validationMessage: "" },
                };
            case "API_STATUS_CHECK_STARTED":
                return {
                    ...currentState,
                    api: {
                        ...currentState.api,
                        status: "CHECKING",
                        statusMessage: "Checking API status...",
                    },
                };
            case "API_STATUS_UPDATED":
                return {
                    ...currentState,
                    api: {
                        ...currentState.api,
                        status: action.payload.status,
                        statusMessage: action.payload.message,
                    },
                };

            // File and Job Management
            case "FILE_SELECTED":
                return {
                    ...currentState,
                    file: {
                        name: action.payload.name,
                        handle: action.payload.handle,
                    },
                    job: {
                        ...initialState.job,
                        message: "Ready to transcribe. Click the button to start.",
                    },
                };
            case "TRANSCRIBE_BUTTON_CLICKED":
                return {
                    ...currentState,
                    job: {
                        ...currentState.job,
                        status: "SUBMITTING",
                        message: `Submitting "${currentState.file.name}" for transcription...`,
                        filename: currentState.file.name,
                    },
                };
            case "JOB_SUBMIT_SUCCESS":
                return {
                    ...currentState,
                    job: {
                        ...currentState.job,
                        id: action.payload.jobId,
                        status: "POLLING",
                        message: `Job submitted successfully.\nID: ${action.payload.jobId}\nPolling for status...`,
                    },
                };
            case "JOB_SUBMIT_FAILED":
                return {
                    ...currentState,
                    job: {
                        ...initialState.job,
                        status: "FAILED",
                        message: `Submission Failed: ${action.payload.error}`,
                    },
                    file: { ...initialState.file }, // Reset file selection
                };
            case "JOB_STATUS_UPDATED":
                const jobStatus = action.payload.statusData.status || "Unknown";
                const queuePos = action.payload.statusData.queue_position;
                let statusMsg = `Job: "${currentState.job.filename}"\nStatus: ${jobStatus}\nLast checked: ${new Date().toLocaleTimeString()}`;
                if (queuePos !== undefined) {
                    statusMsg += `\nQueue position: ${queuePos}`;
                }
                return {
                    ...currentState,
                    job: { ...currentState.job, message: statusMsg },
                };
            case "JOB_COMPLETED":
                return {
                    ...currentState,
                    job: {
                        ...currentState.job,
                        status: "COMPLETED",
                        message: "Transcription complete and ready for download.",
                        resultUrl: `${currentState.api.url}${CONFIG.API_ENDPOINTS.RESULT.replace("{job_id}", currentState.job.id)}`,
                    },
                };
            case "JOB_FAILED":
                return {
                    ...currentState,
                    job: {
                        ...initialState.job,
                        status: "FAILED",
                        message: `Job Failed: ${action.payload.error}`,
                    },
                    file: { ...initialState.file },
                };
            case "JOB_RECOVERED":
                return {
                    ...currentState,
                    job: {
                        ...currentState.job,
                        id: action.payload.jobId,
                        filename: action.payload.filename,
                        status: "POLLING",
                        message: `Recovered pending job "${action.payload.filename}".\nResuming status checks...`,
                    },
                };

            // UI Actions
            case "DOWNLOAD_SUCCESS":
            case "RESET_INTERFACE":
                return {
                    ...initialState,
                    api: { ...currentState.api }, // Keep API settings
                };
            default:
                return currentState;
        }
    }

    return {
        initialState,
        update,
    };
})();

// Expose to global scope
window.State = State;

/**
 * main.js - Main entry point for Leontine application
 * Implements an Elm-like architecture with a centralized state, update function,
 * and render function.
 */

// The single, centralized state for the entire application
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

// --- Application State and Timers ---
let state = { ...initialState };
let apiCheckInterval = null;
let jobStatusInterval = null;
let animationInterval = null; // For large hourglass animation

// --- State Management ---

/**
 * The update function (reducer). Takes the current state and an action,
 * and returns the new state. This is a PURE function.
 */
function update(currentState, action) {
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

/**
 * Dispatches an action, updates the state, re-renders the UI, and handles side effects.
 */
function dispatch(action) {
    console.log("Dispatching:", action.type, action.payload || "");
    state = update(state, action);
    render(state);
    handleSideEffects(action, state);
}

/**
 * Handles all side effects, such as API calls, timers, and localStorage.
 */
function handleSideEffects(action, currentState) {
    const { api, job, file } = currentState;

    switch (action.type) {
        case "API_URL_LOADED":
        case "API_URL_SAVE_SUCCESS":
            startPeriodicApiCheck(api.url);
            break;

        case "API_URL_SAVE_CLICKED":
            localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL, api.url);
            dispatch({ type: "API_URL_SAVE_SUCCESS" });
            setTimeout(
                () => dispatch({ type: "API_URL_VALIDATION_RESET" }),
                CONFIG.UI.SUCCESS_MESSAGE_TIMEOUT,
            );
            break;

        case "TRANSCRIBE_BUTTON_CLICKED":
            Api.submitTranscription(api.url, file.handle)
                .then((data) => {
                    if (!data.job_id)
                        throw new Error("API did not return a job ID.");
                    localStorage.setItem(
                        CONFIG.STORAGE_KEYS.CURRENT_JOB_ID,
                        data.job_id,
                    );
                    localStorage.setItem(
                        CONFIG.STORAGE_KEYS.JOB_FILENAME,
                        file.name,
                    );
                    dispatch({
                        type: "JOB_SUBMIT_SUCCESS",
                        payload: { jobId: data.job_id },
                    });
                })
                .catch((err) =>
                    dispatch({
                        type: "JOB_SUBMIT_FAILED",
                        payload: { error: err.message },
                    }),
                );
            break;

        case "JOB_RECOVERED":
        case "JOB_SUBMIT_SUCCESS":
            startJobPolling(api.url, job.id);
            break;

        case "JOB_COMPLETED":
        case "JOB_FAILED":
            stopJobPolling();
            localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_JOB_ID);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.JOB_FILENAME);
            break;

        case "DOWNLOAD_BUTTON_CLICKED":
            Api.downloadResult(api.url, job.id)
                .then((blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.style.display = "none";
                    a.href = url;
                    const cleanFilename = job.filename
                        .split(".")
                        .slice(0, -1)
                        .join(".");
                    a.download = `${cleanFilename}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                    dispatch({ type: "DOWNLOAD_SUCCESS" });
                })
                .catch((err) =>
                    dispatch({
                        type: "JOB_FAILED",
                        payload: { error: `Download failed: ${err.message}` },
                    }),
                );
            break;
    }
}

// --- Side Effect Helpers ---

function startPeriodicApiCheck(apiUrl) {
    if (apiCheckInterval) clearInterval(apiCheckInterval);
    if (!apiUrl) return;

    const check = () => {
        dispatch({ type: "API_STATUS_CHECK_STARTED" });
        Api.checkApiAvailability(apiUrl)
            .then((data) => {
                const queueInfo = `Queue: ${data.queue_state ? data.queue_state.queued_jobs : "N/A"}`;
                dispatch({
                    type: "API_STATUS_UPDATED",
                    payload: {
                        status: "AVAILABLE",
                        message: `API is accessible. ${queueInfo}`,
                    },
                });
            })
            .catch((err) =>
                dispatch({
                    type: "API_STATUS_UPDATED",
                    payload: { status: "UNAVAILABLE", message: err.message },
                }),
            );
    };

    check();
    apiCheckInterval = setInterval(check, CONFIG.INTERVALS.API_CHECK_INTERVAL);
}

function startJobPolling(apiUrl, jobId) {
    if (jobStatusInterval) clearInterval(jobStatusInterval);
    if (!apiUrl || !jobId) return;

    const check = () => {
        Api.checkJobStatus(apiUrl, jobId)
            .then((data) => {
                if (data.status === CONFIG.STATUS.JOB_COMPLETED) {
                    dispatch({ type: "JOB_COMPLETED" });
                } else if (data.status === CONFIG.STATUS.JOB_FAILED) {
                    const reason = data.data
                        ? JSON.stringify(data.data)
                        : "No reason provided.";
                    dispatch({
                        type: "JOB_FAILED",
                        payload: {
                            error: `Job failed on server. Reason: ${reason}`,
                        },
                    });
                } else {
                    dispatch({
                        type: "JOB_STATUS_UPDATED",
                        payload: { statusData: data },
                    });
                }
            })
            .catch((err) => {
                dispatch({
                    type: "JOB_FAILED",
                    payload: { error: err.message },
                });
            });
    };

    check(); // Initial check
    jobStatusInterval = setInterval(
        check,
        CONFIG.INTERVALS.STATUS_CHECK_INTERVAL,
    );
}

function stopJobPolling() {
    if (jobStatusInterval) {
        clearInterval(jobStatusInterval);
        jobStatusInterval = null;
    }
}

// --- UI Rendering ---

/**
 * Renders the entire UI based on the current state.
 */
function render(currentState) {
    const elements = UI.getElements();
    const { api, job, file } = currentState;

    // API Section
    if (elements.apiUrlInput.value !== (api.url || "")) {
        elements.apiUrlInput.value = api.url || "";
    }
    elements.apiUrlValidation.textContent = api.validationMessage || "";
    elements.apiUrlValidation.style.color = api.validationMessage.includes(
        "success",
    )
        ? CONFIG.UI.SUCCESS_COLOR
        : CONFIG.UI.ERROR_COLOR;
    elements.apiStatusMessage.textContent = api.statusMessage || "";
    elements.apiStatusIndicator.className = `api-status-indicator ${api.status.toLowerCase()}`;

    // File Selection
    elements.selectedFileDisplay.textContent = file.name || "No file selected";
    elements.fileInput.value = file.handle ? elements.fileInput.value : "";

    // Transcription Section
    const canTranscribe = file.handle && job.status === "IDLE";
    elements.transcribeButton.style.display = canTranscribe ? "block" : "none";
    elements.messageDisplay.innerHTML = job.message.replace(/\n/g, "<br>");

    const isProcessing =
        job.status === "SUBMITTING" || job.status === "POLLING";
    elements.processingIndicator.classList.toggle("active", isProcessing);

    // Large hourglass animation
    if (isProcessing && !animationInterval) {
        animationInterval = setInterval(() => {
            const currentIcon = elements.processingIndicator.textContent;
            elements.processingIndicator.textContent =
                currentIcon === "⏳" ? "⌛" : "⏳";
        }, CONFIG.UI.ANIMATION.LARGE_HOURGLASS_INTERVAL);
    } else if (!isProcessing && animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    // Dynamic Download/Error Section
    let downloadSection = document.getElementById("download-section");
    if (job.status === "COMPLETED" || job.status === "FAILED") {
        if (!downloadSection) {
            downloadSection = document.createElement("div");
            downloadSection.id = "download-section";
            downloadSection.className = "download-section";
            elements.messageDisplay.insertAdjacentElement(
                "afterend",
                downloadSection,
            );
        }
        if (job.status === "COMPLETED") {
            downloadSection.innerHTML = `
                <div class="transcription-status success">Transcription Available</div>
                <button id="download-transcription-btn" class="download-button">Download Transcription</button>`;
            document
                .getElementById("download-transcription-btn")
                .addEventListener("click", () =>
                    dispatch({ type: "DOWNLOAD_BUTTON_CLICKED" }),
                );
        } else {
            // FAILED
            downloadSection.innerHTML = `<div class="transcription-status error">${job.message}</div>`;
        }
    } else {
        if (downloadSection) downloadSection.remove();
    }
}

/**
 * Initializes the application.
 */
function init() {
    UI.init();
    const elements = UI.getElements();

    // Event Listeners
    elements.saveApiUrlButton.addEventListener("click", () =>
        dispatch({ type: "API_URL_SAVE_CLICKED" }),
    );
    elements.apiUrlInput.addEventListener("input", (e) =>
        dispatch({ type: "API_URL_INPUT_CHANGED", payload: e.target.value }),
    );
    elements.fileSelectButton.addEventListener("click", () =>
        elements.fileInput.click(),
    );
    elements.fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file)
            dispatch({
                type: "FILE_SELECTED",
                payload: { name: file.name, handle: file },
            });
    });
    elements.transcribeButton.addEventListener("click", () =>
        dispatch({ type: "TRANSCRIBE_BUTTON_CLICKED" }),
    );

    // Load initial state from storage
    const savedUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL);
    if (savedUrl) {
        dispatch({ type: "API_URL_LOADED", payload: savedUrl });
    }

    const savedJobId = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_JOB_ID);
    const savedFilename = localStorage.getItem(
        CONFIG.STORAGE_KEYS.JOB_FILENAME,
    );
    if (savedJobId && savedFilename && savedUrl) {
        dispatch({
            type: "JOB_RECOVERED",
            payload: { jobId: savedJobId, filename: savedFilename },
        });
    }

    // Initial Render
    render(state);
}

// --- Application Entry Point ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing Leontine application with new architecture...");
    if (
        typeof CONFIG === "undefined" ||
        typeof UI === "undefined" ||
        typeof Api === "undefined"
    ) {
        console.error(
            "A core module (CONFIG, UI, Api) is not loaded. Check script order in index.html.",
        );
        return;
    }
    init();
    console.log("Application initialization complete.");
});

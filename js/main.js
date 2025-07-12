/**
 * main.js - Main Application Orchestrator for Leontine
 *
 * This file acts as the central coordinator for the application. It does not
 * handle state updates (see state.js) or DOM rendering (see render.js) directly.
 * Its primary responsibilities are:
 * - Managing the main application loop (dispatching actions).
 * - Handling all side effects (API calls, timers, localStorage).
 * - Initializing the application and setting up event listeners.
 */

import { CONFIG } from "./conf.js";
import { UI } from "./ui.js";
import { Api } from "./api.js";
import { State } from "./state.js";
import { Render } from "./render.js";

// --- Application State and Timers ---
let state = State.initialState;
let apiCheckInterval = null;
let jobStatusInterval = null;

// --- Main Application Loop ---

/**
 * Dispatches an action, updates the state, re-renders the UI, and handles side effects.
 * This is the central hub for all application events.
 * @param {object} action - The action object, must have a 'type' property.
 */
function dispatch(action) {
    console.log("Dispatching:", action.type, action.payload || "");

    // 1. Get the new state by running the pure update function
    const newState = State.update(action, state);

    // 2. Handle all side effects based on the action and the *new* state
    handleSideEffects(action, newState);

    // 3. Update the global state object
    state = newState;

    // 4. Re-render the entire UI with the new state
    Render.render(state, dispatch);
}

/**
 * Handles all side effects, such as API calls, timers, and localStorage.
 * This is the only part of the application that is "impure".
 * @param {object} action - The action that was just dispatched.
 * @param {object} currentState - The current state of the application.
 */
function handleSideEffects(action, currentState) {
    const { api, job, file } = currentState;

    switch (action.type) {
        case "API_URL_LOADED":
        case "API_URL_SAVE_SUCCESS":
            startPeriodicApiCheck(api.url);
            break;

        case "API_URL_SAVE_CLICKED":
            if (currentState.api.url) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL, api.url);
                dispatch({ type: "API_URL_SAVE_SUCCESS" });
                setTimeout(
                    () => dispatch({ type: "API_URL_VALIDATION_RESET" }),
                    CONFIG.UI.SUCCESS_MESSAGE_TIMEOUT,
                );
            }
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
            Api.downloadResult(job.resultUrl)
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

// --- Side Effect Helper Functions ---

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
    check();
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

// --- Application Entry Point ---

function init() {
    // 1. Cache all DOM elements
    UI.init();
    const elements = UI.getElements();

    // 2. Setup all event listeners to dispatch actions
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
        if (file) {
            dispatch({
                type: "FILE_SELECTED",
                payload: { name: file.name, handle: file },
            });
        }
    });
    elements.transcribeButton.addEventListener("click", () =>
        dispatch({ type: "TRANSCRIBE_BUTTON_CLICKED" }),
    );

    // 3. Load initial data from storage and check for pending jobs
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

    // 4. Perform the initial render of the application
    Render.render(state, dispatch);
}

// Start the application once the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing Leontine application...");
    init();
    console.log("Application initialization complete.");
});

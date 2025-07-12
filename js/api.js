/**
 * api.js - Stateless API Library for Leontine
 * This module provides a set of stateless functions for interacting with the WhisperX API.
 * Each function handles a single network request and returns a Promise.
 * It has no knowledge of the application's state, UI, or timers.
 */
import { CONFIG } from "./conf.js";

/**
 * Checks the availability and status of the WhisperX API.
 * @param {string} apiUrl - The base URL of the API.
 * @returns {Promise<object>} A promise that resolves with the API status data.
 */
function checkApiAvailability(apiUrl) {
    const endpoint = `${apiUrl}${CONFIG.API_ENDPOINTS.API_STATUS}`;
    return fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
    }).then((response) => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        return response.json();
    });
}

/**
 * Submits an audio file for transcription.
 * @param {string} apiUrl - The base URL of the API.
 * @param {File} file - The audio file to transcribe.
 * @returns {Promise<object>} A promise that resolves with the job submission data (e.g., job_id).
 */
function submitTranscription(apiUrl, file) {
    const endpoint = `${apiUrl}${CONFIG.API_ENDPOINTS.SUBMIT}`;
    const formData = new FormData();
    formData.append("file", file);

    return fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
    }).then((response) => {
        if (!response.ok) {
            // Try to parse a JSON error response from the server
            return response.json().then((err) => {
                throw new Error(err.detail || response.statusText);
            });
        }
        return response.json();
    });
}

/**
 * Fetches the status of a specific transcription job.
 * @param {string} apiUrl - The base URL of the API.
 * @param {string} jobId - The ID of the job to check.
 * @returns {Promise<object>} A promise that resolves with the job status data.
 */
function checkJobStatus(apiUrl, jobId) {
    const endpoint = `${apiUrl}${CONFIG.API_ENDPOINTS.STATUS.replace(
        "{job_id}",
        jobId,
    )}`;
    return fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
    }).then((response) => {
        if (response.status === 404) {
            throw new Error("Job not found on server.");
        }
        if (!response.ok) {
            throw new Error(`Status check failed: ${response.statusText}`);
        }
        return response.json();
    });
}

/**
 * Downloads the transcription result file.
 * This function was updated to take the full URL directly.
 * @param {string} resultUrl - The full URL to download the result from.
 * @returns {Promise<Blob>} A promise that resolves with the result file as a Blob.
 */
function downloadResult(resultUrl) {
    return fetch(resultUrl).then((response) => {
        if (!response.ok) {
            throw new Error("Failed to download result file.");
        }
        return response.blob();
    });
}

// Export the public API methods as a single object.
export const Api = {
    checkApiAvailability,
    submitTranscription,
    checkJobStatus,
    downloadResult,
};

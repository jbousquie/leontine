/**
 * render.js - UI Rendering for Leontine
 * This module is responsible for all DOM manipulations. It takes the application
 * state and updates the UI to reflect it.
 */
import { UI } from "./ui.js";
import { CONFIG } from "./conf.js";

// Private variable within the module scope for the animation timer.
let animationInterval = null;

/**
 * The main render function. It is not exported directly but is part of the
 * exported Render object.
 * @param {object} currentState - The current application state.
 * @param {function} dispatch - The dispatcher function to call for UI events.
 */
function render(currentState, dispatch) {
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

    // --- Animations ---
    const isProcessing =
        job.status === "SUBMITTING" || job.status === "POLLING";
    elements.processingIndicator.classList.toggle("active", isProcessing);

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

    // --- Dynamic Download/Error Section ---
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
            downloadSection.innerHTML = `<div class="transcription-status error">${job.message}</div>`;
        }
    } else {
        if (downloadSection) downloadSection.remove();
    }
}

// Export the public API for this module.
export const Render = {
    render,
};

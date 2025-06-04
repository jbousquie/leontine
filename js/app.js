/**
 * Main Application Script - Orchestrates all modules and workflow
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize application components
    initApp();
});

/**
 * Initialize the application
 */
function initApp() {
    // Set footer year
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Check for saved API configuration and apply it
    loadApiConfig();
    
    // Add event listeners for app-wide events
    addGlobalEventListeners();
    
    // Check if we're in a PWA context
    checkPwaContext();
}

/**
 * Load API configuration from storage
 */
function loadApiConfig() {
    const apiUrl = storage.get('apiUrl');
    const apiToken = storage.get('apiToken');
    
    if (apiUrl && apiToken) {
        api.setConfig(apiUrl, apiToken);
    }
}

/**
 * Add global event listeners
 */
function addGlobalEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
        ui.showNotification('Connexion rétablie', 'success');
        checkPendingJobs();
    });
    
    window.addEventListener('offline', () => {
        ui.showNotification('Connexion internet perdue', 'warning');
    });
    
    // Listen for visibility changes (tab focus/blur)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && api.currentJobId) {
            // Resume polling when tab becomes visible again
            resumeStatusPolling();
        }
    });
    
    // Listen for beforeunload to warn about active transcriptions
    window.addEventListener('beforeunload', (event) => {
        if (api.currentJobId && !document.getElementById('result-section').classList.contains('hidden')) {
            const message = 'Une transcription est en cours. Êtes-vous sûr de vouloir quitter la page?';
            event.returnValue = message;
            return message;
        }
    });
}

/**
 * Check for pending jobs when coming back online
 */
function checkPendingJobs() {
    if (api.currentJobId) {
        // Resume status checking
        resumeStatusPolling();
    }
}

/**
 * Resume status polling for current job
 */
function resumeStatusPolling() {
    api.startStatusCheck(api.currentJobId, (status) => ui.updateJobStatus(status));
}

/**
 * Check if running in PWA context and adjust UI if needed
 */
function checkPwaContext() {
    // Check if the app is running as an installed PWA
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone || 
                  document.referrer.includes('android-app://');
    
    if (isPwa) {
        // We're running as an installed PWA - adjust UI if needed
        document.body.classList.add('pwa-mode');
        
        // Hide any install prompts if present
        const installPrompts = document.querySelectorAll('.install-prompt');
        installPrompts.forEach(prompt => prompt.classList.add('hidden'));
    }
}

/**
 * Handle service worker updates
 */
function handleServiceWorkerUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // New service worker is activated
            ui.showNotification('Application mise à jour. Rafraîchissez pour la dernière version.', 'info');
        });
    }
}

/**
 * Generate a unique client ID for tracking and analytics
 */
function generateClientId() {
    let clientId = storage.get('clientId');
    
    if (!clientId) {
        clientId = 'client_' + Math.random().toString(36).substring(2, 15);
        storage.save('clientId', clientId);
    }
    
    return clientId;
}

/**
 * Get browser and device info for diagnostics
 */
function getClientInfo() {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        clientId: generateClientId()
    };
}

/**
 * Detect audio recording capabilities
 */
function detectAudioCapabilities() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Device supports audio recording, could enable recording features
        return true;
    }
    return false;
}

/**
 * Check browser compatibility
 */
function checkBrowserCompatibility() {
    const issues = [];
    
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        issues.push('L\'API File n\'est pas entièrement prise en charge dans ce navigateur.');
    }
    
    if (!('localStorage' in window)) {
        issues.push('Le stockage local n\'est pas pris en charge dans ce navigateur.');
    }
    
    if (!window.fetch) {
        issues.push('L\'API Fetch n\'est pas prise en charge dans ce navigateur.');
    }
    
    return {
        compatible: issues.length === 0,
        issues: issues
    };
}

// Initialize compatibility check on load
const compatibility = checkBrowserCompatibility();
if (!compatibility.compatible) {
    console.warn('Browser compatibility issues:', compatibility.issues);
    // Could show a warning to the user
}
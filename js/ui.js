/**
 * UI Module - Handles all user interface interactions
 */
class UI {
    constructor() {
        // UI elements
        this.elements = {
            // Auth section
            apiUrl: document.getElementById('api-url'),
            apiToken: document.getElementById('api-token'),
            saveAuthBtn: document.getElementById('save-auth'),
            
            // Upload section
            dropzone: document.getElementById('dropzone'),
            fileInput: document.getElementById('file-input'),
            fileName: document.getElementById('file-name'),
            language: document.getElementById('language'),
            model: document.getElementById('model'),
            diarize: document.getElementById('diarize'),
            prompt: document.getElementById('prompt'),
            outputFormat: document.getElementById('output-format'),
            hfToken: document.getElementById('hf-token'),
            transcribeBtn: document.getElementById('transcribe-btn'),
            
            // Status section
            statusSection: document.getElementById('status-section'),
            statusMessage: document.getElementById('status-message'),
            queuePosition: document.getElementById('queue-position'),
            progressFill: document.getElementById('progress-fill'),
            statusDetails: document.getElementById('status-details'),
            cancelBtn: document.getElementById('cancel-btn'),
            
            // Result section
            resultSection: document.getElementById('result-section'),
            copyBtn: document.getElementById('copy-btn'),
            downloadBtn: document.getElementById('download-btn'),
            newTranscriptionBtn: document.getElementById('new-transcription-btn'),
            resultText: document.getElementById('result-text'),
            
            // Notification
            notification: document.getElementById('notification'),
            notificationMessage: document.getElementById('notification-message'),
            notificationClose: document.getElementById('notification-close'),
            
            // Footer
            currentYear: document.getElementById('current-year')
        };
        
        this.selectedFile = null;
        this.currentFormat = 'txt';
        this.initEventListeners();
        this.setFooterYear();
        this.loadSavedSettings();
    }
    
    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        // Auth section
        this.elements.saveAuthBtn.addEventListener('click', () => this.saveAuthSettings());
        
        // File upload
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.dropzone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.elements.dropzone.addEventListener('dragleave', () => this.handleDragLeave());
        this.elements.dropzone.addEventListener('drop', (e) => this.handleFileDrop(e));
        this.elements.dropzone.addEventListener('click', () => this.elements.fileInput.click());
        
        // Buttons
        this.elements.transcribeBtn.addEventListener('click', () => this.requestTranscription());
        this.elements.cancelBtn.addEventListener('click', () => this.cancelTranscription());
        this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.elements.downloadBtn.addEventListener('click', () => this.downloadTranscription());
        this.elements.newTranscriptionBtn.addEventListener('click', () => this.resetToUploadState());
        
        // Notification
        this.elements.notificationClose.addEventListener('click', () => this.hideNotification());
        
        // Track format changes
        this.elements.outputFormat.addEventListener('change', (e) => {
            this.currentFormat = e.target.value;
        });
    }
    
    /**
     * Set the current year in the footer
     */
    setFooterYear() {
        this.elements.currentYear.textContent = new Date().getFullYear();
    }
    
    /**
     * Load saved settings from storage
     */
    loadSavedSettings() {
        // Load API settings
        const apiUrl = storage.get('apiUrl');
        const apiToken = storage.get('apiToken');
        
        if (apiUrl) this.elements.apiUrl.value = apiUrl;
        if (apiToken) this.elements.apiToken.value = apiToken;
        
        // Load transcription preferences
        const language = storage.get('language');
        const model = storage.get('model');
        const diarize = storage.get('diarize');
        const outputFormat = storage.get('outputFormat');
        const hfToken = storage.get('hfToken');
        
        if (language) this.elements.language.value = language;
        if (model) this.elements.model.value = model;
        if (diarize !== null) this.elements.diarize.checked = diarize;
        if (outputFormat) this.elements.outputFormat.value = outputFormat;
        if (hfToken) this.elements.hfToken.value = hfToken;
    }
    
    /**
     * Save authentication settings
     */
    saveAuthSettings() {
        const apiUrl = this.elements.apiUrl.value.trim();
        const apiToken = this.elements.apiToken.value.trim();
        
        if (!apiUrl) {
            this.showNotification('L\'URL de l\'API est requise', 'error');
            return;
        }
        
        if (!apiToken) {
            this.showNotification('Le jeton d\'API est requis', 'error');
            return;
        }
        
        // Save to storage
        storage.save('apiUrl', apiUrl);
        storage.save('apiToken', apiToken);
        
        // Update API configuration
        api.setConfig(apiUrl, apiToken);
        
        this.showNotification('Paramètres enregistrés avec succès', 'success');
    }
    
    /**
     * Handle file selection from input
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.selectFile(file);
        }
    }
    
    /**
     * Handle drag over event
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.dropzone.classList.add('active');
    }
    
    /**
     * Handle drag leave event
     */
    handleDragLeave() {
        this.elements.dropzone.classList.remove('active');
    }
    
    /**
     * Handle file drop event
     */
    handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.dropzone.classList.remove('active');
        
        const file = event.dataTransfer.files[0];
        if (file) {
            this.selectFile(file);
        }
    }
    
    /**
     * Select a file for transcription
     */
    selectFile(file) {
        // Check if file is an audio file
        if (!file.type.startsWith('audio/')) {
            this.showNotification('Veuillez sélectionner un fichier audio', 'error');
            return;
        }
        
        // Check file size (max 512MB)
        if (file.size > 512 * 1024 * 1024) {
            this.showNotification('La taille du fichier dépasse la limite de 512 Mo', 'error');
            return;
        }
        
        this.selectedFile = file;
        this.elements.fileName.textContent = file.name;
        this.elements.transcribeBtn.disabled = false;
    }
    
    /**
     * Request transcription
     */
    requestTranscription() {
        if (!this.selectedFile) {
            this.showNotification('Veuillez sélectionner un fichier audio', 'error');
            return;
        }
        
        // Check if API settings are configured
        if (!api.baseUrl || !api.token) {
            this.showNotification('Veuillez d\'abord configurer les paramètres de l\'API', 'error');
            return;
        }
        
        // Save user preferences
        this.saveTranscriptionPreferences();
        
        // Get transcription options
        const options = {
            language: this.elements.language.value,
            model: this.elements.model.value,
            diarize: this.elements.diarize.checked,
            prompt: this.elements.prompt.value.trim(),
            outputFormat: this.elements.outputFormat.value,
            hfToken: this.elements.hfToken.value.trim()
        };
        
        // Show status section
        this.showStatusSection();
        
        // Send transcription request
        api.transcribe(this.selectedFile, options)
            .then(response => {
                const jobId = response.job_id;
                
                // Start polling for status
                api.startStatusCheck(jobId, (status) => this.updateJobStatus(status));
            })
            .catch(error => {
                this.showNotification(`Échec de la demande de transcription: ${error.message}`, 'error');
                this.resetToUploadState();
            });
    }
    
    /**
     * Save transcription preferences
     */
    saveTranscriptionPreferences() {
        storage.save('language', this.elements.language.value);
        storage.save('model', this.elements.model.value);
        storage.save('diarize', this.elements.diarize.checked);
        storage.save('outputFormat', this.elements.outputFormat.value);
        storage.save('hfToken', this.elements.hfToken.value);
    }
    
    /**
     * Show status section
     */
    showStatusSection() {
        this.elements.statusSection.classList.remove('hidden');
        this.elements.resultSection.classList.add('hidden');
        
        // Reset status elements
        this.elements.progressFill.style.width = '0%';
        this.elements.statusMessage.textContent = 'Téléchargement du fichier...';
        this.elements.queuePosition.textContent = '-';
        this.elements.statusDetails.textContent = '';
    }
    
    /**
     * Update job status
     */
    updateJobStatus(status) {
        if (status.status === 'Queued') {
            this.elements.statusMessage.textContent = `En file d'attente - Position: ${status.queue_position || '-'}`;
            this.elements.queuePosition.textContent = status.queue_position || '-';
            this.elements.progressFill.style.width = '25%';
        } else if (status.status === 'Processing') {
            this.elements.statusMessage.textContent = 'Traitement en cours...';
            this.elements.progressFill.style.width = '75%';
        } else if (status.status === 'Completed') {
            this.elements.progressFill.style.width = '100%';
            this.elements.statusMessage.textContent = 'Terminé!';
            
            // Fetch and display result
            this.fetchResult();
        } else if (status.status === 'Failed') {
            this.elements.statusMessage.textContent = 'Échec';
            this.elements.statusDetails.textContent = status.data || 'Échec de la transcription';
            this.elements.progressFill.style.width = '100%';
            this.showNotification('Échec de la transcription', 'error');
        } else if (status.status === 'Error') {
            this.elements.statusMessage.textContent = 'Erreur';
            this.elements.statusDetails.textContent = status.error || 'Unknown error';
            this.showNotification(`Erreur: ${status.error || 'Erreur inconnue'}`, 'error');
        }
    }
    
    /**
     * Fetch transcription result
     */
    fetchResult() {
        if (!api.currentJobId) return;
        
        api.getResult(api.currentJobId)
            .then(result => {
                // Show result section
                this.showResultSection(result);
            })
            .catch(error => {
                this.showNotification(`Échec de la récupération du résultat: ${error.message}`, 'error');
            });
    }
    
    /**
     * Show result section with transcription
     */
    showResultSection(result) {
        this.elements.statusSection.classList.add('hidden');
        this.elements.resultSection.classList.remove('hidden');
        
        // Display the text or format it appropriately
        let displayText = '';
        
        if (typeof result === 'string') {
            displayText = result;
        } else if (result.text) {
            displayText = result.text;
        } else if (Array.isArray(result.segments)) {
            // Format segments if available
            displayText = result.segments.map(segment => {
                let time = '';
                if (segment.start !== undefined && segment.end !== undefined) {
                    time = `[${this.formatTime(segment.start)} --> ${this.formatTime(segment.end)}] `;
                }
                return `${time}${segment.text}`;
            }).join('\n\n');
        } else {
            displayText = JSON.stringify(result, null, 2);
        }
        
        this.elements.resultText.textContent = displayText;
    }
    
    /**
     * Format time in seconds to [MM:SS.mmm] format
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const msecs = Math.floor((seconds % 1) * 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${msecs.toString().padStart(3, '0')}`;
    }
    
    /**
     * Cancel transcription
     */
    cancelTranscription() {
        if (!api.currentJobId) return;
        
        api.cancelJob(api.currentJobId)
            .then(result => {
                this.showNotification('Transcription annulée', 'warning');
                this.resetToUploadState();
            })
            .catch(error => {
                this.showNotification(`Échec de l'annulation: ${error.message}`, 'error');
            });
    }
    
    /**
     * Copy transcription to clipboard
     */
    copyToClipboard() {
        const text = this.elements.resultText.textContent;
        
        if (!text) {
            this.showNotification('Aucun texte à copier', 'warning');
            return;
        }
        
        navigator.clipboard.writeText(text)
            .then(() => {
                this.showNotification('Copié dans le presse-papiers', 'success');
            })
            .catch(error => {
                this.showNotification('Échec de la copie dans le presse-papiers', 'error');
            });
    }
    
    /**
     * Download transcription
     */
    downloadTranscription() {
        const text = this.elements.resultText.textContent;
        
        if (!text) {
            this.showNotification('Aucun texte à télécharger', 'warning');
            return;
        }
        
        // Create a blob and download link
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcription_leontine.${this.currentFormat}`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
    
    /**
     * Reset to upload state
     */
    resetToUploadState() {
        // Reset file selection
        this.selectedFile = null;
        this.elements.fileName.textContent = 'Aucun fichier sélectionné';
        this.elements.fileInput.value = '';
        this.elements.transcribeBtn.disabled = true;
        
        // Hide status and result sections
        this.elements.statusSection.classList.add('hidden');
        this.elements.resultSection.classList.add('hidden');
        
        // Stop polling
        api.stopStatusCheck();
        api.currentJobId = null;
    }
    
    /**
     * Show notification
     * @param {string} message - Message to display
     * @param {string} type - Type of notification (success, error, warning)
     */
    showNotification(message, type = 'info') {
        this.elements.notificationMessage.textContent = message;
        this.elements.notification.className = 'notification';
        this.elements.notification.classList.add(type);
        this.elements.notification.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }
    
    /**
     * Hide notification
     */
    hideNotification() {
        this.elements.notification.classList.add('hide');
        setTimeout(() => {
            this.elements.notification.classList.add('hidden');
            this.elements.notification.classList.remove('hide');
        }, 300);
    }
}

// Create a singleton instance
const ui = new UI();
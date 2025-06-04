/**
 * API Module - Handles all API interactions with the Whisper API
 */
class WhisperAPI {
    constructor() {
        this.baseUrl = '';
        this.token = '';
        this.currentJobId = null;
        this.statusCheckInterval = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
    }

    /**
     * Set the API configuration
     * @param {string} baseUrl - The base URL of the Whisper API
     * @param {string} token - The authentication token
     */
    setConfig(baseUrl, token) {
        this.baseUrl = baseUrl.trim();
        // Remove trailing slash if present
        if (this.baseUrl.endsWith('/')) {
            this.baseUrl = this.baseUrl.slice(0, -1);
        }
        this.token = token;
        return this;
    }

    /**
     * Get headers for API requests
     * @returns {Object} - Headers object with authorization
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`
        };
    }

    /**
     * Send a transcription request
     * @param {File} file - Audio file to transcribe
     * @param {Object} options - Transcription options
     * @returns {Promise<Object>} - Response with job ID and status URL
     */
    async transcribe(file, options = {}) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Add all options to the form data
            if (options.language) formData.append('language', options.language);
            if (options.model) formData.append('model', options.model);
            if (options.diarize !== undefined) formData.append('diarize', options.diarize);
            if (options.prompt) formData.append('prompt', options.prompt);
            if (options.hfToken) formData.append('hf_token', options.hfToken);
            if (options.outputFormat) formData.append('output_format', options.outputFormat);

            const response = await fetch(`${this.baseUrl}/transcribe`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            this.currentJobId = data.job_id;
            return data;
        } catch (error) {
            console.error('Transcription request failed:', error);
            throw error;
        }
    }

    /**
     * Check the status of a transcription job
     * @param {string} jobId - The job ID to check
     * @returns {Promise<Object>} - Job status information
     */
    async checkStatus(jobId) {
        try {
            const response = await fetch(`${this.baseUrl}/transcription/${jobId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Job not found');
                }
                throw new Error(`HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            // Implement retry mechanism for network errors
            if (this.retryCount < this.maxRetries && 
                (error instanceof TypeError || error.message.includes('network'))) {
                this.retryCount++;
                console.warn(`Network error, retrying (${this.retryCount}/${this.maxRetries})...`);
                
                return new Promise(resolve => {
                    setTimeout(async () => {
                        try {
                            const result = await this.checkStatus(jobId);
                            this.retryCount = 0; // Reset on success
                            resolve(result);
                        } catch (retryError) {
                            resolve({ status: 'Error', error: retryError.message });
                        }
                    }, this.retryDelay);
                });
            }
            
            console.error('Status check failed:', error);
            throw error;
        }
    }

    /**
     * Get the transcription result
     * @param {string} jobId - The job ID to get results for
     * @returns {Promise<Object>} - Transcription results
     */
    async getResult(jobId) {
        try {
            const response = await fetch(`${this.baseUrl}/transcription/${jobId}/result`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Get result failed:', error);
            throw error;
        }
    }

    /**
     * Cancel a transcription job
     * @param {string} jobId - The job ID to cancel
     * @returns {Promise<Object>} - Cancellation result
     */
    async cancelJob(jobId) {
        try {
            const response = await fetch(`${this.baseUrl}/transcription/${jobId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            this.stopStatusCheck();
            this.currentJobId = null;
            return await response.json();
        } catch (error) {
            console.error('Cancel job failed:', error);
            throw error;
        }
    }

    /**
     * Start polling for job status
     * @param {string} jobId - The job ID to check
     * @param {function} statusCallback - Callback for status updates
     * @param {number} interval - Check interval in ms
     */
    startStatusCheck(jobId, statusCallback, interval = 2000) {
        this.stopStatusCheck(); // Clear any existing interval
        this.statusCheckInterval = setInterval(async () => {
            try {
                const status = await this.checkStatus(jobId);
                statusCallback(status);

                // If job is complete or failed, stop checking
                if (status.status === 'Completed' || status.status === 'Failed') {
                    this.stopStatusCheck();
                }
            } catch (error) {
                statusCallback({ status: 'Error', error: error.message });
                this.stopStatusCheck();
            }
        }, interval);
    }

    /**
     * Stop polling for job status
     */
    stopStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    /**
     * Get the URL for downloading the transcription result
     * @param {string} jobId - The job ID
     * @param {string} format - The output format
     * @returns {string} - Download URL
     */
    getDownloadUrl(jobId, format) {
        return `${this.baseUrl}/transcription/${jobId}/result?format=${format}`;
    }
}

// Create a singleton instance
const api = new WhisperAPI();
/**
 * Storage Module - Handles local storage for saving preferences
 */
class Storage {
    constructor() {
        this.storagePrefix = 'whisperApp_';
    }

    /**
     * Save a value to local storage
     * @param {string} key - The key to store under
     * @param {any} value - The value to store
     */
    save(key, value) {
        try {
            const storageKey = this.storagePrefix + key;
            const valueToStore = typeof value === 'object' 
                ? JSON.stringify(value)
                : String(value);
            
            localStorage.setItem(storageKey, valueToStore);
            return true;
        } catch (error) {
            console.error('Failed to save to storage:', error);
            return false;
        }
    }

    /**
     * Get a value from local storage
     * @param {string} key - The key to retrieve
     * @param {any} defaultValue - Default value if key not found
     * @returns {any} - The stored value or default
     */
    get(key, defaultValue = null) {
        try {
            const storageKey = this.storagePrefix + key;
            const value = localStorage.getItem(storageKey);
            
            if (value === null) return defaultValue;
            
            // Try to parse as JSON, return as string if parsing fails
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error('Failed to get from storage:', error);
            return defaultValue;
        }
    }

    /**
     * Remove a value from local storage
     * @param {string} key - The key to remove
     */
    remove(key) {
        try {
            const storageKey = this.storagePrefix + key;
            localStorage.removeItem(storageKey);
            return true;
        } catch (error) {
            console.error('Failed to remove from storage:', error);
            return false;
        }
    }

    /**
     * Check if a key exists in local storage
     * @param {string} key - The key to check
     * @returns {boolean} - True if key exists
     */
    has(key) {
        const storageKey = this.storagePrefix + key;
        return localStorage.getItem(storageKey) !== null;
    }

    /**
     * Clear all app-related data from local storage
     */
    clearAll() {
        try {
            // Only clear keys with our prefix
            Object.keys(localStorage)
                .filter(key => key.startsWith(this.storagePrefix))
                .forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }
}

// Create a singleton instance
const storage = new Storage();
/**
 * Session Manager - Handles saving and loading user sessions
 * Stores YouTube URLs and timestamps without any audio data
 */

class SessionManager {
    constructor() {
        this.storageKey = 'youtube-chopper-sessions';
        this.currentSessionKey = 'current-session';
    }

    /**
     * Save current session
     * @param {Object} sessionData - Session data to save
     * @param {string} sessionData.youtubeUrl - YouTube video URL
     * @param {Array} sessionData.chops - Array of chop objects with timestamps
     * @param {string} sessionData.activeBank - Current active bank
     * @param {string} sessionName - Optional session name
     */
    async saveSession(sessionData, sessionName = null) {
        try {
            const sessionId = this.generateSessionId();
            const timestamp = new Date().toISOString();
            
            // Clean session data (no audio, just metadata)
            const cleanSessionData = {
                id: sessionId,
                name: sessionName || `Session ${new Date().toLocaleDateString()}`,
                youtubeUrl: sessionData.youtubeUrl,
                videoId: this.extractVideoId(sessionData.youtubeUrl),
                chops: sessionData.chops.map(chop => ({
                    padId: chop.padId,
                    startTime: chop.startTime,
                    endTime: chop.endTime,
                    color: chop.color
                })),
                activeBank: sessionData.activeBank || 'A',
                createdAt: timestamp,
                updatedAt: timestamp,
                version: '1.0'
            };

            // Get existing sessions
            const existingSessions = await this.getAllSessions();
            
            // Add new session
            existingSessions[sessionId] = cleanSessionData;
            
            // Save to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(existingSessions));
            
            // Update current session
            localStorage.setItem(this.currentSessionKey, sessionId);
            
            console.log(`💾 Session saved: ${sessionName || sessionId}`);
            console.log(`📊 Chops saved: ${cleanSessionData.chops.length}`);
            
            return {
                success: true,
                sessionId,
                sessionName: cleanSessionData.name
            };
            
        } catch (error) {
            console.error('Failed to save session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load session by ID
     * @param {string} sessionId - Session ID to load
     */
    async loadSession(sessionId) {
        try {
            const sessions = await this.getAllSessions();
            const session = sessions[sessionId];
            
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }
            
            // Update current session
            localStorage.setItem(this.currentSessionKey, sessionId);
            
            console.log(`📂 Session loaded: ${session.name}`);
            console.log(`🎵 Video: ${session.youtubeUrl}`);
            console.log(`📊 Chops: ${session.chops.length}`);
            
            return {
                success: true,
                session
            };
            
        } catch (error) {
            console.error('Failed to load session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all saved sessions
     */
    async getAllSessions() {
        try {
            const sessionsJson = localStorage.getItem(this.storageKey);
            return sessionsJson ? JSON.parse(sessionsJson) : {};
        } catch (error) {
            console.error('Failed to get sessions:', error);
            return {};
        }
    }

    /**
     * Delete session
     * @param {string} sessionId - Session ID to delete
     */
    async deleteSession(sessionId) {
        try {
            const sessions = await this.getAllSessions();
            
            if (!sessions[sessionId]) {
                throw new Error(`Session ${sessionId} not found`);
            }
            
            const sessionName = sessions[sessionId].name;
            delete sessions[sessionId];
            
            localStorage.setItem(this.storageKey, JSON.stringify(sessions));
            
            // Clear current session if it was deleted
            const currentSessionId = localStorage.getItem(this.currentSessionKey);
            if (currentSessionId === sessionId) {
                localStorage.removeItem(this.currentSessionKey);
            }
            
            console.log(`🗑️ Session deleted: ${sessionName}`);
            
            return {
                success: true,
                sessionName
            };
            
        } catch (error) {
            console.error('Failed to delete session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get current session ID
     */
    getCurrentSessionId() {
        return localStorage.getItem(this.currentSessionKey);
    }

    /**
     * Auto-save current session (debounced)
     * @param {Object} sessionData - Current session data
     */
    autoSave(sessionData) {
        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        // Set new timeout for auto-save
        this.autoSaveTimeout = setTimeout(async () => {
            const currentSessionId = this.getCurrentSessionId();
            
            if (currentSessionId) {
                // Update existing session
                await this.updateSession(currentSessionId, sessionData);
            } else {
                // Create new auto-save session
                await this.saveSession(sessionData, 'Auto-saved Session');
            }
        }, 2000); // 2 second delay
    }

    /**
     * Update existing session
     * @param {string} sessionId - Session ID to update
     * @param {Object} sessionData - Updated session data
     */
    async updateSession(sessionId, sessionData) {
        try {
            const sessions = await this.getAllSessions();
            const existingSession = sessions[sessionId];
            
            if (!existingSession) {
                throw new Error(`Session ${sessionId} not found`);
            }
            
            // Update session data
            const updatedSession = {
                ...existingSession,
                youtubeUrl: sessionData.youtubeUrl,
                videoId: this.extractVideoId(sessionData.youtubeUrl),
                chops: sessionData.chops.map(chop => ({
                    padId: chop.padId,
                    startTime: chop.startTime,
                    endTime: chop.endTime,
                    color: chop.color
                })),
                activeBank: sessionData.activeBank || existingSession.activeBank,
                updatedAt: new Date().toISOString()
            };
            
            sessions[sessionId] = updatedSession;
            localStorage.setItem(this.storageKey, JSON.stringify(sessions));
            
            console.log(`💾 Session updated: ${updatedSession.name}`);
            
            return {
                success: true,
                session: updatedSession
            };
            
        } catch (error) {
            console.error('Failed to update session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Export session as JSON
     * @param {string} sessionId - Session ID to export
     */
    async exportSession(sessionId) {
        try {
            const result = await this.loadSession(sessionId);
            if (!result.success) {
                throw new Error(result.error);
            }
            
            const exportData = {
                ...result.session,
                exportedAt: new Date().toISOString(),
                appVersion: '1.0'
            };
            
            return {
                success: true,
                data: exportData,
                filename: `chopper-session-${result.session.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
            };
            
        } catch (error) {
            console.error('Failed to export session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Import session from JSON
     * @param {Object} sessionData - Session data to import
     */
    async importSession(sessionData) {
        try {
            // Validate session data
            if (!sessionData.youtubeUrl || !Array.isArray(sessionData.chops)) {
                throw new Error('Invalid session data format');
            }
            
            // Generate new ID for imported session
            const newSessionId = this.generateSessionId();
            const importedSession = {
                ...sessionData,
                id: newSessionId,
                name: `${sessionData.name} (Imported)`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const sessions = await this.getAllSessions();
            sessions[newSessionId] = importedSession;
            
            localStorage.setItem(this.storageKey, JSON.stringify(sessions));
            
            console.log(`📥 Session imported: ${importedSession.name}`);
            
            return {
                success: true,
                sessionId: newSessionId,
                session: importedSession
            };
            
        } catch (error) {
            console.error('Failed to import session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Extract video ID from YouTube URL
     * @param {string} url - YouTube URL
     */
    extractVideoId(url) {
        const match = url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
        return match ? match[1] : null;
    }

    /**
     * Clear all sessions (for debugging)
     */
    clearAllSessions() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.currentSessionKey);
        console.log('🗑️ All sessions cleared');
    }

    /**
     * Get session statistics
     */
    async getSessionStats() {
        const sessions = await this.getAllSessions();
        const sessionList = Object.values(sessions);
        
        return {
            totalSessions: sessionList.length,
            totalChops: sessionList.reduce((sum, session) => sum + session.chops.length, 0),
            oldestSession: sessionList.length > 0 ? 
                sessionList.reduce((oldest, session) => 
                    new Date(session.createdAt) < new Date(oldest.createdAt) ? session : oldest
                ).createdAt : null,
            newestSession: sessionList.length > 0 ? 
                sessionList.reduce((newest, session) => 
                    new Date(session.createdAt) > new Date(newest.createdAt) ? session : newest
                ).createdAt : null
        };
    }
}

export default new SessionManager();
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, FolderOpen, Download, Upload, Trash2, Plus, Clock, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import sessionManager from '../../services/SessionManager.js';

export default function SessionManager({ 
    currentSession, 
    onLoadSession, 
    onNewSession,
    isOpen,
    onClose 
}) {
    const [sessions, setSessions] = useState({});
    const [sessionName, setSessionName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Load sessions on mount
    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        const allSessions = await sessionManager.getAllSessions();
        setSessions(allSessions);
    };

    const handleSaveSession = async () => {
        if (!currentSession.youtubeUrl) {
            setMessage({ type: 'error', text: 'No video loaded to save' });
            return;
        }

        if (!sessionName.trim()) {
            setMessage({ type: 'error', text: 'Please enter a session name' });
            return;
        }

        setIsLoading(true);
        const result = await sessionManager.saveSession(currentSession, sessionName.trim());
        
        if (result.success) {
            setMessage({ type: 'success', text: `Session "${result.sessionName}" saved successfully!` });
            setSessionName('');
            await loadSessions();
        } else {
            setMessage({ type: 'error', text: `Failed to save session: ${result.error}` });
        }
        
        setIsLoading(false);
    };

    const handleLoadSession = async (sessionId) => {
        setIsLoading(true);
        const result = await sessionManager.loadSession(sessionId);
        
        if (result.success) {
            onLoadSession(result.session);
            setMessage({ type: 'success', text: `Session "${result.session.name}" loaded successfully!` });
            onClose();
        } else {
            setMessage({ type: 'error', text: `Failed to load session: ${result.error}` });
        }
        
        setIsLoading(false);
    };

    const handleDeleteSession = async (sessionId) => {
        const result = await sessionManager.deleteSession(sessionId);
        
        if (result.success) {
            setMessage({ type: 'success', text: `Session "${result.sessionName}" deleted` });
            await loadSessions();
        } else {
            setMessage({ type: 'error', text: `Failed to delete session: ${result.error}` });
        }
        
        setShowDeleteConfirm(null);
    };

    const handleExportSession = async (sessionId) => {
        const result = await sessionManager.exportSession(sessionId);
        
        if (result.success) {
            // Create download link
            const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setMessage({ type: 'success', text: 'Session exported successfully!' });
        } else {
            setMessage({ type: 'error', text: `Failed to export session: ${result.error}` });
        }
    };

    const handleImportSession = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const sessionData = JSON.parse(e.target.result);
                const result = await sessionManager.importSession(sessionData);
                
                if (result.success) {
                    setMessage({ type: 'success', text: `Session "${result.session.name}" imported successfully!` });
                    await loadSessions();
                } else {
                    setMessage({ type: 'error', text: `Failed to import session: ${result.error}` });
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Invalid session file format' });
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const sessionList = Object.values(sessions).sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FolderOpen className="w-6 h-6 text-cyan-400" />
                            <h2 className="text-xl font-bold text-white">Session Manager</h2>
                        </div>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white"
                        >
                            ×
                        </Button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                    {/* Message Display */}
                    <AnimatePresence>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-4"
                            >
                                <Alert className={`border ${
                                    message.type === 'success' ? 'border-green-400 bg-green-400/10' : 'border-red-400 bg-red-400/10'
                                }`}>
                                    <AlertDescription className={
                                        message.type === 'success' ? 'text-green-200' : 'text-red-200'
                                    }>
                                        {message.text}
                                    </AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Save New Session */}
                    <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Save className="w-5 h-5 text-cyan-400" />
                            Save Current Session
                        </h3>
                        <div className="flex gap-3">
                            <Input
                                placeholder="Enter session name..."
                                value={sessionName}
                                onChange={(e) => setSessionName(e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveSession()}
                            />
                            <Button
                                onClick={handleSaveSession}
                                disabled={isLoading || !sessionName.trim()}
                                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
                            >
                                {isLoading ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                        {currentSession.chops?.length > 0 && (
                            <p className="text-sm text-white/60 mt-2">
                                Current session has {currentSession.chops.length} chops
                            </p>
                        )}
                    </div>

                    {/* Import/Export */}
                    <div className="mb-6 flex gap-3">
                        <label className="flex-1">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImportSession}
                                className="hidden"
                            />
                            <Button
                                as="span"
                                variant="outline"
                                className="w-full border-white/20 text-white hover:bg-white/10"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Import Session
                            </Button>
                        </label>
                        <Button
                            onClick={onNewSession}
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Session
                        </Button>
                    </div>

                    {/* Sessions List */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">
                            Saved Sessions ({sessionList.length})
                        </h3>
                        
                        {sessionList.length === 0 ? (
                            <div className="text-center py-8 text-white/60">
                                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No saved sessions yet</p>
                                <p className="text-sm">Create your first session by saving your current work</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sessionList.map((session) => (
                                    <motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-white mb-1">{session.name}</h4>
                                                <div className="flex items-center gap-4 text-sm text-white/60 mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Video className="w-3 h-3" />
                                                        {session.videoId}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(session.updatedAt)}
                                                    </span>
                                                    <span>{session.chops.length} chops</span>
                                                </div>
                                                <p className="text-xs text-white/40 truncate">
                                                    {session.youtubeUrl}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <Button
                                                    onClick={() => handleLoadSession(session.id)}
                                                    size="sm"
                                                    className="bg-cyan-500 hover:bg-cyan-600 text-black"
                                                >
                                                    Load
                                                </Button>
                                                <Button
                                                    onClick={() => handleExportSession(session.id)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-white/20 text-white hover:bg-white/10"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    onClick={() => setShowDeleteConfirm(session.id)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-red-400/20 text-red-400 hover:bg-red-400/10"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center"
                        onClick={() => setShowDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-black/90 border border-red-400/20 rounded-lg p-6 max-w-md mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold text-white mb-3">Delete Session</h3>
                            <p className="text-white/70 mb-4">
                                Are you sure you want to delete this session? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    variant="outline"
                                    className="border-white/20 text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleDeleteSession(showDeleteConfirm)}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                    Delete
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
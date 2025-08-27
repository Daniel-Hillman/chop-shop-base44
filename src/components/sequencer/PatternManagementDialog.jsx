/**
 * @fileoverview Pattern Management Dialog Component
 * Provides UI for saving, loading, duplicating, and deleting patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  FolderOpen, 
  Copy, 
  Trash2, 
  Download, 
  Upload, 
  Plus,
  X,
  Edit3,
  Clock,
  Music,
  AlertCircle,
  Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { PatternStorageService } from '../../services/sequencer/PatternStorageService.js';

/**
 * Pattern Management Dialog Component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {Function} props.onClose - Close dialog callback
 * @param {Function} props.onPatternLoad - Pattern load callback
 * @param {Function} props.onPatternSave - Pattern save callback
 * @param {Function} props.onPatternDuplicate - Pattern duplicate callback
 * @param {Function} props.onPatternDelete - Pattern delete callback
 * @param {import('../../types/sequencer.js').Pattern} props.currentPattern - Current pattern
 * @param {import('../../types/sequencer.js').Pattern[]} props.patterns - Available patterns
 */
export default function PatternManagementDialog({
  isOpen = false,
  onClose,
  onPatternLoad,
  onPatternSave,
  onPatternDuplicate,
  onPatternDelete,
  currentPattern = null,
  patterns = []
}) {
  // State management
  const [activeTab, setActiveTab] = useState('load');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  
  // Pattern editing state
  const [editingPattern, setEditingPattern] = useState(null);
  const [patternName, setPatternName] = useState('');
  const [selectedPatterns, setSelectedPatterns] = useState(new Set());
  
  // File import/export state
  const [dragOver, setDragOver] = useState(false);
  
  // Services
  const [storageService] = useState(() => new PatternStorageService());

  // Load storage stats on mount
  useEffect(() => {
    if (isOpen) {
      loadStorageStats();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Load storage statistics
  const loadStorageStats = useCallback(async () => {
    try {
      const stats = await storageService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  }, [storageService]);

  // Clear messages after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle pattern save
  const handleSavePattern = useCallback(async () => {
    if (!currentPattern) {
      setError('No pattern to save');
      return;
    }

    if (!patternName.trim()) {
      setError('Pattern name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const patternToSave = {
        ...currentPattern,
        name: patternName.trim(),
        metadata: {
          ...currentPattern.metadata,
          modified: new Date().toISOString()
        }
      };

      await onPatternSave?.(patternToSave);
      await loadStorageStats();
      
      setSuccess(`Pattern "${patternName}" saved successfully`);
      setPatternName('');
      setActiveTab('load');
    } catch (error) {
      console.error('Failed to save pattern:', error);
      setError(`Failed to save pattern: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPattern, patternName, onPatternSave, loadStorageStats]);

  // Handle pattern load
  const handleLoadPattern = useCallback(async (pattern) => {
    try {
      setIsLoading(true);
      setError(null);

      await onPatternLoad?.(pattern.id);
      setSuccess(`Pattern "${pattern.name}" loaded successfully`);
      onClose?.();
    } catch (error) {
      console.error('Failed to load pattern:', error);
      setError(`Failed to load pattern: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onPatternLoad, onClose]);

  // Handle pattern duplicate
  const handleDuplicatePattern = useCallback(async (pattern) => {
    const newName = `${pattern.name} (Copy)`;
    
    try {
      setIsLoading(true);
      setError(null);

      await onPatternDuplicate?.(pattern.id, newName);
      await loadStorageStats();
      
      setSuccess(`Pattern duplicated as "${newName}"`);
    } catch (error) {
      console.error('Failed to duplicate pattern:', error);
      setError(`Failed to duplicate pattern: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onPatternDuplicate, loadStorageStats]);

  // Handle pattern delete
  const handleDeletePattern = useCallback(async (pattern) => {
    if (!confirm(`Are you sure you want to delete "${pattern.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await onPatternDelete?.(pattern.id);
      await loadStorageStats();
      
      setSuccess(`Pattern "${pattern.name}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete pattern:', error);
      setError(`Failed to delete pattern: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onPatternDelete, loadStorageStats]);

  // Handle pattern export
  const handleExportPattern = useCallback(async (pattern) => {
    try {
      setIsLoading(true);
      setError(null);

      const exportData = await storageService.exportPattern(pattern.id);
      
      // Create and download file
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pattern.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`Pattern "${pattern.name}" exported successfully`);
    } catch (error) {
      console.error('Failed to export pattern:', error);
      setError(`Failed to export pattern: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [storageService]);

  // Handle pattern import from file
  const handleImportFile = useCallback(async (file) => {
    try {
      setIsLoading(true);
      setError(null);

      const text = await file.text();
      const importedIds = await storageService.importPattern(text, {
        generateNewIds: true,
        overwrite: false
      });

      await loadStorageStats();
      setSuccess(`Successfully imported ${importedIds.length} pattern(s)`);
    } catch (error) {
      console.error('Failed to import pattern:', error);
      setError(`Failed to import pattern: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [storageService, loadStorageStats]);

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFiles = files.filter(file => file.type === 'application/json' || file.name.endsWith('.json'));

    if (jsonFiles.length === 0) {
      setError('Please drop JSON files only');
      return;
    }

    // Import first JSON file
    handleImportFile(jsonFiles[0]);
  }, [handleImportFile]);

  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white">Pattern Management</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Storage Stats */}
          {storageStats && (
            <div className="px-6 py-3 bg-white/5 border-b border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">
                  {storageStats.patternCount} patterns • {formatFileSize(storageStats.storageSize)} used
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${Math.min(storageStats.usagePercentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-white/70 min-w-[3rem]">
                    {storageStats.usagePercentage}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {[
              { id: 'load', label: 'Load Pattern', icon: FolderOpen },
              { id: 'save', label: 'Save Pattern', icon: Save },
              { id: 'import', label: 'Import/Export', icon: Upload }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'text-white bg-white/10 border-b-2 border-blue-400'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Error/Success Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-200 text-sm">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-green-200 text-sm">{success}</span>
              </motion.div>
            )}

            {/* Load Pattern Tab */}
            {activeTab === 'load' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Saved Patterns</h3>
                  <span className="text-sm text-white/70">{patterns.length} patterns</span>
                </div>

                {patterns.length === 0 ? (
                  <div className="text-center py-12">
                    <Music className="w-12 h-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/70">No saved patterns found</p>
                    <p className="text-white/50 text-sm mt-2">Create and save a pattern to get started</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {patterns.map((pattern) => (
                      <motion.div
                        key={pattern.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">{pattern.name}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-white/70">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(pattern.metadata?.modified)}
                              </span>
                              <span>{pattern.bpm} BPM</span>
                              <span>{pattern.tracks?.length || 0} tracks</span>
                              <span>1/{pattern.stepResolution}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadPattern(pattern)}
                              disabled={isLoading}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicatePattern(pattern)}
                              disabled={isLoading}
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportPattern(pattern)}
                              disabled={isLoading}
                              className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePattern(pattern)}
                              disabled={isLoading}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save Pattern Tab */}
            {activeTab === 'save' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Save Current Pattern</h3>
                  
                  {currentPattern ? (
                    <div className="space-y-4">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-2">Current Pattern Info</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                          <div>BPM: {currentPattern.bpm}</div>
                          <div>Swing: {currentPattern.swing}%</div>
                          <div>Tracks: {currentPattern.tracks?.length || 0}</div>
                          <div>Resolution: 1/{currentPattern.stepResolution}</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Pattern Name
                        </label>
                        <input
                          type="text"
                          value={patternName}
                          onChange={(e) => setPatternName(e.target.value)}
                          placeholder="Enter pattern name..."
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          maxLength={50}
                        />
                        <div className="text-xs text-white/50 mt-1">
                          {patternName.length}/50 characters
                        </div>
                      </div>

                      <Button
                        onClick={handleSavePattern}
                        disabled={isLoading || !patternName.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Pattern'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Save className="w-12 h-12 text-white/30 mx-auto mb-4" />
                      <p className="text-white/70">No pattern to save</p>
                      <p className="text-white/50 text-sm mt-2">Create a pattern first to save it</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Import/Export Tab */}
            {activeTab === 'import' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Import Patterns</h3>
                  
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver
                        ? 'border-blue-400 bg-blue-500/10'
                        : 'border-white/30 hover:border-white/50'
                    }`}
                  >
                    <Upload className="w-12 h-12 text-white/50 mx-auto mb-4" />
                    <p className="text-white/70 mb-2">
                      Drag and drop JSON files here, or click to select
                    </p>
                    <p className="text-white/50 text-sm mb-4">
                      Supports pattern files exported from this sequencer
                    </p>
                    
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportFile(file);
                        e.target.value = '';
                      }}
                      className="hidden"
                      id="pattern-import"
                    />
                    <label
                      htmlFor="pattern-import"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Select Files
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Export All Patterns</h3>
                  <p className="text-white/70 text-sm mb-4">
                    Export all your saved patterns as a single JSON file for backup or sharing.
                  </p>
                  
                  <Button
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        const exportData = await storageService.exportAllPatterns();
                        
                        const blob = new Blob([exportData], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `sequencer_patterns_${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        setSuccess('All patterns exported successfully');
                      } catch (error) {
                        setError(`Failed to export patterns: ${error.message}`);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading || patterns.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isLoading ? 'Exporting...' : 'Export All Patterns'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
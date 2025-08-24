import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Pause, Check, X, RotateCcw } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

/**
 * TimestampEditor - Component for editing sample timestamps with real-time preview
 * Implements requirements 3.1, 3.2, 3.3, 3.4 for manual timestamp editing
 */
export default function TimestampEditor({
    chop,
    audioDuration,
    onSave,
    onCancel,
    onPreview,
    isPreviewPlaying = false,
    className = ''
}) {
    const [startTime, setStartTime] = useState(chop?.startTime || 0);
    const [endTime, setEndTime] = useState(chop?.endTime || 0);
    const [errors, setErrors] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const startInputRef = useRef(null);
    const endInputRef = useRef(null);

    // Initialize values when chop changes
    useEffect(() => {
        if (chop) {
            setStartTime(chop.startTime);
            setEndTime(chop.endTime);
            setHasChanges(false);
            setErrors({});
        }
    }, [chop]);

    // Format time for display (MM:SS.mmm)
    const formatTime = useCallback((seconds) => {
        if (isNaN(seconds) || seconds < 0) return '00:00.000';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }, []);

    // Parse time from input (supports MM:SS.mmm or just seconds)
    const parseTime = useCallback((timeString) => {
        if (!timeString) return 0;
        
        // Handle MM:SS.mmm format first
        const timeMatch = timeString.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/);
        if (timeMatch) {
            const [, minutes, seconds, milliseconds = '0'] = timeMatch;
            const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds.padEnd(3, '0')) / 1000;
            return Math.max(0, totalSeconds);
        }
        
        // Handle pure number input (seconds)
        const numericValue = parseFloat(timeString);
        if (!isNaN(numericValue)) {
            return Math.max(0, numericValue);
        }
        
        return 0;
    }, []);

    // Validate timestamp values
    const validateTimestamps = useCallback((start, end) => {
        const newErrors = {};
        
        if (start < 0) {
            newErrors.startTime = 'Start time cannot be negative';
        }
        
        if (end < 0) {
            newErrors.endTime = 'End time cannot be negative';
        }
        
        if (audioDuration && start >= audioDuration) {
            newErrors.startTime = `Start time cannot exceed audio duration (${formatTime(audioDuration)})`;
        }
        
        if (audioDuration && end > audioDuration) {
            newErrors.endTime = `End time cannot exceed audio duration (${formatTime(audioDuration)})`;
        }
        
        if (start >= end) {
            newErrors.endTime = 'End time must be greater than start time';
        }
        
        const duration = end - start;
        if (duration < 0.1) {
            newErrors.endTime = 'Sample must be at least 0.1 seconds long';
        }
        
        if (duration > 30) {
            newErrors.endTime = 'Sample cannot be longer than 30 seconds';
        }
        
        return newErrors;
    }, [audioDuration, formatTime]);

    // Handle start time change
    const handleStartTimeChange = useCallback((value) => {
        const newStartTime = parseTime(value);
        setStartTime(newStartTime);
        setHasChanges(true);
        
        const newErrors = validateTimestamps(newStartTime, endTime);
        setErrors(newErrors);
    }, [endTime, parseTime, validateTimestamps]);

    // Handle end time change
    const handleEndTimeChange = useCallback((value) => {
        const newEndTime = parseTime(value);
        setEndTime(newEndTime);
        setHasChanges(true);
        
        const newErrors = validateTimestamps(startTime, newEndTime);
        setErrors(newErrors);
    }, [startTime, parseTime, validateTimestamps]);

    // Handle save
    const handleSave = useCallback(() => {
        const validationErrors = validateTimestamps(startTime, endTime);
        
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        onSave({
            ...chop,
            startTime,
            endTime
        });
    }, [chop, startTime, endTime, validateTimestamps, onSave]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        setStartTime(chop?.startTime || 0);
        setEndTime(chop?.endTime || 0);
        setHasChanges(false);
        setErrors({});
        onCancel();
    }, [chop, onCancel]);

    // Handle reset to original values
    const handleReset = useCallback(() => {
        setStartTime(chop?.startTime || 0);
        setEndTime(chop?.endTime || 0);
        setHasChanges(false);
        setErrors({});
    }, [chop]);

    // Handle preview
    const handlePreview = useCallback(() => {
        if (Object.keys(errors).length > 0) return;
        
        onPreview({
            startTime,
            endTime,
            duration: endTime - startTime
        });
    }, [startTime, endTime, errors, onPreview]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSave();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            } else if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handlePreview();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave, handleCancel, handlePreview]);

    if (!chop) return null;

    const duration = endTime - startTime;
    const hasValidationErrors = Object.keys(errors).length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`bg-black/80 backdrop-blur-lg border border-white/20 rounded-lg p-4 ${className}`}
        >
            <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-medium text-white">
                    Edit Timestamp - Pad {chop.padId}
                </h3>
                {hasChanges && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                )}
            </div>

            <div className="space-y-4">
                {/* Start Time Input */}
                <div>
                    <label className="block text-xs text-gray-300 mb-1">
                        Start Time
                    </label>
                    <Input
                        ref={startInputRef}
                        type="text"
                        value={formatTime(startTime)}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        placeholder="00:00.000"
                        className={`bg-black/40 border-white/20 text-white ${
                            errors.startTime ? 'border-red-500' : ''
                        }`}
                    />
                    {errors.startTime && (
                        <p className="text-xs text-red-400 mt-1">{errors.startTime}</p>
                    )}
                </div>

                {/* End Time Input */}
                <div>
                    <label className="block text-xs text-gray-300 mb-1">
                        End Time
                    </label>
                    <Input
                        ref={endInputRef}
                        type="text"
                        value={formatTime(endTime)}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        placeholder="00:00.000"
                        className={`bg-black/40 border-white/20 text-white ${
                            errors.endTime ? 'border-red-500' : ''
                        }`}
                    />
                    {errors.endTime && (
                        <p className="text-xs text-red-400 mt-1">{errors.endTime}</p>
                    )}
                </div>

                {/* Duration Display */}
                <div className="bg-black/20 rounded p-2">
                    <div className="flex justify-between text-xs text-gray-300">
                        <span>Duration:</span>
                        <span className={duration > 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatTime(duration)}
                        </span>
                    </div>
                </div>

                {/* Preview Button */}
                <Button
                    onClick={handlePreview}
                    disabled={hasValidationErrors}
                    variant="outline"
                    size="sm"
                    className="w-full bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30"
                >
                    {isPreviewPlaying ? (
                        <>
                            <Pause className="w-3 h-3 mr-2" />
                            Stop Preview
                        </>
                    ) : (
                        <>
                            <Play className="w-3 h-3 mr-2" />
                            Preview Sample
                        </>
                    )}
                </Button>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || hasValidationErrors}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Check className="w-3 h-3 mr-2" />
                        Save
                    </Button>
                    
                    {hasChanges && (
                        <Button
                            onClick={handleReset}
                            variant="outline"
                            size="sm"
                            className="bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/30"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </Button>
                    )}
                    
                    <Button
                        onClick={handleCancel}
                        variant="outline"
                        size="sm"
                        className="bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30"
                    >
                        <X className="w-3 h-3" />
                    </Button>
                </div>

                {/* Keyboard Shortcuts Help */}
                <div className="text-xs text-gray-400 space-y-1">
                    <div>Ctrl+Enter: Save • Escape: Cancel • Ctrl+Space: Preview</div>
                    <div>Format: MM:SS.mmm or seconds (e.g., "1:30.500" or "90.5")</div>
                </div>
            </div>
        </motion.div>
    );
}
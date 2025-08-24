import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Clock, Trash2 } from 'lucide-react';

export default function TriggerPad({ 
    padId, 
    keyLabel, 
    isAssigned, 
    isSelected, 
    color, 
    onClick, 
    onEdit,
    onDelete,
    chop,
    isPreloaded = false,
    latencyStatus = 'unknown',
    isPressed = false,
    lastPlayTime = null
}) {
    const [isTriggered, setIsTriggered] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

    const handleClick = () => {
        onClick();
        setIsTriggered(true);
        setShowContextMenu(false);
    };

    const handleContextMenu = useCallback((e) => {
        if (!isAssigned) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenuPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setShowContextMenu(true);
    }, [isAssigned]);

    const handleEdit = useCallback((e) => {
        e.stopPropagation();
        setShowContextMenu(false);
        if (onEdit) onEdit(padId);
    }, [padId, onEdit]);

    const handleDelete = useCallback((e) => {
        e.stopPropagation();
        setShowContextMenu(false);
        if (onDelete) onDelete(padId);
    }, [padId, onDelete]);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowContextMenu(false);
        if (showContextMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showContextMenu]);

    // Format time for display
    const formatTime = useCallback((seconds) => {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        if (isTriggered) {
            const timer = setTimeout(() => setIsTriggered(false), 150);
            return () => clearTimeout(timer);
        }
    }, [isTriggered]);

    const padVariants = {
        idle: { scale: 1, boxShadow: '0px 4px 10px rgba(0,0,0,0.3)' },
        triggered: { scale: 0.95, boxShadow: `0px 0px 20px ${color || '#06b6d4'}` },
    };

    return (
        <div className="relative w-full h-full">
            <motion.button
                variants={padVariants}
                animate={isTriggered ? 'triggered' : 'idle'}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                className={`relative w-full h-full rounded-lg transition-all duration-200 focus:outline-none flex flex-col justify-between p-2
                    ${isSelected ? 'ring-2 ring-offset-2 ring-offset-black/20 ring-cyan-400' : ''}
                    ${isAssigned ? 'bg-white/20' : 'bg-black/30'}
                `}
                style={{
                    backgroundColor: isAssigned ? `${color}4D` : '', // 4D for 30% alpha
                    border: `1px solid ${isAssigned ? color : 'rgba(255,255,255,0.2)'}`
                }}
            >
                <span className="absolute top-1 left-2 text-xs font-mono text-white/40">{padId}</span>
                
                {/* Performance Indicators */}
                <div className="absolute top-1 right-2 flex gap-1 items-center">
                    {/* Preload Status */}
                    {isPreloaded && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" 
                             title="Sample preloaded for ultra-low latency" />
                    )}
                    
                    {/* Latency Status */}
                    <div className={`w-2 h-2 rounded-full ${
                        latencyStatus === 'excellent' ? 'bg-green-400' :
                        latencyStatus === 'good' ? 'bg-blue-400' :
                        latencyStatus === 'acceptable' ? 'bg-yellow-400' :
                        latencyStatus === 'poor' ? 'bg-orange-400' :
                        latencyStatus === 'unacceptable' ? 'bg-red-400 animate-pulse' :
                        'bg-gray-400'
                    }`} title={`Latency: ${latencyStatus}`} />
                    
                    {/* Edit indicator for assigned pads */}
                    {isAssigned && onEdit && (
                        <Edit3 className="w-3 h-3 text-white/30" />
                    )}
                </div>
                
                <span className="text-2xl font-bold text-white/80 self-center">{keyLabel?.toUpperCase()}</span>
                
                {/* Timestamp display for assigned pads */}
                {isAssigned && chop && (
                    <div className="absolute bottom-6 left-2 right-2 text-xs text-white/60 text-center flex items-center justify-center gap-1">
                        {isPreloaded && <span className="text-green-300">⚡</span>}
                        {formatTime(chop.startTime)} - {formatTime(chop.endTime)}
                    </div>
                )}
                
                <div className="w-full h-1 absolute bottom-1 left-0" >
                    {isAssigned && (
                        <div 
                            className="h-full rounded-full mx-auto" 
                            style={{backgroundColor: color, width: '30%'}}
                        />
                    )}
                </div>
            </motion.button>

            {/* Context Menu */}
            <AnimatePresence>
                {showContextMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute z-50 bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg py-1 min-w-[120px]"
                        style={{
                            left: Math.min(contextMenuPosition.x, window.innerWidth - 140),
                            top: Math.min(contextMenuPosition.y, window.innerHeight - 80)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleEdit}
                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                        >
                            <Clock className="w-3 h-3" />
                            Edit Timestamp
                        </button>
                        <button
                            onClick={handleDelete}
                            className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/20 flex items-center gap-2"
                        >
                            <Trash2 className="w-3 h-3" />
                            Delete Sample
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
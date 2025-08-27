import React, { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Headphones, Edit3, Palette } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Track controls component for individual track management
 * Provides volume, mute, solo, naming, and color assignment per track
 */
const TrackControls = memo(function TrackControls({
  tracks = [],
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onTrackNameChange,
  onTrackColorChange,
  className = ''
}) {
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [tempTrackName, setTempTrackName] = useState('');

  // Handle volume slider change
  const handleVolumeChange = useCallback((trackId, volume) => {
    onVolumeChange?.(trackId, volume);
  }, [onVolumeChange]);

  // Handle mute toggle
  const handleMuteToggle = useCallback((trackId) => {
    onMuteToggle?.(trackId);
  }, [onMuteToggle]);

  // Handle solo toggle
  const handleSoloToggle = useCallback((trackId) => {
    onSoloToggle?.(trackId);
  }, [onSoloToggle]);

  // Handle track name editing
  const handleNameEditStart = useCallback((track) => {
    setEditingTrackId(track.id);
    setTempTrackName(track.name);
  }, []);

  const handleNameEditCancel = useCallback(() => {
    setEditingTrackId(null);
    setTempTrackName('');
  }, []);

  const handleNameEditSave = useCallback(() => {
    if (editingTrackId && tempTrackName.trim()) {
      onTrackNameChange?.(editingTrackId, tempTrackName.trim());
    }
    setEditingTrackId(null);
    setTempTrackName('');
  }, [editingTrackId, tempTrackName, onTrackNameChange]);

  const handleNameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleNameEditSave();
    } else if (e.key === 'Escape') {
      handleNameEditCancel();
    }
  }, [handleNameEditSave, handleNameEditCancel]);

  // Handle color change
  const handleColorChange = useCallback((trackId, color) => {
    onTrackColorChange?.(trackId, color);
  }, [onTrackColorChange]);

  // Predefined color palette
  const colorPalette = [
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#ec4899', // pink-500
    '#84cc16', // lime-500
  ];

  if (!tracks || tracks.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-white/40 text-sm">
          No tracks available
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {tracks.map((track, index) => (
        <div
          key={track.id}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 space-y-2"
        >
          {/* Track Header */}
          <div className="flex items-center justify-between">
            {/* Track Name */}
            <div className="flex items-center gap-2 flex-1">
              <div 
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: track.color || '#06b6d4' }}
              />
              {editingTrackId === track.id ? (
                <input
                  type="text"
                  value={tempTrackName}
                  onChange={(e) => setTempTrackName(e.target.value)}
                  onBlur={handleNameEditSave}
                  onKeyDown={handleNameKeyDown}
                  className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white
                    focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50
                    transition-all duration-200"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleNameEditStart(track)}
                  className="text-sm font-medium text-white hover:text-cyan-400 
                    transition-colors duration-200 flex items-center gap-1"
                >
                  {track.name}
                  <Edit3 className="w-3 h-3 opacity-50" />
                </button>
              )}
            </div>

            {/* Color Picker */}
            <div className="relative group">
              <button className="p-1 rounded hover:bg-white/10 transition-colors duration-200">
                <Palette className="w-4 h-4 text-white/60" />
              </button>
              <div className="absolute right-0 top-8 bg-black/80 backdrop-blur-lg border border-white/20 
                rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible
                transition-all duration-200 z-10">
                <div className="grid grid-cols-4 gap-1">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(track.id, color)}
                      className={`w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-110
                        ${track.color === color ? 'border-white' : 'border-white/20'}
                      `}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/60">Volume</label>
              <span className="text-xs font-mono text-white/60">
                {Math.round((track.volume || 0.8) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-white/40" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={track.volume || 0.8}
                onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                  transition-opacity duration-200"
                style={{
                  background: `linear-gradient(to right, ${track.color || '#06b6d4'} 0%, 
                    ${track.color || '#06b6d4'} ${(track.volume || 0.8) * 100}%, 
                    rgba(255,255,255,0.1) ${(track.volume || 0.8) * 100}%, 
                    rgba(255,255,255,0.1) 100%)`
                }}
              />
              <Volume2 className="w-4 h-4 text-white/40" />
            </div>
          </div>

          {/* Mute/Solo Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleMuteToggle(track.id)}
              variant="outline"
              size="sm"
              className={`flex-1 border-white/20 text-white transition-all duration-200 ${
                track.mute 
                  ? 'bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30' 
                  : 'hover:bg-white/10 hover:text-white'
              }`}
            >
              <VolumeX className="w-3 h-3 mr-1" />
              {track.mute ? 'Muted' : 'Mute'}
            </Button>
            
            <Button
              onClick={() => handleSoloToggle(track.id)}
              variant="outline"
              size="sm"
              className={`flex-1 border-white/20 text-white transition-all duration-200 ${
                track.solo 
                  ? 'bg-yellow-500/20 border-yellow-400/40 text-yellow-200 hover:bg-yellow-500/30' 
                  : 'hover:bg-white/10 hover:text-white'
              }`}
            >
              <Headphones className="w-3 h-3 mr-1" />
              {track.solo ? 'Solo' : 'Solo'}
            </Button>
          </div>

          {/* Track Info */}
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Sample: {track.sampleId || 'None'}</span>
            <span>Steps: {track.steps?.filter(step => step.active).length || 0}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

export default TrackControls;
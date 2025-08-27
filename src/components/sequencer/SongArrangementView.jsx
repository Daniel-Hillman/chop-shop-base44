/**
 * @fileoverview Song arrangement view component
 * Displays and manages song structure with pattern blocks
 */

import React, { useState, useCallback, useEffect } from 'react';

/**
 * Song arrangement view component
 */
const SongArrangementView = ({
  song,
  patterns,
  currentSectionIndex = 0,
  onSectionSelect,
  onSectionUpdate,
  onSectionMove,
  onSectionAdd,
  onSectionRemove,
  className = ''
}) => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Handle section selection
  const handleSectionClick = useCallback((sectionIndex) => {
    setSelectedSection(sectionIndex);
    onSectionSelect?.(sectionIndex);
  }, [onSectionSelect]);

  // Handle section reordering (simplified without drag and drop for now)
  const handleMoveSection = useCallback((index, direction) => {
    if (!song || !song.patterns) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= song.patterns.length) return;
    
    onSectionMove?.(index, newIndex);
  }, [song, onSectionMove]);

  // Handle section property updates
  const handleSectionUpdate = useCallback((sectionIndex, updates) => {
    onSectionUpdate?.(sectionIndex, updates);
  }, [onSectionUpdate]);

  // Handle adding new section
  const handleAddSection = useCallback((patternId, options = {}) => {
    onSectionAdd?.(patternId, options);
    setShowAddDialog(false);
  }, [onSectionAdd]);

  // Handle removing section
  const handleRemoveSection = useCallback((sectionIndex) => {
    if (window.confirm('Are you sure you want to remove this section?')) {
      onSectionRemove?.(sectionIndex);
      if (selectedSection === sectionIndex) {
        setSelectedSection(null);
      }
    }
  }, [onSectionRemove, selectedSection]);

  if (!song) {
    return (
      <div className={`song-arrangement-empty ${className}`}>
        <div className="text-center py-8">
          <p className="text-white/60 mb-4">No song loaded</p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Create New Song
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`song-arrangement ${className}`}>
      {/* Song header */}
      <div className="song-header mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{song.name}</h3>
            <p className="text-sm text-white/60">
              {song.patterns.length} sections • {Math.round(song.metadata.totalDuration)}s
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
          >
            Add Section
          </button>
        </div>
      </div>

      {/* Pattern sections */}
      <div className="song-sections flex gap-2 p-2 rounded-lg overflow-x-auto">
        {song.patterns.map((section, index) => (
          <div key={section.id} className="section-block flex-shrink-0">
            <SectionBlock
              section={section}
              index={index}
              pattern={patterns.find(p => p.id === section.patternId)}
              isSelected={selectedSection === index}
              isCurrent={currentSectionIndex === index}
              onClick={() => handleSectionClick(index)}
              onUpdate={(updates) => handleSectionUpdate(index, updates)}
              onRemove={() => handleRemoveSection(index)}
              onMoveUp={index > 0 ? () => handleMoveSection(index, 'up') : null}
              onMoveDown={index < song.patterns.length - 1 ? () => handleMoveSection(index, 'down') : null}
            />
          </div>
        ))}
      </div>

      {/* Add section dialog */}
      {showAddDialog && (
        <AddSectionDialog
          patterns={patterns}
          onAdd={handleAddSection}
          onCancel={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
};

/**
 * Individual section block component
 */
const SectionBlock = ({
  section,
  index,
  pattern,
  isSelected,
  isCurrent,
  onClick,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleLoopsChange = (newLoops) => {
    onUpdate({ loops: parseInt(newLoops) || 1 });
  };

  const handleTransitionChange = (transitionType) => {
    onUpdate({ transitionType });
  };

  return (
    <div
      className={`section-block relative min-w-32 p-3 rounded-lg border-2 cursor-pointer transition-all ${
        isCurrent
          ? 'border-cyan-400 bg-cyan-500/20'
          : isSelected
          ? 'border-white/40 bg-white/10'
          : 'border-white/20 bg-white/5 hover:bg-white/10'
      }`}
      onClick={onClick}
    >
      {/* Section number */}
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center">
        {index + 1}
      </div>

      {/* Control buttons */}
      <div className="absolute -top-2 -right-2 flex gap-1">
        {onMoveUp && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            title="Move left"
          >
            ←
          </button>
        )}
        {onMoveDown && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            title="Move right"
          >
            →
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          title="Remove section"
        >
          ×
        </button>
      </div>

      {/* Pattern info */}
      <div className="mb-2">
        <h4 className="text-sm font-medium text-white truncate">
          {pattern?.name || 'Unknown Pattern'}
        </h4>
        <p className="text-xs text-white/60">
          {section.loops} loop{section.loops !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Quick controls */}
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <label className="text-xs text-white/60">Loops:</label>
          <input
            type="number"
            min="1"
            max="16"
            value={section.loops}
            onChange={(e) => {
              e.stopPropagation();
              handleLoopsChange(e.target.value);
            }}
            className="w-12 px-1 py-0.5 text-xs bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <label className="text-xs text-white/60">Transition:</label>
          <select
            value={section.transitionType}
            onChange={(e) => {
              e.stopPropagation();
              handleTransitionChange(e.target.value);
            }}
            className="text-xs bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
          >
            <option value="immediate">Immediate</option>
            <option value="fade">Fade</option>
            <option value="crossfade">Crossfade</option>
          </select>
        </div>
      </div>

      {/* Current playback indicator */}
      {isCurrent && (
        <div className="absolute bottom-1 left-1 right-1 h-1 bg-cyan-400 rounded-full">
          <div className="h-full bg-cyan-300 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

/**
 * Add section dialog component
 */
const AddSectionDialog = ({ patterns, onAdd, onCancel }) => {
  const [selectedPatternId, setSelectedPatternId] = useState('');
  const [loops, setLoops] = useState(1);
  const [transitionType, setTransitionType] = useState('immediate');

  const handleAdd = () => {
    if (!selectedPatternId) {
      return;
    }

    onAdd(selectedPatternId, {
      loops: parseInt(loops) || 1,
      transitionType
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg border border-white/20 w-96">
        <h3 className="text-lg font-semibold text-white mb-4">Add Section</h3>

        <div className="space-y-4">
          {/* Pattern selection */}
          <div>
            <label className="block text-sm text-white/80 mb-2">Pattern</label>
            <select
              value={selectedPatternId}
              onChange={(e) => setSelectedPatternId(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
            >
              <option value="">Select a pattern...</option>
              {patterns.map(pattern => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name}
                </option>
              ))}
            </select>
          </div>

          {/* Loops */}
          <div>
            <label className="block text-sm text-white/80 mb-2">Loops</label>
            <input
              type="number"
              min="1"
              max="16"
              value={loops}
              onChange={(e) => setLoops(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Transition type */}
          <div>
            <label className="block text-sm text-white/80 mb-2">Transition</label>
            <select
              value={transitionType}
              onChange={(e) => setTransitionType(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
            >
              <option value="immediate">Immediate</option>
              <option value="fade">Fade</option>
              <option value="crossfade">Crossfade</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedPatternId}
            className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Section
          </button>
        </div>
      </div>
    </div>
  );
};

export default SongArrangementView;
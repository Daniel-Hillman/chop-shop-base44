/**
 * @fileoverview Song mode controls component
 * Provides controls for song mode, pattern chaining, and song management
 */

import React, { useState, useCallback } from 'react';

/**
 * Song mode controls component
 */
const SongModeControls = ({
  songState,
  songs,
  patterns,
  onSongModeToggle,
  onSongLoad,
  onSongCreate,
  onSongDelete,
  onJumpToSection,
  className = ''
}) => {
  const [showSongSelector, setShowSongSelector] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const {
    currentSong,
    isSongMode,
    currentSongPosition,
    currentPatternLoop,
    totalSections,
    currentSection
  } = songState;

  // Handle song mode toggle
  const handleSongModeToggle = useCallback(() => {
    onSongModeToggle?.(!isSongMode);
  }, [isSongMode, onSongModeToggle]);

  // Handle song selection
  const handleSongSelect = useCallback((songId) => {
    onSongLoad?.(songId);
    setShowSongSelector(false);
  }, [onSongLoad]);

  // Handle song creation
  const handleSongCreate = useCallback((songData) => {
    onSongCreate?.(songData);
    setShowCreateDialog(false);
  }, [onSongCreate]);

  // Handle section jump
  const handleSectionJump = useCallback((sectionIndex) => {
    onJumpToSection?.(sectionIndex);
  }, [onJumpToSection]);

  return (
    <div className={`song-mode-controls ${className}`}>
      {/* Song mode toggle */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSongModeToggle}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isSongMode
                ? 'bg-cyan-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Song Mode
          </button>
          
          {isSongMode && currentSong && (
            <div className="text-sm text-white/80">
              Section {currentSongPosition + 1}/{totalSections} • Loop {currentPatternLoop}
            </div>
          )}
        </div>

        {/* Song selector */}
        <div className="relative">
          <button
            onClick={() => setShowSongSelector(!showSongSelector)}
            className="px-3 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
          >
            {currentSong ? currentSong.name : 'Select Song'} ▼
          </button>

          {showSongSelector && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900 border border-white/20 rounded-lg shadow-lg z-10">
              <div className="p-2">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="w-full px-3 py-2 text-left text-cyan-400 hover:bg-white/10 rounded"
                >
                  + Create New Song
                </button>
              </div>
              
              {songs.length > 0 && (
                <>
                  <div className="border-t border-white/10" />
                  <div className="max-h-48 overflow-y-auto">
                    {songs.map(song => (
                      <button
                        key={song.id}
                        onClick={() => handleSongSelect(song.id)}
                        className={`w-full px-3 py-2 text-left hover:bg-white/10 ${
                          currentSong?.id === song.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white'
                        }`}
                      >
                        <div className="font-medium">{song.name}</div>
                        <div className="text-xs text-white/60">
                          {song.patterns.length} sections • {Math.round(song.metadata.totalDuration)}s
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Song progress and controls */}
      {isSongMode && currentSong && (
        <div className="song-progress">
          {/* Section navigation */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-white/60">Sections:</span>
            <div className="flex gap-1">
              {currentSong.patterns.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionJump(index)}
                  className={`w-8 h-8 text-xs rounded transition-colors ${
                    index === currentSongPosition
                      ? 'bg-cyan-500 text-white'
                      : index < currentSongPosition
                      ? 'bg-green-500/60 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                  title={`Section ${index + 1}: ${patterns.find(p => p.id === section.patternId)?.name || 'Unknown'}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Current section info */}
          {currentSection && (
            <div className="current-section-info p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">
                  {patterns.find(p => p.id === currentSection.patternId)?.name || 'Unknown Pattern'}
                </h4>
                <div className="text-sm text-white/60">
                  Loop {currentPatternLoop}/{currentSection.loops}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-white/60">
                <span>Transition: {currentSection.transitionType}</span>
                {currentSection.transitionBars > 0 && (
                  <span>Bars: {currentSection.transitionBars}</span>
                )}
              </div>

              {/* Loop progress bar */}
              <div className="mt-2">
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(currentPatternLoop / currentSection.loops) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create song dialog */}
      {showCreateDialog && (
        <CreateSongDialog
          patterns={patterns}
          onSave={handleSongCreate}
          onCancel={() => setShowCreateDialog(false)}
        />
      )}

      {/* Click outside to close selector */}
      {showSongSelector && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowSongSelector(false)}
        />
      )}
    </div>
  );
};

/**
 * Create song dialog component
 */
const CreateSongDialog = ({ patterns, onSave, onCancel }) => {
  const [songName, setSongName] = useState('');
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const [defaultLoops, setDefaultLoops] = useState(1);
  const [defaultTransition, setDefaultTransition] = useState('immediate');

  const handlePatternToggle = (patternId) => {
    setSelectedPatterns(prev => {
      if (prev.includes(patternId)) {
        return prev.filter(id => id !== patternId);
      } else {
        return [...prev, patternId];
      }
    });
  };

  const handleSave = () => {
    if (!songName.trim() || selectedPatterns.length === 0) {
      return;
    }

    onSave({
      name: songName.trim(),
      patternIds: selectedPatterns,
      defaultLoops,
      defaultTransition
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg border border-white/20 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Create New Song</h3>

        <div className="space-y-4">
          {/* Song name */}
          <div>
            <label className="block text-sm text-white/80 mb-2">Song Name</label>
            <input
              type="text"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              placeholder="Enter song name..."
              className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Pattern selection */}
          <div>
            <label className="block text-sm text-white/80 mb-2">
              Select Patterns ({selectedPatterns.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto border border-white/20 rounded">
              {patterns.map(pattern => (
                <label
                  key={pattern.id}
                  className="flex items-center gap-2 p-2 hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPatterns.includes(pattern.id)}
                    onChange={() => handlePatternToggle(pattern.id)}
                    className="rounded"
                  />
                  <span className="text-white">{pattern.name}</span>
                  <span className="text-xs text-white/60 ml-auto">
                    {pattern.stepResolution} steps
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Default settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/80 mb-2">Default Loops</label>
              <input
                type="number"
                min="1"
                max="16"
                value={defaultLoops}
                onChange={(e) => setDefaultLoops(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">Default Transition</label>
              <select
                value={defaultTransition}
                onChange={(e) => setDefaultTransition(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
              >
                <option value="immediate">Immediate</option>
                <option value="fade">Fade</option>
                <option value="crossfade">Crossfade</option>
              </select>
            </div>
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
            onClick={handleSave}
            disabled={!songName.trim() || selectedPatterns.length === 0}
            className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Song
          </button>
        </div>
      </div>
    </div>
  );
};

export default SongModeControls;
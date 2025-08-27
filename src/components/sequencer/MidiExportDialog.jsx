/**
 * @fileoverview MIDI export dialog component
 * Provides interface for exporting patterns and songs to MIDI format
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Download, Music, Settings, Info } from 'lucide-react';
import { MidiExportService } from '../../services/sequencer/MidiExportService.js';

/**
 * MIDI export dialog component
 */
const MidiExportDialog = ({
    isOpen,
    onClose,
    pattern,
    song,
    patterns = [],
    className = ''
}) => {
    const [exportType, setExportType] = useState('pattern'); // 'pattern' or 'song'
    const [exportOptions, setExportOptions] = useState({
        ticksPerQuarter: 480,
        tempo: 120,
        channel: 9,
        includeSwing: true,
        quantize: true
    });
    const [isExporting, setIsExporting] = useState(false);
    const [exportStats, setExportStats] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const midiExportService = useMemo(() => new MidiExportService(), []);

    // Update export stats when pattern or options change
    useEffect(() => {
        if (pattern && exportType === 'pattern') {
            const stats = midiExportService.getExportStats(pattern);
            setExportStats(stats);

            // Update tempo from pattern only if different
            if (stats.valid && exportOptions.tempo !== pattern.bpm) {
                setExportOptions(prev => ({
                    ...prev,
                    tempo: pattern.bpm
                }));
            }
        } else if (song && exportType === 'song') {
            // Calculate song stats
            const totalDuration = song.metadata.totalDuration || 0;
            const totalSections = song.patterns.length;
            const totalActiveSteps = patterns
                .filter(p => song.patterns.some(s => s.patternId === p.id))
                .reduce((total, p) => {
                    const stats = midiExportService.getExportStats(p);
                    return total + stats.activeSteps;
                }, 0);

            setExportStats({
                valid: totalSections > 0,
                tracks: totalSections,
                activeSteps: totalActiveSteps,
                duration: totalDuration,
                sections: totalSections
            });

            // Update tempo from song only if different
            const songTempo = song.metadata.bpm || 120;
            if (exportOptions.tempo !== songTempo) {
                setExportOptions(prev => ({
                    ...prev,
                    tempo: songTempo
                }));
            }
        }
    }, [pattern, song, patterns, exportType, exportOptions.tempo, midiExportService]);

    // Handle export type change
    const handleExportTypeChange = useCallback((type) => {
        setExportType(type);
    }, []);

    // Handle option changes
    const handleOptionChange = useCallback((key, value) => {
        setExportOptions(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    // Handle export
    const handleExport = useCallback(async () => {
        if (!exportStats?.valid) return;

        try {
            setIsExporting(true);

            let midiData;
            let filename;

            if (exportType === 'pattern' && pattern) {
                midiData = midiExportService.exportPattern(pattern, exportOptions);
                filename = `${pattern.name.replace(/[^a-zA-Z0-9]/g, '_')}.mid`;
            } else if (exportType === 'song' && song) {
                midiData = midiExportService.exportSong(song, patterns, exportOptions);
                filename = `${song.name.replace(/[^a-zA-Z0-9]/g, '_')}.mid`;
            } else {
                throw new Error('Invalid export configuration');
            }

            // Download the file
            midiExportService.downloadMidiFile(midiData, filename);

            // Close dialog after successful export
            setTimeout(() => {
                onClose?.();
            }, 500);

        } catch (error) {
            console.error('MIDI export failed:', error);
            alert(`Export failed: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    }, [exportType, pattern, song, patterns, exportOptions, exportStats, midiExportService, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-gray-900 border border-white/20 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto ${className}`}>
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Music className="w-5 h-5" />
                            Export to MIDI
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-white/60 hover:text-white transition-colors"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Export Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-3">Export Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleExportTypeChange('pattern')}
                                disabled={!pattern}
                                className={`p-3 rounded-lg border transition-colors ${exportType === 'pattern'
                                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-400'
                                    : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <div className="text-sm font-medium">Current Pattern</div>
                                <div className="text-xs text-white/60">
                                    {pattern ? pattern.name : 'No pattern loaded'}
                                </div>
                            </button>

                            <button
                                onClick={() => handleExportTypeChange('song')}
                                disabled={!song}
                                className={`p-3 rounded-lg border transition-colors ${exportType === 'song'
                                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-400'
                                    : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <div className="text-sm font-medium">Current Song</div>
                                <div className="text-xs text-white/60">
                                    {song ? `${song.name} (${song.patterns.length} sections)` : 'No song loaded'}
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Export Statistics */}
                    {exportStats && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm font-medium text-white">Export Preview</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-white/60">Duration:</span>
                                    <span className="text-white ml-2">{exportStats.duration}s</span>
                                </div>
                                <div>
                                    <span className="text-white/60">Active Steps:</span>
                                    <span className="text-white ml-2">{exportStats.activeSteps}</span>
                                </div>
                                {exportType === 'pattern' && (
                                    <>
                                        <div>
                                            <span className="text-white/60">Tracks:</span>
                                            <span className="text-white ml-2">{exportStats.tracks}</span>
                                        </div>
                                        <div>
                                            <span className="text-white/60">Resolution:</span>
                                            <span className="text-white ml-2">1/{exportStats.stepResolution}</span>
                                        </div>
                                    </>
                                )}
                                {exportType === 'song' && (
                                    <div className="col-span-2">
                                        <span className="text-white/60">Sections:</span>
                                        <span className="text-white ml-2">{exportStats.sections}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Basic Options */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Tempo (BPM)</label>
                            <input
                                type="number"
                                min="60"
                                max="200"
                                value={exportOptions.tempo}
                                onChange={(e) => handleOptionChange('tempo', parseInt(e.target.value) || 120)}
                                className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">MIDI Channel</label>
                            <select
                                value={exportOptions.channel}
                                onChange={(e) => handleOptionChange('channel', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
                            >
                                <option value={9}>Channel 10 (Standard Drums)</option>
                                {Array.from({ length: 16 }, (_, i) => (
                                    <option key={i} value={i}>Channel {i + 1}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Advanced Options
                            <span className="ml-auto">{showAdvanced ? '−' : '+'}</span>
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 space-y-4 pl-6 border-l border-white/10">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">Ticks per Quarter Note</label>
                                    <select
                                        value={exportOptions.ticksPerQuarter}
                                        onChange={(e) => handleOptionChange('ticksPerQuarter', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-white/10 text-white rounded border border-white/20 focus:border-cyan-400 focus:outline-none"
                                    >
                                        <option value={96}>96 (Low resolution)</option>
                                        <option value={192}>192 (Medium resolution)</option>
                                        <option value={480}>480 (High resolution)</option>
                                        <option value={960}>960 (Very high resolution)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions.includeSwing}
                                            onChange={(e) => handleOptionChange('includeSwing', e.target.checked)}
                                            className="rounded"
                                        />
                                        <span className="text-sm text-white">Include swing timing</span>
                                    </label>

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={exportOptions.quantize}
                                            onChange={(e) => handleOptionChange('quantize', e.target.checked)}
                                            className="rounded"
                                        />
                                        <span className="text-sm text-white">Quantize to grid</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={!exportStats?.valid || isExporting}
                        className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {isExporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Export MIDI
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MidiExportDialog;
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, 
  Play, 
  Pause, 
  Upload, 
  Trash2, 
  Volume2, 
  Settings,
  Library,
  Waveform
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import SampleLibraryBrowser from './SampleLibraryBrowser';

export default function SampleAssignment({ 
  trackId, 
  trackName, 
  currentSample = null, 
  onSampleChange,
  onVolumeChange,
  volume = 1.0,
  className = '' 
}) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPreview, setAudioPreview] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioPreview) {
        audioPreview.pause();
        audioPreview.src = '';
      }
    };
  }, [audioPreview]);

  const playPreview = async () => {
    if (!currentSample?.url) return;

    try {
      // Stop current preview
      if (audioPreview) {
        audioPreview.pause();
        audioPreview.src = '';
      }

      // Create new audio element
      const audio = new Audio(currentSample.url);
      audio.volume = volume * 0.7; // Slightly quieter for preview
      
      // Set up event listeners
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        console.error('Failed to play sample preview');
        setIsPlaying(false);
      };

      // Play preview
      await audio.play();
      setAudioPreview(audio);
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play sample preview:', error);
      setIsPlaying(false);
    }
  };

  const stopPreview = () => {
    if (audioPreview) {
      audioPreview.pause();
      audioPreview.src = '';
    }
    setIsPlaying(false);
  };

  const handleSampleSelect = (sample) => {
    if (onSampleChange) {
      onSampleChange(trackId, sample);
    }
    setShowLibrary(false);
  };

  const handleRemoveSample = () => {
    if (onSampleChange) {
      onSampleChange(trackId, null);
    }
  };

  const handleVolumeChange = (newVolume) => {
    if (onVolumeChange) {
      onVolumeChange(trackId, newVolume[0]);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    // Create sample object from uploaded file
    const sample = {
      id: `upload_${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      metadata: {
        size: file.size,
        type: file.type,
        uploaded: true
      }
    };

    handleSampleSelect(sample);
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${className}`}>
      {/* Track Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
          <span className="font-medium text-white text-sm">{trackName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="w-6 h-6 p-0 text-white/40 hover:text-white"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Sample Display */}
      <div className="space-y-3">
        {currentSample ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Music className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white text-sm truncate">
                  {currentSample.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {currentSample.metadata?.size && (
                    <span className="text-xs text-white/40">
                      {Math.round(currentSample.metadata.size / 1024)}KB
                    </span>
                  )}
                  {currentSample.metadata?.bpm && (
                    <Badge variant="outline" className="text-xs">
                      {currentSample.metadata.bpm} BPM
                    </Badge>
                  )}
                  {currentSample.metadata?.uploaded && (
                    <Badge variant="secondary" className="text-xs">
                      Uploaded
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isPlaying ? stopPreview : playPreview}
                  className="w-8 h-8 p-0 text-white/60 hover:text-white"
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveSample}
                  className="w-8 h-8 p-0 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
            <Music className="w-8 h-8 text-white/40 mx-auto mb-2" />
            <p className="text-white/60 text-sm mb-3">No sample assigned</p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLibrary(true)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Library className="w-4 h-4 mr-2" />
                Browse Library
              </Button>
              <label className="cursor-pointer">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white w-full"
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Sample
                  </span>
                </Button>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/60">Volume</span>
            </div>
            <span className="text-sm text-white/40">{Math.round(volume * 100)}%</span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={1}
            min={0}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Advanced Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-3 border-t border-white/10"
            >
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLibrary(true)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Library className="w-4 h-4 mr-2" />
                  Change Sample
                </Button>
                <label className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10 w-full"
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sample Library Browser */}
      <AnimatePresence>
        {showLibrary && (
          <SampleLibraryBrowser
            isOpen={showLibrary}
            onClose={() => setShowLibrary(false)}
            onSampleSelect={handleSampleSelect}
            selectedTrackId={trackId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
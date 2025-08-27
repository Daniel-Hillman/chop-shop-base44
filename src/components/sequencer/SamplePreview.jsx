import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, Download, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';

export default function SamplePreview({ 
  sample, 
  onSelect = null, 
  showSelectButton = true,
  className = '' 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [waveformData, setWaveformData] = useState([]);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!sample?.url) return;

    const audio = new Audio(sample.url);
    audio.preload = 'metadata';
    audio.volume = volume;
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio loading error:', e);
      setIsPlaying(false);
    });

    audioRef.current = audio;

    // Generate waveform data (simplified visualization)
    generateWaveform(audio);

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [sample?.url, volume]);

  // Generate simplified waveform data
  const generateWaveform = async (audio) => {
    try {
      // Create a simplified waveform for visualization
      // In a real implementation, you'd analyze the actual audio data
      const points = 100;
      const data = Array.from({ length: points }, (_, i) => {
        // Generate pseudo-random waveform data
        const x = i / points;
        const amplitude = Math.sin(x * Math.PI * 8) * Math.random() * 0.8 + 0.2;
        return Math.abs(amplitude);
      });
      
      setWaveformData(data);
    } catch (error) {
      console.error('Failed to generate waveform:', error);
    }
  };

  // Draw waveform on canvas
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = 'rgba(6, 182, 212, 0.3)'; // cyan with opacity
    ctx.strokeStyle = 'rgb(6, 182, 212)'; // cyan
    ctx.lineWidth = 1;

    const barWidth = width / waveformData.length;
    
    waveformData.forEach((amplitude, i) => {
      const barHeight = amplitude * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      // Draw bar
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw progress indicator
    if (duration > 0) {
      const progress = currentTime / duration;
      const progressX = progress * width;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(0, 0, progressX, height);
      
      // Progress line
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  }, [waveformData, currentTime, duration]);

  const togglePlayback = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (newVolume) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || duration === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!sample) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 border border-white/10 rounded-xl p-4 ${className}`}
    >
      {/* Sample Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{sample.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {sample.metadata?.size && (
              <span className="text-xs text-white/40">
                {Math.round(sample.metadata.size / 1024)}KB
              </span>
            )}
            {sample.metadata?.bpm && (
              <Badge variant="outline" className="text-xs">
                {sample.metadata.bpm} BPM
              </Badge>
            )}
            {sample.metadata?.key && sample.metadata.key !== 'N/A' && (
              <Badge variant="outline" className="text-xs">
                {sample.metadata.key}
              </Badge>
            )}
          </div>
        </div>
        
        {showSelectButton && onSelect && (
          <Button
            onClick={() => onSelect(sample)}
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-600 text-black"
          >
            <Download className="w-3 h-3 mr-1" />
            Select
          </Button>
        )}
      </div>

      {/* Waveform */}
      <div className="mb-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={60}
          className="w-full h-15 bg-black/20 rounded-lg cursor-pointer"
          onClick={handleSeek}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayback}
          className="w-8 h-8 p-0 text-white hover:text-cyan-400"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-white/60 min-w-0">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-500 transition-all duration-100"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-xs text-white/60 min-w-0">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-white/60" />
          <div className="w-16">
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={1}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {sample.metadata?.description && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-sm text-white/60">{sample.metadata.description}</p>
        </div>
      )}

      {/* Tags */}
      {sample.metadata?.tags && sample.metadata.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {sample.metadata.tags.slice(0, 5).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </motion.div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { EnhancedCanvasRenderer } from './EnhancedCanvasRenderer.js';
import VisualSettingsPanel from './VisualSettingsPanel.jsx';

/**
 * Demo component for Visual Enhancements and Accessibility Features
 * Demonstrates color coding, structure detection, and accessibility options
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export default function VisualEnhancementsDemo() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(null);
  const [demoData, setDemoData] = useState(null);

  // Generate demo waveform and frequency data
  useEffect(() => {
    const generateDemoData = () => {
      const duration = 30; // 30 seconds
      const sampleRate = 44100;
      const samples = new Float32Array(duration * sampleRate);
      const frequencyData = new Uint8Array(1024);
      
      // Generate realistic waveform with different sections
      for (let i = 0; i < samples.length; i++) {
        const time = i / sampleRate;
        let amplitude = 0;
        
        // Intro (0-5s) - quiet, building
        if (time < 5) {
          amplitude = 0.2 * Math.sin(2 * Math.PI * 440 * time) * (time / 5);
        }
        // Verse (5-15s) - moderate energy
        else if (time < 15) {
          amplitude = 0.4 * (
            Math.sin(2 * Math.PI * 220 * time) +
            0.5 * Math.sin(2 * Math.PI * 440 * time) +
            0.3 * Math.sin(2 * Math.PI * 880 * time)
          );
        }
        // Chorus (15-25s) - high energy
        else if (time < 25) {
          amplitude = 0.7 * (
            Math.sin(2 * Math.PI * 110 * time) +
            0.8 * Math.sin(2 * Math.PI * 330 * time) +
            0.6 * Math.sin(2 * Math.PI * 660 * time) +
            0.4 * Math.sin(2 * Math.PI * 1320 * time)
          );
        }
        // Outro (25-30s) - fading
        else {
          amplitude = 0.3 * Math.sin(2 * Math.PI * 220 * time) * ((30 - time) / 5);
        }
        
        // Add some noise for realism
        amplitude += (Math.random() - 0.5) * 0.1;
        samples[i] = Math.max(-1, Math.min(1, amplitude));
      }
      
      // Generate frequency data with varying content
      for (let i = 0; i < frequencyData.length; i++) {
        const frequency = (i / frequencyData.length) * 22050; // Up to Nyquist frequency
        let magnitude = 0;
        
        // Bass content (20-250 Hz)
        if (frequency < 250) {
          magnitude = 180 + Math.random() * 50;
        }
        // Mid content (250-2000 Hz)
        else if (frequency < 2000) {
          magnitude = 120 + Math.random() * 80;
        }
        // High content (2000+ Hz)
        else {
          magnitude = 60 + Math.random() * 60;
        }
        
        frequencyData[i] = Math.min(255, magnitude);
      }
      
      return {
        waveformData: {
          samples,
          sampleRate,
          duration,
          channels: 1
        },
        frequencyData,
        metadata: {
          title: 'Demo Song',
          artist: 'Demo Artist',
          bpm: 120
        }
      };
    };
    
    setDemoData(generateDemoData());
  }, []);

  // Initialize enhanced renderer
  useEffect(() => {
    if (containerRef.current && demoData && !rendererRef.current) {
      try {
        rendererRef.current = new EnhancedCanvasRenderer(containerRef.current, {
          enableFrequencyColorCoding: true,
          enableAmplitudeColorCoding: true,
          enableStructureDetection: true,
          enableAccessibilityMode: false,
          enableHighContrastMode: false,
          colorScheme: 'default',
          renderQuality: 'high'
        });
        
        // Set initial settings
        const visualEngine = rendererRef.current.getVisualEnhancementEngine();
        if (visualEngine) {
          setCurrentSettings(visualEngine.createVisualSettings());
        }
        
        // Render demo data
        renderDemoWaveform();
      } catch (error) {
        console.error('Failed to initialize enhanced renderer:', error);
      }
    }
    
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [demoData]);

  // Render demo waveform with enhancements
  const renderDemoWaveform = () => {
    if (!rendererRef.current || !demoData) return;
    
    try {
      rendererRef.current.renderWaveform(demoData.waveformData, {
        frequencyData: demoData.frequencyData,
        metadata: demoData.metadata,
        quality: 'high'
      });
    } catch (error) {
      console.error('Failed to render demo waveform:', error);
    }
  };

  // Handle settings changes
  const handleSettingsChange = (newSettings) => {
    setCurrentSettings(newSettings);
    
    if (rendererRef.current) {
      rendererRef.current.updateVisualSettings(newSettings);
      renderDemoWaveform(); // Re-render with new settings
    }
  };

  // Handle preview changes
  const handlePreviewChange = (updatedOptions, oldOptions) => {
    console.log('Visual settings preview:', { updatedOptions, oldOptions });
    // Re-render immediately for real-time preview
    renderDemoWaveform();
  };

  // Demo presets
  const applyPreset = (presetName) => {
    let presetSettings = {};
    
    switch (presetName) {
      case 'default':
        presetSettings = {
          frequencyColorCoding: { enabled: true, colorScheme: 'default', intensity: 0.8 },
          amplitudeColorCoding: { enabled: true, sensitivity: 0.7 },
          structureDetection: { enabled: true, sensitivity: 0.6, showLabels: true },
          accessibility: { highContrastMode: false, alternativePatterns: false },
          enhancements: { gradientFill: true, shadowEffects: false, animatedElements: true }
        };
        break;
        
      case 'high-contrast':
        presetSettings = {
          frequencyColorCoding: { enabled: true, colorScheme: 'high-contrast', intensity: 1.0 },
          amplitudeColorCoding: { enabled: true, sensitivity: 0.9 },
          structureDetection: { enabled: true, sensitivity: 0.8, showLabels: true },
          accessibility: { highContrastMode: true, alternativePatterns: false },
          enhancements: { gradientFill: false, shadowEffects: true, animatedElements: false }
        };
        break;
        
      case 'accessibility':
        presetSettings = {
          frequencyColorCoding: { enabled: false, colorScheme: 'colorblind-friendly' },
          amplitudeColorCoding: { enabled: false },
          structureDetection: { enabled: true, sensitivity: 0.7, showLabels: true },
          accessibility: { highContrastMode: true, alternativePatterns: true, textSize: 'large' },
          enhancements: { gradientFill: false, shadowEffects: false, animatedElements: false }
        };
        break;
        
      case 'colorblind-friendly':
        presetSettings = {
          frequencyColorCoding: { enabled: true, colorScheme: 'colorblind-friendly', intensity: 0.9 },
          amplitudeColorCoding: { enabled: true, sensitivity: 0.8 },
          structureDetection: { enabled: true, sensitivity: 0.6, showLabels: true },
          accessibility: { highContrastMode: false, alternativePatterns: true },
          enhancements: { gradientFill: true, shadowEffects: false, animatedElements: true }
        };
        break;
    }
    
    handleSettingsChange(presetSettings);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Visual Enhancements Demo</h1>
            <p className="text-gray-400 mt-1">
              Interactive demonstration of waveform color coding, structure detection, and accessibility features
            </p>
          </div>
          
          <button
            onClick={() => setIsSettingsPanelOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Visual Settings
          </button>
        </div>
      </div>

      {/* Demo Controls */}
      <div className="p-4 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-300">Quick Presets:</span>
          
          <button
            onClick={() => applyPreset('default')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Default
          </button>
          
          <button
            onClick={() => applyPreset('high-contrast')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            High Contrast
          </button>
          
          <button
            onClick={() => applyPreset('accessibility')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Accessibility
          </button>
          
          <button
            onClick={() => applyPreset('colorblind-friendly')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Colorblind Friendly
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Waveform Container */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Enhanced Waveform Visualization</h2>
            <p className="text-sm text-gray-400 mt-1">
              Demonstrating frequency color coding, amplitude visualization, and song structure detection
            </p>
          </div>
          
          <div 
            ref={containerRef}
            className="w-full h-96 bg-gray-900"
            style={{ minHeight: '384px' }}
          >
            {!demoData && (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">Generating demo data...</div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-lg font-semibold mb-2 text-blue-400">🎨 Frequency Colors</div>
            <p className="text-sm text-gray-300">
              Different frequency ranges are color-coded: bass (pink), low-mid (red), mid (orange), 
              high-mid (green), and treble (blue).
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-lg font-semibold mb-2 text-green-400">📊 Amplitude Levels</div>
            <p className="text-sm text-gray-300">
              Color intensity and brightness reflect amplitude levels, from silent (dark) to 
              peak (bright) sections.
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-lg font-semibold mb-2 text-yellow-400">🏗️ Song Structure</div>
            <p className="text-sm text-gray-300">
              Automatic detection of song sections (intro, verse, chorus, bridge, outro) with 
              visual patterns and labels.
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-lg font-semibold mb-2 text-purple-400">♿ Accessibility</div>
            <p className="text-sm text-gray-300">
              High contrast mode, alternative visual patterns, and colorblind-friendly options 
              for inclusive design.
            </p>
          </div>
        </div>

        {/* Current Settings Display */}
        {currentSettings && (
          <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3">Current Settings</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Frequency Colors:</span>
                <span className={`ml-2 ${currentSettings.frequencyColorCoding?.enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {currentSettings.frequencyColorCoding?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Amplitude Colors:</span>
                <span className={`ml-2 ${currentSettings.amplitudeColorCoding?.enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {currentSettings.amplitudeColorCoding?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Structure Detection:</span>
                <span className={`ml-2 ${currentSettings.structureDetection?.enabled ? 'text-green-400' : 'text-red-400'}`}>
                  {currentSettings.structureDetection?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">High Contrast:</span>
                <span className={`ml-2 ${currentSettings.accessibility?.highContrastMode ? 'text-green-400' : 'text-red-400'}`}>
                  {currentSettings.accessibility?.highContrastMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Settings Panel */}
      <VisualSettingsPanel
        visualEnhancementEngine={rendererRef.current?.getVisualEnhancementEngine()}
        onSettingsChange={handleSettingsChange}
        onPreviewChange={handlePreviewChange}
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
      />
    </div>
  );
}
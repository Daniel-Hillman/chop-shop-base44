import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Visual Settings Panel with real-time preview
 * Implements configurable visual settings with live updates
 * Requirements: 8.4, 8.5
 */
export default function VisualSettingsPanel({
  visualEnhancementEngine,
  onSettingsChange,
  onPreviewChange,
  isOpen = false,
  onClose,
  className = ''
}) {
  const [settings, setSettings] = useState({
    frequencyColorCoding: {
      enabled: true,
      colorScheme: 'default',
      intensity: 0.8,
      blendMode: 'normal'
    },
    amplitudeColorCoding: {
      enabled: true,
      sensitivity: 0.7,
      dynamicRange: true
    },
    structureDetection: {
      enabled: true,
      sensitivity: 0.6,
      showLabels: true,
      showPatterns: true
    },
    accessibility: {
      highContrastMode: false,
      alternativePatterns: false,
      textSize: 'medium',
      reducedMotion: false
    },
    enhancements: {
      gradientFill: true,
      shadowEffects: false,
      animatedElements: true,
      particleEffects: false
    }
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');

  // Initialize settings from engine
  useEffect(() => {
    if (visualEnhancementEngine) {
      const engineSettings = visualEnhancementEngine.createVisualSettings();
      setSettings(engineSettings);
    }
  }, [visualEnhancementEngine]);

  // Handle settings change with real-time preview
  const handleSettingChange = useCallback((category, key, value) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    };
    
    setSettings(newSettings);
    
    // Apply settings to engine with preview callback
    if (visualEnhancementEngine) {
      visualEnhancementEngine.updateVisualSettings(newSettings, (updatedOptions, oldOptions) => {
        if (onPreviewChange) {
          onPreviewChange(updatedOptions, oldOptions);
        }
      });
    }
    
    // Notify parent component
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  }, [settings, visualEnhancementEngine, onSettingsChange, onPreviewChange]);

  // Color scheme options
  const colorSchemes = [
    { value: 'default', label: 'Default', description: 'Standard color palette' },
    { value: 'high-contrast', label: 'High Contrast', description: 'Maximum contrast for visibility' },
    { value: 'colorblind-friendly', label: 'Colorblind Friendly', description: 'Optimized for color vision deficiency' }
  ];

  // Text size options
  const textSizes = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'extra-large', label: 'Extra Large' }
  ];

  // Render color coding settings
  const renderColorSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Frequency Color Coding</h3>
        
        {/* Enable frequency color coding */}
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm text-gray-300">Enable Frequency Colors</label>
          <button
            onClick={() => handleSettingChange('frequencyColorCoding', 'enabled', !settings.frequencyColorCoding.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.frequencyColorCoding.enabled ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.frequencyColorCoding.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Color scheme selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">Color Scheme</label>
          <div className="grid grid-cols-1 gap-2">
            {colorSchemes.map(scheme => (
              <button
                key={scheme.value}
                onClick={() => handleSettingChange('frequencyColorCoding', 'colorScheme', scheme.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  settings.frequencyColorCoding.colorScheme === scheme.value
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-medium">{scheme.label}</div>
                <div className="text-xs text-gray-400">{scheme.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Color intensity */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            Color Intensity: {Math.round(settings.frequencyColorCoding.intensity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.frequencyColorCoding.intensity}
            onChange={(e) => handleSettingChange('frequencyColorCoding', 'intensity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Amplitude Color Coding</h3>
        
        {/* Enable amplitude color coding */}
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm text-gray-300">Enable Amplitude Colors</label>
          <button
            onClick={() => handleSettingChange('amplitudeColorCoding', 'enabled', !settings.amplitudeColorCoding.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.amplitudeColorCoding.enabled ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.amplitudeColorCoding.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Amplitude sensitivity */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            Sensitivity: {Math.round(settings.amplitudeColorCoding.sensitivity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.amplitudeColorCoding.sensitivity}
            onChange={(e) => handleSettingChange('amplitudeColorCoding', 'sensitivity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Dynamic range */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Dynamic Range Compression</label>
          <button
            onClick={() => handleSettingChange('amplitudeColorCoding', 'dynamicRange', !settings.amplitudeColorCoding.dynamicRange)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.amplitudeColorCoding.dynamicRange ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.amplitudeColorCoding.dynamicRange ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  // Render structure detection settings
  const renderStructureSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Song Structure Detection</h3>
        
        {/* Enable structure detection */}
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm text-gray-300">Enable Structure Detection</label>
          <button
            onClick={() => handleSettingChange('structureDetection', 'enabled', !settings.structureDetection.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.structureDetection.enabled ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.structureDetection.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Detection sensitivity */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            Detection Sensitivity: {Math.round(settings.structureDetection.sensitivity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.structureDetection.sensitivity}
            onChange={(e) => handleSettingChange('structureDetection', 'sensitivity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Show labels */}
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm text-gray-300">Show Section Labels</label>
          <button
            onClick={() => handleSettingChange('structureDetection', 'showLabels', !settings.structureDetection.showLabels)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.structureDetection.showLabels ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.structureDetection.showLabels ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Show patterns */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Show Visual Patterns</label>
          <button
            onClick={() => handleSettingChange('structureDetection', 'showPatterns', !settings.structureDetection.showPatterns)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.structureDetection.showPatterns ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.structureDetection.showPatterns ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  // Render accessibility settings
  const renderAccessibilitySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Accessibility Options</h3>
        
        {/* High contrast mode */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-sm text-gray-300">High Contrast Mode</label>
            <p className="text-xs text-gray-400">Increases contrast for better visibility</p>
          </div>
          <button
            onClick={() => handleSettingChange('accessibility', 'highContrastMode', !settings.accessibility.highContrastMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.accessibility.highContrastMode ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.accessibility.highContrastMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Alternative patterns */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-sm text-gray-300">Alternative Visual Patterns</label>
            <p className="text-xs text-gray-400">Use patterns instead of colors for frequency ranges</p>
          </div>
          <button
            onClick={() => handleSettingChange('accessibility', 'alternativePatterns', !settings.accessibility.alternativePatterns)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.accessibility.alternativePatterns ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.accessibility.alternativePatterns ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Text size */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">Text Size</label>
          <div className="grid grid-cols-2 gap-2">
            {textSizes.map(size => (
              <button
                key={size.value}
                onClick={() => handleSettingChange('accessibility', 'textSize', size.value)}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  settings.accessibility.textSize === size.value
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reduced motion */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-300">Reduced Motion</label>
            <p className="text-xs text-gray-400">Minimize animations and transitions</p>
          </div>
          <button
            onClick={() => handleSettingChange('accessibility', 'reducedMotion', !settings.accessibility.reducedMotion)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.accessibility.reducedMotion ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.accessibility.reducedMotion ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  // Render visual enhancements settings
  const renderEnhancementSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Visual Enhancements</h3>
        
        {/* Gradient fill */}
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm text-gray-300">Gradient Fill</label>
          <button
            onClick={() => handleSettingChange('enhancements', 'gradientFill', !settings.enhancements.gradientFill)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enhancements.gradientFill ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enhancements.gradientFill ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Shadow effects */}
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm text-gray-300">Shadow Effects</label>
          <button
            onClick={() => handleSettingChange('enhancements', 'shadowEffects', !settings.enhancements.shadowEffects)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enhancements.shadowEffects ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enhancements.shadowEffects ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Animated elements */}
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm text-gray-300">Animated Elements</label>
          <button
            onClick={() => handleSettingChange('enhancements', 'animatedElements', !settings.enhancements.animatedElements)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enhancements.animatedElements ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enhancements.animatedElements ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Particle effects */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Particle Effects</label>
          <button
            onClick={() => handleSettingChange('enhancements', 'particleEffects', !settings.enhancements.particleEffects)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enhancements.particleEffects ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enhancements.particleEffects ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'colors', label: 'Colors', icon: '🎨' },
    { id: 'structure', label: 'Structure', icon: '🏗️' },
    { id: 'accessibility', label: 'Accessibility', icon: '♿' },
    { id: 'enhancements', label: 'Effects', icon: '✨' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`fixed right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 shadow-2xl z-50 overflow-hidden ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Visual Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 p-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'colors' && renderColorSettings()}
                {activeTab === 'structure' && renderStructureSettings()}
                {activeTab === 'accessibility' && renderAccessibilitySettings()}
                {activeTab === 'enhancements' && renderEnhancementSettings()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  previewMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {previewMode ? 'Exit Preview' : 'Preview Mode'}
              </button>
              
              <div className="text-xs text-gray-400">
                Changes apply in real-time
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
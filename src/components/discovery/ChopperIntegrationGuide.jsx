/**
 * @fileoverview ChopperIntegrationGuide - Provides clear user guidance for chopper workflow integration
 * Shows step-by-step instructions and status updates for transferring samples to chopper
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, ExternalLink, Copy, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { UserGuidanceHelpers } from '../../utils/navigationHelpers.js';

/**
 * ChopperIntegrationGuide component provides step-by-step guidance for using samples in chopper
 * @param {Object} props - Component props
 * @param {import('../../types/discovery.js').SampleData} props.sample - Sample being transferred
 * @param {boolean} props.isVisible - Whether the guide is visible
 * @param {function} props.onClose - Callback when guide is closed
 * @param {function} props.onTransfer - Callback to initiate transfer
 * @param {Object} props.transferStatus - Current transfer status
 * @param {boolean} props.transferStatus.inProgress - Whether transfer is in progress
 * @param {boolean} props.transferStatus.success - Whether transfer was successful
 * @param {string} props.transferStatus.message - Transfer status message
 * @param {string} props.transferStatus.error - Transfer error message
 * @returns {JSX.Element} ChopperIntegrationGuide component
 */
const ChopperIntegrationGuide = ({
  sample,
  isVisible,
  onClose,
  onTransfer,
  transferStatus = {}
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [guidance, setGuidance] = useState(null);

  // Initialize guidance when sample changes
  useEffect(() => {
    if (sample) {
      const newGuidance = UserGuidanceHelpers.createChopperIntegrationGuidance(sample);
      setGuidance(newGuidance);
      setCurrentStep(0);
    }
  }, [sample]);

  // Update step progress based on transfer status
  useEffect(() => {
    if (transferStatus.inProgress) {
      setCurrentStep(1);
    } else if (transferStatus.success) {
      setCurrentStep(4);
    } else if (transferStatus.error) {
      setCurrentStep(0);
    }
  }, [transferStatus]);

  /**
   * Handles transfer initiation
   */
  const handleTransfer = () => {
    if (onTransfer) {
      onTransfer(sample);
    }
  };

  /**
   * Handles manual URL copy
   */
  const handleCopyUrl = async () => {
    if (!sample?.youtubeId) return;

    const youtubeUrl = `https://www.youtube.com/watch?v=${sample.youtubeId}`;
    
    try {
      await navigator.clipboard.writeText(youtubeUrl);
      // Could show a toast notification here
      console.log('URL copied manually');
    } catch (error) {
      console.error('Manual copy failed:', error);
    }
  };

  /**
   * Opens YouTube in new tab
   */
  const handleOpenYouTube = () => {
    if (!sample?.youtubeId) return;
    
    const youtubeUrl = `https://www.youtube.com/watch?v=${sample.youtubeId}`;
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  };

  /**
   * Renders step indicator
   */
  const renderStepIndicator = (step, index) => {
    const isCompleted = index < currentStep;
    const isCurrent = index === currentStep;
    const isError = transferStatus.error && isCurrent;

    return (
      <motion.div
        key={step.step}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`flex items-start space-x-3 p-3 rounded-lg ${
          isCompleted ? 'bg-green-500/10' : 
          isCurrent ? 'bg-cyan-500/10' : 
          'bg-gray-500/10'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <Circle className={`w-5 h-5 ${isCurrent ? 'text-cyan-400' : 'text-gray-400'}`} />
          )}
        </div>
        <div className="flex-1">
          <h4 className={`font-medium ${
            isCompleted ? 'text-green-400' : 
            isCurrent ? 'text-cyan-400' : 
            'text-gray-300'
          }`}>
            {step.title}
          </h4>
          <p className="text-sm text-gray-400 mt-1">
            {step.description}
          </p>
          {isError && (
            <p className="text-sm text-red-400 mt-1">
              {transferStatus.error}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  if (!isVisible || !sample || !guidance) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {guidance.title}
                </h2>
                <div className="text-sm text-gray-300">
                  <p className="font-medium text-cyan-400">
                    {sample.title}
                  </p>
                  <p>by {sample.artist} ({sample.year}) • {sample.genre}</p>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Steps */}
          <div className="p-6">
            <div className="space-y-3 mb-6">
              {guidance.steps.map((step, index) => renderStepIndicator(step, index))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                onClick={handleTransfer}
                disabled={transferStatus.inProgress}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium"
              >
                {transferStatus.inProgress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Use in Chopper
                  </>
                )}
              </Button>

              <Button
                onClick={handleCopyUrl}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy URL
              </Button>

              <Button
                onClick={handleOpenYouTube}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open YouTube
              </Button>
            </div>

            {/* Status Message */}
            {transferStatus.message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg mb-4 ${
                  transferStatus.success ? 'bg-green-500/10 text-green-400' :
                  transferStatus.error ? 'bg-red-500/10 text-red-400' :
                  'bg-cyan-500/10 text-cyan-400'
                }`}
              >
                {transferStatus.message}
              </motion.div>
            )}

            {/* Tips */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Tips:</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                {guidance.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-cyan-400 mr-2">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700 bg-gray-800/50">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400">
                Need help? Check the documentation or contact support.
              </p>
              <Button
                onClick={onClose}
                variant="ghost"
                className="text-gray-400 hover:text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

ChopperIntegrationGuide.propTypes = {
  sample: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    artist: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
    genre: PropTypes.string.isRequired,
    youtubeId: PropTypes.string.isRequired
  }),
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onTransfer: PropTypes.func.isRequired,
  transferStatus: PropTypes.shape({
    inProgress: PropTypes.bool,
    success: PropTypes.bool,
    message: PropTypes.string,
    error: PropTypes.string
  })
};

export default ChopperIntegrationGuide;
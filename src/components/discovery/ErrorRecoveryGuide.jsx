import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  HelpCircle, 
  CheckCircle,
  XCircle,
  Clock,
  Settings
} from 'lucide-react';

/**
 * Comprehensive error recovery guide component
 * Provides step-by-step recovery instructions for different error types
 * 
 * Requirements: 7.3, 7.5
 */
const ErrorRecoveryGuide = ({
  error,
  errorType = 'general',
  onRetry,
  onDismiss,
  className = ''
}) => {
  const [expandedStep, setExpandedStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Get recovery steps based on error type
   */
  const getRecoverySteps = () => {
    const isOnline = navigator.onLine;
    
    const stepConfigs = {
      network: {
        title: isOnline ? 'Connection Troubleshooting' : 'Offline Mode',
        icon: isOnline ? Wifi : WifiOff,
        severity: isOnline ? 'warning' : 'info',
        steps: isOnline ? [
          {
            id: 'check-connection',
            title: 'Check Your Connection',
            description: 'Verify your internet connection is working',
            actions: [
              'Try opening another website',
              'Check your WiFi or ethernet connection',
              'Restart your router if needed'
            ],
            automated: false
          },
          {
            id: 'refresh-page',
            title: 'Refresh the Page',
            description: 'Sometimes a simple refresh resolves connection issues',
            actions: [
              'Press Ctrl+R (or Cmd+R on Mac)',
              'Or click the refresh button in your browser'
            ],
            automated: true,
            automatedAction: () => window.location.reload()
          },
          {
            id: 'clear-cache',
            title: 'Clear Browser Cache',
            description: 'Cached data might be causing connection issues',
            actions: [
              'Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)',
              'Select "Cached images and files"',
              'Click "Clear data"'
            ],
            automated: false
          }
        ] : [
          {
            id: 'offline-mode',
            title: 'You\'re Currently Offline',
            description: 'Limited functionality is available while offline',
            actions: [
              'Demo samples are still available',
              'Your favorites and history are preserved',
              'Full functionality will return when you\'re back online'
            ],
            automated: false
          },
          {
            id: 'check-connection-offline',
            title: 'Restore Connection',
            description: 'Check your internet connection',
            actions: [
              'Check your WiFi settings',
              'Try connecting to a different network',
              'Contact your internet service provider if needed'
            ],
            automated: false
          }
        ]
      },
      api: {
        title: 'Service Recovery',
        icon: AlertTriangle,
        severity: 'warning',
        steps: [
          {
            id: 'wait-retry',
            title: 'Wait and Retry',
            description: 'The service might be temporarily overloaded',
            actions: [
              'Wait 30 seconds before trying again',
              'The service usually recovers quickly'
            ],
            automated: true,
            automatedAction: () => new Promise(resolve => setTimeout(resolve, 30000))
          },
          {
            id: 'use-demo',
            title: 'Use Demo Samples',
            description: 'Demo samples are always available',
            actions: [
              'Browse demo samples while the service recovers',
              'Your preferences will be saved',
              'Real samples will return when the service is restored'
            ],
            automated: false
          },
          {
            id: 'check-status',
            title: 'Check Service Status',
            description: 'Verify if there\'s a known service issue',
            actions: [
              'Check our status page (if available)',
              'Look for service announcements',
              'Try again in a few minutes'
            ],
            automated: false
          }
        ]
      },
      storage: {
        title: 'Storage Recovery',
        icon: Settings,
        severity: 'warning',
        steps: [
          {
            id: 'free-space',
            title: 'Free Up Storage Space',
            description: 'Your browser storage might be full',
            actions: [
              'Close unnecessary browser tabs',
              'Clear downloads folder',
              'Remove unused browser extensions'
            ],
            automated: false
          },
          {
            id: 'clear-browser-data',
            title: 'Clear Browser Data',
            description: 'Reset browser storage to fix corruption',
            actions: [
              'Go to browser settings',
              'Find "Privacy and Security"',
              'Clear browsing data (keep passwords and bookmarks)'
            ],
            automated: false
          },
          {
            id: 'incognito-mode',
            title: 'Try Incognito Mode',
            description: 'Test if the issue is with stored data',
            actions: [
              'Open a new incognito/private window',
              'Try using the discovery feature',
              'If it works, the issue is with stored data'
            ],
            automated: false
          }
        ]
      },
      timeout: {
        title: 'Timeout Recovery',
        icon: Clock,
        severity: 'warning',
        steps: [
          {
            id: 'check-speed',
            title: 'Check Connection Speed',
            description: 'Slow connections can cause timeouts',
            actions: [
              'Run a speed test (speedtest.net)',
              'Close bandwidth-heavy applications',
              'Try connecting to a faster network'
            ],
            automated: false
          },
          {
            id: 'reduce-filters',
            title: 'Simplify Your Request',
            description: 'Complex searches take longer to process',
            actions: [
              'Try fewer filter options',
              'Search for broader categories',
              'Use shorter time ranges'
            ],
            automated: false
          },
          {
            id: 'retry-timeout',
            title: 'Retry with Longer Timeout',
            description: 'Give the request more time to complete',
            actions: [
              'Click retry and wait longer',
              'The system will automatically extend the timeout'
            ],
            automated: true,
            automatedAction: onRetry
          }
        ]
      },
      video: {
        title: 'Video Playback Recovery',
        icon: XCircle,
        severity: 'error',
        steps: [
          {
            id: 'try-different-sample',
            title: 'Try a Different Sample',
            description: 'This specific video might not be available',
            actions: [
              'Click on another sample',
              'Use the shuffle button to find new samples',
              'The video might be region-restricted or removed'
            ],
            automated: false
          },
          {
            id: 'check-video-settings',
            title: 'Check Video Settings',
            description: 'Browser video settings might be blocking playback',
            actions: [
              'Enable JavaScript in your browser',
              'Allow autoplay for this site',
              'Disable ad blockers temporarily'
            ],
            automated: false
          },
          {
            id: 'update-browser',
            title: 'Update Your Browser',
            description: 'Outdated browsers may have video compatibility issues',
            actions: [
              'Check for browser updates',
              'Try a different browser (Chrome, Firefox, Safari)',
              'Enable hardware acceleration if available'
            ],
            automated: false
          }
        ]
      },
      general: {
        title: 'General Troubleshooting',
        icon: HelpCircle,
        severity: 'error',
        steps: [
          {
            id: 'refresh-general',
            title: 'Refresh the Page',
            description: 'A simple refresh often resolves temporary issues',
            actions: [
              'Press F5 or Ctrl+R',
              'Wait for the page to fully load'
            ],
            automated: true,
            automatedAction: () => window.location.reload()
          },
          {
            id: 'try-incognito',
            title: 'Try Incognito Mode',
            description: 'Test if extensions or cached data are causing issues',
            actions: [
              'Open an incognito/private window',
              'Navigate to the discovery page',
              'If it works, clear your browser cache'
            ],
            automated: false
          },
          {
            id: 'contact-support',
            title: 'Contact Support',
            description: 'If the issue persists, we\'re here to help',
            actions: [
              'Note what you were doing when the error occurred',
              'Include your browser and operating system info',
              'Describe the steps you\'ve already tried'
            ],
            automated: false
          }
        ]
      }
    };

    return stepConfigs[errorType] || stepConfigs.general;
  };

  const config = getRecoverySteps();
  const IconComponent = config.icon;

  /**
   * Toggle step expansion
   */
  const toggleStep = (stepId) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  /**
   * Mark step as completed
   */
  const markStepCompleted = (stepId) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  /**
   * Execute automated action
   */
  const executeAutomatedAction = async (step) => {
    if (!step.automatedAction) return;

    setIsRetrying(true);
    try {
      await step.automatedAction();
      markStepCompleted(step.id);
    } catch (error) {
      console.warn('Automated action failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  /**
   * Get step status icon
   */
  const getStepStatusIcon = (step) => {
    if (completedSteps.has(step.id)) {
      return <CheckCircle className="error-recovery-guide__step-status-icon error-recovery-guide__step-status-icon--completed" size={16} />;
    }
    if (isRetrying && expandedStep === step.id) {
      return <RefreshCw className="error-recovery-guide__step-status-icon error-recovery-guide__step-status-icon--loading animate-spin" size={16} />;
    }
    return null;
  };

  return (
    <div className={`error-recovery-guide error-recovery-guide--${config.severity} ${className}`}>
      <div className="error-recovery-guide__header">
        <div className="error-recovery-guide__icon">
          <IconComponent 
            className={`error-recovery-guide__icon-svg error-recovery-guide__icon-svg--${config.severity}`}
            size={24}
            aria-hidden="true"
          />
        </div>
        
        <div className="error-recovery-guide__title-section">
          <h3 className="error-recovery-guide__title">{config.title}</h3>
          <p className="error-recovery-guide__subtitle">
            Follow these steps to resolve the issue
          </p>
        </div>

        {onDismiss && (
          <button
            type="button"
            className="error-recovery-guide__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss recovery guide"
          >
            <XCircle size={20} />
          </button>
        )}
      </div>

      <div className="error-recovery-guide__steps">
        {config.steps.map((step, index) => (
          <div 
            key={step.id}
            className={`error-recovery-guide__step ${completedSteps.has(step.id) ? 'error-recovery-guide__step--completed' : ''}`}
          >
            <button
              type="button"
              className="error-recovery-guide__step-header"
              onClick={() => toggleStep(step.id)}
              aria-expanded={expandedStep === step.id}
              aria-controls={`step-content-${step.id}`}
            >
              <div className="error-recovery-guide__step-number">
                {index + 1}
              </div>
              
              <div className="error-recovery-guide__step-title">
                {step.title}
              </div>
              
              <div className="error-recovery-guide__step-status">
                {getStepStatusIcon(step)}
              </div>
            </button>

            {expandedStep === step.id && (
              <div 
                id={`step-content-${step.id}`}
                className="error-recovery-guide__step-content"
              >
                <p className="error-recovery-guide__step-description">
                  {step.description}
                </p>

                <ul className="error-recovery-guide__step-actions">
                  {step.actions.map((action, actionIndex) => (
                    <li key={actionIndex} className="error-recovery-guide__step-action">
                      {action}
                    </li>
                  ))}
                </ul>

                {step.automated && (
                  <div className="error-recovery-guide__step-automation">
                    <button
                      type="button"
                      className="error-recovery-guide__automated-action"
                      onClick={() => executeAutomatedAction(step)}
                      disabled={isRetrying || completedSteps.has(step.id)}
                    >
                      {isRetrying ? (
                        <>
                          <RefreshCw className="animate-spin" size={14} />
                          Processing...
                        </>
                      ) : completedSteps.has(step.id) ? (
                        <>
                          <CheckCircle size={14} />
                          Completed
                        </>
                      ) : (
                        <>
                          <Settings size={14} />
                          Do This Automatically
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="error-recovery-guide__step-footer">
                  <button
                    type="button"
                    className="error-recovery-guide__mark-completed"
                    onClick={() => markStepCompleted(step.id)}
                    disabled={completedSteps.has(step.id)}
                  >
                    {completedSteps.has(step.id) ? (
                      <>
                        <CheckCircle size={14} />
                        Completed
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        Mark as Done
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {onRetry && (
        <div className="error-recovery-guide__footer">
          <button
            type="button"
            className="error-recovery-guide__retry-button"
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Try Again
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

ErrorRecoveryGuide.propTypes = {
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  errorType: PropTypes.oneOf(['network', 'api', 'storage', 'timeout', 'video', 'general']),
  onRetry: PropTypes.func,
  onDismiss: PropTypes.func,
  className: PropTypes.string
};

export default ErrorRecoveryGuide;
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * OfflineDetector component that monitors network connectivity
 * and provides user feedback about offline/online status
 * 
 * Requirements: 7.3, 7.5
 */
const OfflineDetector = ({ 
  onStatusChange,
  showNotification = true,
  className = '',
  children 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);
  const [showOnlineNotice, setShowOnlineNotice] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (onStatusChange) {
        onStatusChange(true);
      }
      
      if (showNotification) {
        setShowOnlineNotice(true);
        setTimeout(() => setShowOnlineNotice(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (onStatusChange) {
        onStatusChange(false);
      }
      
      if (showNotification) {
        setShowOfflineNotice(true);
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    const currentStatus = navigator.onLine;
    if (currentStatus !== isOnline) {
      if (currentStatus) {
        handleOnline();
      } else {
        handleOffline();
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange, showNotification, isOnline]);

  const dismissOfflineNotice = () => {
    setShowOfflineNotice(false);
  };

  return (
    <div className={`offline-detector ${className}`}>
      {/* Offline notification banner */}
      {showNotification && showOfflineNotice && (
        <div 
          className="offline-detector__banner offline-detector__banner--offline"
          role="alert"
          aria-live="assertive"
        >
          <div className="offline-detector__banner-content">
            <WifiOff className="offline-detector__banner-icon" size={16} />
            <div className="offline-detector__banner-text">
              <span className="offline-detector__banner-title">You're offline</span>
              <span className="offline-detector__banner-message">
                Some features may be limited. We'll restore full functionality when you're back online.
              </span>
            </div>
            <button
              type="button"
              className="offline-detector__banner-dismiss"
              onClick={dismissOfflineNotice}
              aria-label="Dismiss offline notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Online notification (temporary) */}
      {showNotification && showOnlineNotice && (
        <div 
          className="offline-detector__banner offline-detector__banner--online"
          role="status"
          aria-live="polite"
        >
          <div className="offline-detector__banner-content">
            <Wifi className="offline-detector__banner-icon" size={16} />
            <div className="offline-detector__banner-text">
              <span className="offline-detector__banner-title">You're back online</span>
              <span className="offline-detector__banner-message">
                All features are now available.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Render children with offline context */}
      {children && (
        <div className={`offline-detector__content ${!isOnline ? 'offline-detector__content--offline' : ''}`}>
          {typeof children === 'function' ? children({ isOnline }) : children}
        </div>
      )}
    </div>
  );
};

/**
 * Hook for using offline detection in functional components
 */
export const useOfflineDetection = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Higher-order component that provides offline detection to wrapped components
 */
export const withOfflineDetection = (WrappedComponent) => {
  const WithOfflineDetection = (props) => {
    const isOnline = useOfflineDetection();
    
    return (
      <WrappedComponent 
        {...props} 
        isOnline={isOnline}
      />
    );
  };

  WithOfflineDetection.displayName = `withOfflineDetection(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithOfflineDetection;
};

OfflineDetector.propTypes = {
  onStatusChange: PropTypes.func,
  showNotification: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func])
};

export default OfflineDetector;
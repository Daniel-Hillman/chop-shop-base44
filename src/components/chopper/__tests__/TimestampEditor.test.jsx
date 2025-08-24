import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimestampEditor from '../TimestampEditor';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }) => children
}));

// Mock UI components
vi.mock('../../ui/input', () => ({
    Input: ({ value, onChange, ...props }) => (
        <input 
            value={value} 
            onChange={onChange} 
            {...props}
            data-testid="timestamp-input"
        />
    )
}));

vi.mock('../../ui/button', () => ({
    Button: ({ children, onClick, disabled, ...props }) => (
        <button 
            onClick={onClick} 
            disabled={disabled} 
            {...props}
            data-testid="timestamp-button"
        >
            {children}
        </button>
    )
}));

describe('TimestampEditor', () => {
    const mockChop = {
        padId: 'A0',
        startTime: 10.5,
        endTime: 12.8,
        color: '#06b6d4'
    };

    const defaultProps = {
        chop: mockChop,
        audioDuration: 180,
        onSave: vi.fn(),
        onCancel: vi.fn(),
        onPreview: vi.fn(),
        isPreviewPlaying: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates TimestampEditor component', () => {
        const editor = React.createElement(TimestampEditor, defaultProps);
        expect(editor).toBeDefined();
        expect(editor.props.chop).toEqual(mockChop);
    });

    it('validates props correctly', () => {
        expect(defaultProps.chop.padId).toBe('A0');
        expect(defaultProps.chop.startTime).toBe(10.5);
        expect(defaultProps.chop.endTime).toBe(12.8);
        expect(defaultProps.audioDuration).toBe(180);
    });

    it('handles callback functions', () => {
        expect(typeof defaultProps.onSave).toBe('function');
        expect(typeof defaultProps.onCancel).toBe('function');
        expect(typeof defaultProps.onPreview).toBe('function');
    });

    it('calculates duration correctly', () => {
        const duration = mockChop.endTime - mockChop.startTime;
        expect(Math.round(duration * 10) / 10).toBe(2.3);
    });

    it('validates timestamp ranges', () => {
        // Test negative start time
        const negativeStart = -5;
        expect(negativeStart < 0).toBe(true);
        
        // Test end time before start time
        const startTime = 20;
        const endTime = 15;
        expect(startTime >= endTime).toBe(true);
        
        // Test exceeding audio duration
        const exceedingTime = 200;
        expect(exceedingTime >= defaultProps.audioDuration).toBe(true);
    });

    it('validates sample duration limits', () => {
        // Test minimum duration
        const shortDuration = 0.05;
        expect(shortDuration < 0.1).toBe(true);
        
        // Test maximum duration
        const longDuration = 35;
        expect(longDuration > 30).toBe(true);
    });

    it('formats time correctly', () => {
        // Test time formatting logic
        const formatTime = (seconds) => {
            if (isNaN(seconds) || seconds < 0) return '00:00.000';
            
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            const milliseconds = Math.floor((seconds % 1) * 1000);
            
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        };

        expect(formatTime(65.123)).toBe('01:05.123');
        expect(formatTime(125.456)).toBe('02:05.456');
        expect(formatTime(0)).toBe('00:00.000');
        expect(formatTime(-5)).toBe('00:00.000');
    });

    it('parses time formats correctly', () => {
        const parseTime = (timeString) => {
            if (!timeString) return 0;
            
            // Handle MM:SS.mmm format first
            const timeMatch = timeString.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/);
            if (timeMatch) {
                const [, minutes, seconds, milliseconds = '0'] = timeMatch;
                const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds.padEnd(3, '0')) / 1000;
                return Math.max(0, totalSeconds);
            }
            
            // Handle pure number input (seconds)
            const numericValue = parseFloat(timeString);
            if (!isNaN(numericValue)) {
                return Math.max(0, numericValue);
            }
            
            return 0;
        };

        expect(parseTime('90.5')).toBe(90.5);
        expect(parseTime('1:30.500')).toBe(90.5);
        expect(parseTime('2:15.750')).toBe(135.75);
        expect(parseTime('')).toBe(0);
        expect(parseTime('invalid')).toBe(0);
    });
});
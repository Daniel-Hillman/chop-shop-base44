import React, { useState } from 'react';
import TimestampEditor from './TimestampEditor';

/**
 * Demo for TimestampEditor component
 * Shows timestamp editing functionality with validation and preview
 */
export default function TimestampEditorDemo() {
    const [chop, setChop] = useState({
        padId: 'A0',
        startTime: 30.5,
        endTime: 33.2,
        color: '#06b6d4'
    });
    
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const [showEditor, setShowEditor] = useState(true);
    
    const audioDuration = 180; // 3 minutes

    const handleSave = (updatedChop) => {
        console.log('Saving updated chop:', updatedChop);
        setChop(updatedChop);
        setShowEditor(false);
        
        // Simulate save success
        setTimeout(() => {
            alert('Timestamp saved successfully!');
        }, 100);
    };

    const handleCancel = () => {
        console.log('Cancelling edit');
        setShowEditor(false);
    };

    const handlePreview = (previewData) => {
        console.log('Previewing timestamp:', previewData);
        setIsPreviewPlaying(!isPreviewPlaying);
        
        // Simulate preview playback
        if (!isPreviewPlaying) {
            setTimeout(() => {
                setIsPreviewPlaying(false);
            }, previewData.duration * 1000);
        }
    };

    const resetDemo = () => {
        setChop({
            padId: 'A0',
            startTime: 30.5,
            endTime: 33.2,
            color: '#06b6d4'
        });
        setIsPreviewPlaying(false);
        setShowEditor(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">TimestampEditor Demo</h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Demo Controls */}
                    <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Demo Controls</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Current Sample</label>
                                <div className="bg-black/40 rounded p-3 text-white text-sm">
                                    <div>Pad ID: {chop.padId}</div>
                                    <div>Start: {chop.startTime.toFixed(3)}s</div>
                                    <div>End: {chop.endTime.toFixed(3)}s</div>
                                    <div>Duration: {(chop.endTime - chop.startTime).toFixed(3)}s</div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Audio Duration</label>
                                <div className="bg-black/40 rounded p-3 text-white text-sm">
                                    {audioDuration}s ({Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')})
                                </div>
                            </div>
                            
                            <button
                                onClick={resetDemo}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                            >
                                Reset Demo
                            </button>
                            
                            <button
                                onClick={() => setShowEditor(!showEditor)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                            >
                                {showEditor ? 'Hide Editor' : 'Show Editor'}
                            </button>
                        </div>
                    </div>
                    
                    {/* TimestampEditor */}
                    <div className="relative">
                        {showEditor ? (
                            <TimestampEditor
                                chop={chop}
                                audioDuration={audioDuration}
                                onSave={handleSave}
                                onCancel={handleCancel}
                                onPreview={handlePreview}
                                isPreviewPlaying={isPreviewPlaying}
                            />
                        ) : (
                            <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-lg p-6 text-center">
                                <div className="text-white/60 mb-4">Editor is hidden</div>
                                <button
                                    onClick={() => setShowEditor(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                                >
                                    Show Editor
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Feature Showcase */}
                <div className="mt-8 bg-black/20 backdrop-blur-lg border border-white/20 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Features Demonstrated</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                            <h3 className="font-medium text-white mb-2">Validation</h3>
                            <ul className="space-y-1">
                                <li>• Negative time validation</li>
                                <li>• Audio duration limits</li>
                                <li>• Start/end time ordering</li>
                                <li>• Minimum/maximum duration</li>
                            </ul>
                        </div>
                        
                        <div>
                            <h3 className="font-medium text-white mb-2">Input Formats</h3>
                            <ul className="space-y-1">
                                <li>• MM:SS.mmm format</li>
                                <li>• Pure seconds (90.5)</li>
                                <li>• Real-time formatting</li>
                                <li>• Auto-correction</li>
                            </ul>
                        </div>
                        
                        <div>
                            <h3 className="font-medium text-white mb-2">User Experience</h3>
                            <ul className="space-y-1">
                                <li>• Real-time preview</li>
                                <li>• Change indicators</li>
                                <li>• Keyboard shortcuts</li>
                                <li>• Error feedback</li>
                            </ul>
                        </div>
                        
                        <div>
                            <h3 className="font-medium text-white mb-2">Keyboard Shortcuts</h3>
                            <ul className="space-y-1">
                                <li>• Ctrl+Enter: Save</li>
                                <li>• Escape: Cancel</li>
                                <li>• Ctrl+Space: Preview</li>
                                <li>• Tab: Navigate fields</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                {/* Test Cases */}
                <div className="mt-8 bg-black/20 backdrop-blur-lg border border-white/20 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Test Cases to Try</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                            <h3 className="font-medium text-white mb-2">Valid Inputs</h3>
                            <ul className="space-y-1">
                                <li>• "1:30.500" (MM:SS.mmm)</li>
                                <li>• "90.5" (seconds)</li>
                                <li>• "0:05.000" (short sample)</li>
                                <li>• "2:59.999" (near end)</li>
                            </ul>
                        </div>
                        
                        <div>
                            <h3 className="font-medium text-white mb-2">Invalid Inputs</h3>
                            <ul className="space-y-1">
                                <li>• "-5" (negative time)</li>
                                <li>• "200" (exceeds duration)</li>
                                <li>• End before start</li>
                                <li>• Duration &lt; 0.1s or &gt; 30s</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
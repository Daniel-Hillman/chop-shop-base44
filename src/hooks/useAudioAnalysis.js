import { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export function useAudioAnalysis(youtubePlayer) {
    const [waveformData, setWaveformData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [audioBuffer, setAudioBuffer] = useState(null); // <-- Add state for the full buffer
    const audioContextRef = useRef(null);

    useEffect(() => {
        if (!youtubePlayer) return;

        const analyzeAudio = async () => {
            setIsAnalyzing(true);
            setWaveformData(null);
            setAudioBuffer(null);
            try {
                const functions = getFunctions();
                const getAudio = httpsCallable(functions, 'getAudio');
                const videoId = youtubePlayer.getVideoData().video_id;

                const result = await getAudio({ videoId });
                const { audioUrl } = result.data;

                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();

                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                setAudioBuffer(decodedBuffer); // <-- Store the full buffer

                const data = decodedBuffer.getChannelData(0);

                // Downsample for performance
                const samples = 200;
                const blockSize = Math.floor(data.length / samples);
                const filteredData = [];
                for (let i = 0; i < samples; i++) {
                    let blockStart = blockSize * i;
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum = sum + Math.abs(data[blockStart + j]);
                    }
                    filteredData.push(sum / blockSize);
                }

                const multiplier = Math.pow(Math.max(...filteredData), -1);
                setWaveformData(filteredData.map(n => n * multiplier));

            } catch (error) {
                console.error('Error analyzing audio:', error);
                setWaveformData(null);
                setAudioBuffer(null);
            } finally {
                setIsAnalyzing(false);
            }
        };

        const checkPlayerReady = () => {
            if (youtubePlayer.getPlayerState && youtubePlayer.getPlayerState() !== -1) {
                analyzeAudio();
            } else {
                setTimeout(checkPlayerReady, 100);
            }
        };

        checkPlayerReady();

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(e => console.error(e));
                audioContextRef.current = null;
            }
        };
    }, [youtubePlayer]);

    return { waveformData, audioBuffer, isAnalyzing }; // <-- Return the full buffer
}

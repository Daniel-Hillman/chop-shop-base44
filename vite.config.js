import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production optimizations for waveform components
    rollupOptions: {
      output: {
        // Manual chunk splitting for waveform components
        manualChunks: {
          // Audio analysis services
          'audio-analysis': [
            './src/services/WebAudioAnalyzer.js',
            './src/services/VideoFrameAnalyzer.js',
            './src/services/MetadataAnalyzer.js',
            './src/services/FallbackAnalysisChain.js'
          ],
          
          // Interactive features
          'audio-interaction': [
            './src/services/ZeroCrossingDetector.js',
            './src/services/SmartSnapping.js'
          ],
          
          // Sequencer services
          'sequencer-core': [
            './src/services/sequencer/SamplerSequencerService.js',
            './src/services/sequencer/OptimizedSamplerSequencerService.js',
            './src/services/sequencer/HighPerformanceSequencerEngine.js'
          ]
        }
      }
    },
    
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console logs in production
        drop_console: true,
        drop_debugger: true,
        // Remove unused functions
        unused: true,
        // Remove dead code
        dead_code: true
      },
      mangle: {
        // Preserve class names for debugging
        keep_classnames: false,
        keep_fnames: false
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500, // 500KB warning threshold
    
    // Source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true
  },
  
  // Development optimizations
  server: {
    // Enable HMR for waveform components
    hmr: {
      overlay: true
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      // Pre-bundle heavy dependencies
      'react',
      'react-dom'
    ],
    exclude: [
      // Don't pre-bundle workers
    ]
  }
})

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
          // Core waveform functionality
          'waveform-core': [
            './src/components/waveform/WaveformVisualization.jsx',
            './src/components/waveform/CanvasRenderer.js',
            './src/components/waveform/ViewportManager.js',
            './src/components/waveform/CanvasLayerManager.js'
          ],
          
          // Audio analysis services
          'waveform-analysis': [
            './src/services/WebAudioAnalyzer.js',
            './src/services/VideoFrameAnalyzer.js',
            './src/services/MetadataAnalyzer.js',
            './src/services/FallbackAnalysisChain.js'
          ],
          
          // Interactive features
          'waveform-interaction': [
            './src/components/waveform/InteractionManager.js',
            './src/components/waveform/ZoomControls.jsx',
            './src/services/ZeroCrossingDetector.js',
            './src/services/SmartSnapping.js'
          ],
          
          // Advanced features (lazy loaded)
          'waveform-advanced': [
            './src/components/waveform/VisualEnhancementEngine.js',
            './src/components/waveform/EnhancedCanvasRenderer.js',
            './src/services/WaveformPerformanceOptimizer.js'
          ],
          
          // Performance and utilities
          'waveform-performance': [
            './src/services/WaveformPerformanceMonitor.js',
            './src/services/WaveformMemoryManager.js',
            './src/services/WaveformCache.js',
            './src/workers/WaveformWorker.js'
          ],
          
          // Production utilities
          'waveform-production': [
            './src/services/WaveformAnalytics.js',
            './src/services/WaveformFeatureFlags.js',
            './src/services/WaveformModuleLoader.js'
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
      // Don't pre-bundle waveform workers
      './src/workers/WaveformWorker.js'
    ]
  }
})

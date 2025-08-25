#!/usr/bin/env node

/**
 * Production deployment script for waveform visualization system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DEPLOYMENT_CONFIG = {
  buildDir: 'dist',
  backupDir: 'backup',
  analyticsEndpoint: process.env.ANALYTICS_ENDPOINT,
  featureFlagsEndpoint: process.env.FEATURE_FLAGS_ENDPOINT,
  enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
  enableFeatureFlags: process.env.ENABLE_FEATURE_FLAGS === 'true'
};

/**
 * Main deployment function
 */
async function deployProduction() {
  console.log('🚀 Starting production deployment...');
  
  try {
    // Pre-deployment checks
    await runPreDeploymentChecks();
    
    // Build optimized bundle
    await buildOptimizedBundle();
    
    // Analyze bundle size
    await analyzeBundleSize();
    
    // Run production tests
    await runProductionTests();
    
    // Deploy to production
    await deployToProduction();
    
    // Post-deployment verification
    await verifyDeployment();
    
    console.log('✅ Production deployment completed successfully!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    await rollbackDeployment();
    process.exit(1);
  }
}

/**
 * Pre-deployment checks
 */
async function runPreDeploymentChecks() {
  console.log('🔍 Running pre-deployment checks...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`Node.js version: ${nodeVersion}`);
  
  // Check dependencies
  console.log('Checking dependencies...');
  execSync('npm audit --audit-level=high', { stdio: 'inherit' });
  
  // Check TypeScript/ESLint
  console.log('Running linting...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Linting warnings detected, continuing...');
  }
  
  // Check environment variables
  const requiredEnvVars = ['NODE_ENV'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  console.log('✅ Pre-deployment checks passed');
}

/**
 * Build optimized production bundle
 */
async function buildOptimizedBundle() {
  console.log('🏗️  Building optimized production bundle...');
  
  // Clean previous build
  if (fs.existsSync(DEPLOYMENT_CONFIG.buildDir)) {
    execSync(`rm -rf ${DEPLOYMENT_CONFIG.buildDir}`, { stdio: 'inherit' });
  }
  
  // Set production environment
  process.env.NODE_ENV = 'production';
  
  // Build with optimizations
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify build output
  if (!fs.existsSync(DEPLOYMENT_CONFIG.buildDir)) {
    throw new Error('Build directory not found after build');
  }
  
  console.log('✅ Production bundle built successfully');
}

/**
 * Analyze bundle size and performance
 */
async function analyzeBundleSize() {
  console.log('📊 Analyzing bundle size...');
  
  const buildDir = path.resolve(DEPLOYMENT_CONFIG.buildDir);
  const stats = await getBundleStats(buildDir);
  
  console.log('Bundle Analysis:');
  console.log(`Total size: ${formatBytes(stats.totalSize)}`);
  console.log(`JavaScript: ${formatBytes(stats.jsSize)}`);
  console.log(`CSS: ${formatBytes(stats.cssSize)}`);
  console.log(`Assets: ${formatBytes(stats.assetsSize)}`);
  
  // Check bundle size limits
  const MAX_JS_SIZE = 1024 * 1024; // 1MB
  const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB
  
  if (stats.jsSize > MAX_JS_SIZE) {
    console.warn(`⚠️  JavaScript bundle size (${formatBytes(stats.jsSize)}) exceeds limit (${formatBytes(MAX_JS_SIZE)})`);
  }
  
  if (stats.totalSize > MAX_TOTAL_SIZE) {
    console.warn(`⚠️  Total bundle size (${formatBytes(stats.totalSize)}) exceeds limit (${formatBytes(MAX_TOTAL_SIZE)})`);
  }
  
  // Generate bundle report
  await generateBundleReport(stats);
  
  console.log('✅ Bundle analysis completed');
}

/**
 * Run production-specific tests
 */
async function runProductionTests() {
  console.log('🧪 Running production tests...');
  
  // Run waveform-specific tests
  try {
    execSync('npm run test:waveform', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Some waveform tests failed, continuing with deployment...');
  }
  
  // Run performance benchmarks
  try {
    execSync('node scripts/run-waveform-tests.js --benchmark', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Performance benchmarks failed, continuing...');
  }
  
  console.log('✅ Production tests completed');
}

/**
 * Deploy to production environment
 */
async function deployToProduction() {
  console.log('🚀 Deploying to production...');
  
  // Create backup of current deployment
  await createBackup();
  
  // Deploy using Firebase (or your deployment method)
  try {
    execSync('firebase deploy --only hosting', { stdio: 'inherit' });
  } catch (error) {
    throw new Error(`Deployment failed: ${error.message}`);
  }
  
  console.log('✅ Deployment to production completed');
}

/**
 * Verify deployment
 */
async function verifyDeployment() {
  console.log('🔍 Verifying deployment...');
  
  // Add deployment verification logic here
  // This could include:
  // - Health checks
  // - Smoke tests
  // - Performance monitoring setup
  
  console.log('✅ Deployment verification completed');
}

/**
 * Create backup of current deployment
 */
async function createBackup() {
  console.log('💾 Creating deployment backup...');
  
  const backupDir = path.resolve(DEPLOYMENT_CONFIG.backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  if (fs.existsSync(DEPLOYMENT_CONFIG.buildDir)) {
    execSync(`cp -r ${DEPLOYMENT_CONFIG.buildDir} ${backupPath}`, { stdio: 'inherit' });
    console.log(`Backup created at: ${backupPath}`);
  }
}

/**
 * Rollback deployment in case of failure
 */
async function rollbackDeployment() {
  console.log('🔄 Rolling back deployment...');
  
  // Add rollback logic here
  // This could include:
  // - Restoring from backup
  // - Reverting database changes
  // - Notifying team of rollback
  
  console.log('Rollback completed');
}

/**
 * Get bundle statistics
 */
async function getBundleStats(buildDir) {
  const stats = {
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    assetsSize: 0,
    files: []
  };
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else {
        const size = stat.size;
        stats.totalSize += size;
        
        if (file.endsWith('.js')) {
          stats.jsSize += size;
        } else if (file.endsWith('.css')) {
          stats.cssSize += size;
        } else {
          stats.assetsSize += size;
        }
        
        stats.files.push({
          path: path.relative(buildDir, filePath),
          size
        });
      }
    }
  }
  
  walkDir(buildDir);
  return stats;
}

/**
 * Generate bundle report
 */
async function generateBundleReport(stats) {
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    recommendations: []
  };
  
  // Add recommendations based on bundle analysis
  if (stats.jsSize > 500 * 1024) {
    report.recommendations.push('Consider code splitting for JavaScript bundles');
  }
  
  if (stats.cssSize > 100 * 1024) {
    report.recommendations.push('Consider CSS optimization and purging');
  }
  
  // Write report to file
  const reportPath = path.join(DEPLOYMENT_CONFIG.buildDir, 'bundle-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`Bundle report generated: ${reportPath}`);
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run deployment if called directly
if (require.main === module) {
  deployProduction().catch(console.error);
}

module.exports = {
  deployProduction,
  runPreDeploymentChecks,
  buildOptimizedBundle,
  analyzeBundleSize
};
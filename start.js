const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Cleaning Service Backend...\n');

// Check if .env file exists
const fs = require('fs');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found. Creating from .env.example...');
  const examplePath = path.join(__dirname, '.env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('✅ .env file created. Please update it with your configuration.\n');
  } else {
    console.log('❌ .env.example file not found. Please create .env manually.\n');
  }
}

// Start the server
const server = spawn('node', ['src/server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('close', (code) => {
  console.log(`\n💤 Server process exited with code ${code}`);
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.kill('SIGTERM');
});

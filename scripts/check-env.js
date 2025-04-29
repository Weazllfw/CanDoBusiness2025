#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const color = type === 'error' ? colors.red 
              : type === 'success' ? colors.green 
              : type === 'warning' ? colors.yellow 
              : colors.blue;
  console.log(`${color}${message}${colors.reset}`);
}

function checkFile(filepath, required = true) {
  const exists = fs.existsSync(filepath);
  const filename = path.basename(filepath);
  
  if (exists) {
    log(`✓ ${filename} exists`, 'success');
    return true;
  } else {
    log(`✗ ${filename} ${required ? 'missing!' : 'not found (optional)'}`, required ? 'error' : 'warning');
    return false;
  }
}

function checkEnvVars(filepath, requiredVars) {
  if (!fs.existsSync(filepath)) return false;
  
  const content = fs.readFileSync(filepath, 'utf8');
  const vars = Object.fromEntries(
    content.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('=').map(part => part.trim().replace(/["']/g, '')))
  );

  let allPresent = true;
  for (const varName of requiredVars) {
    if (vars[varName]) {
      log(`✓ ${varName} is set`, 'success');
    } else {
      log(`✗ ${varName} is missing!`, 'error');
      allPresent = false;
    }
  }
  return allPresent;
}

function checkSupabaseConnection() {
  try {
    execSync('supabase status', { stdio: 'pipe' });
    log('✓ Supabase is running', 'success');
    return true;
  } catch (error) {
    log('✗ Supabase is not running!', 'error');
    log('  Run "supabase start" to start the services', 'info');
    return false;
  }
}

function checkPostgresConnection(url) {
  try {
    // Extract port from DATABASE_URL
    const port = url.match(/:(\d+)\//)[1];
    execSync(`pg_isready -h localhost -p ${port}`, { stdio: 'pipe' });
    log(`✓ PostgreSQL is running on port ${port}`, 'success');
    return true;
  } catch (error) {
    log('✗ PostgreSQL connection failed!', 'error');
    log('  Check if PostgreSQL is running and the DATABASE_URL is correct', 'info');
    return false;
  }
}

function validateDatabaseUrl(url) {
  const pattern = /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^/]+$/;
  return pattern.test(url);
}

function main() {
  log('\nChecking environment setup...', 'info');
  log('========================\n');

  // Check frontend environment
  log('Frontend Environment:', 'info');
  const frontendEnvOk = checkFile('cando-frontend/.env.local') &&
    checkEnvVars('cando-frontend/.env.local', [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'DATABASE_URL'
    ]);

  // Validate DATABASE_URL format if present
  if (frontendEnvOk) {
    const content = fs.readFileSync('cando-frontend/.env.local', 'utf8');
    const dbUrl = content.match(/DATABASE_URL=(.*)/)?.[1]?.trim().replace(/["']/g, '');
    if (dbUrl && !validateDatabaseUrl(dbUrl)) {
      log('✗ DATABASE_URL format is invalid!', 'error');
      log('  Expected format: postgresql://user:password@host:port/database', 'info');
    }
  }

  // Check Supabase environment
  log('\nSupabase Environment:', 'info');
  const supabaseEnvOk = checkFile('supabase/.env') &&
    checkEnvVars('supabase/.env', [
      'SUPABASE_PROJECT_ID',
      'SUPABASE_DB_PORT',
      'SUPABASE_JWT_SECRET',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]);

  // Check services
  log('\nServices:', 'info');
  const servicesOk = checkSupabaseConnection();

  // Check database connection if DATABASE_URL is available
  let dbOk = false;
  if (frontendEnvOk) {
    const content = fs.readFileSync('cando-frontend/.env.local', 'utf8');
    const dbUrl = content.match(/DATABASE_URL=(.*)/)?.[1]?.trim().replace(/["']/g, '');
    if (dbUrl) {
      dbOk = checkPostgresConnection(dbUrl);
    }
  }

  // Check ports
  log('\nPort Availability:', 'info');
  const ports = [3000, 54321, 54322, 54323, 54324];
  const portsOk = ports.every(port => {
    try {
      execSync(`netstat -ano | findstr :${port}`, { stdio: 'pipe' });
      log(`✓ Port ${port} is in use (expected)`, 'success');
      return true;
    } catch (error) {
      log(`✗ Port ${port} is not in use!`, 'error');
      return false;
    }
  });

  // Summary
  log('\nSummary:', 'info');
  log('========================');
  const allOk = frontendEnvOk && supabaseEnvOk && servicesOk && dbOk && portsOk;
  
  if (allOk) {
    log('\n✓ Environment is properly configured!', 'success');
  } else {
    log('\n✗ Environment setup needs attention!', 'error');
    log('\nTroubleshooting steps:', 'info');
    log('1. Copy example env files if missing:', 'info');
    log('   cp cando-frontend/.env.local.example cando-frontend/.env.local', 'info');
    log('   cp supabase/.env.example supabase/.env', 'info');
    log('2. Verify environment variables are properly set:', 'info');
    log('   - Check SUPABASE_PROJECT_ID is set to "cando-business"', 'info');
    log('   - Ensure SUPABASE_DB_PORT matches DATABASE_URL port (54322)', 'info');
    log('   - Verify JWT secret is at least 32 characters long', 'info');
    log('   - Confirm NEXT_PUBLIC_SUPABASE_URL points to http://127.0.0.1:54321', 'info');
    log('3. Start Supabase if not running:', 'info');
    log('   supabase start', 'info');
    log('4. Check if ports are blocked by other services', 'info');
  }
}

main(); 
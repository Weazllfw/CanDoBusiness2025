import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function runCommand(command, description) {
    console.log(`\n🚀 ${description}...`);
    try {
        const { stdout, stderr } = await execAsync(command, { cwd: projectRoot });
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        console.log(`✅ ${description} completed successfully`);
        return true;
    } catch (error) {
        console.error(`❌ Error during ${description}:`, error.message);
        return false;
    }
}

async function setupSystem() {
    console.log('Starting setup process...\n');

    // 1. Run admin setup script
    const adminSetupSuccess = await runCommand(
        'node "D:/Projects/CanDoBusiness/gitHub/CanDoBusiness2025/scripts/setup-admin.js"',
        'Setting up admin account'
    );
    if (!adminSetupSuccess) {
        console.error('Failed to setup admin account. Aborting process.');
        return;
    }

    // 2. Generate updated types
    const typeGenSuccess = await runCommand(
        'supabase gen types typescript --local > "D:/Projects/CanDoBusiness/gitHub/CanDoBusiness2025/cando-frontend/src/types/supabase.ts"',
        'Generating updated TypeScript types'
    );
    if (!typeGenSuccess) {
        console.error('Failed to generate types. Please check your Supabase configuration.');
        return;
    }

    // 3. Seed development data
    const seedDataSuccess = await runCommand(
        'node ./scripts/seed-dev-data.js',
        'Seeding development data'
    );
    if (!seedDataSuccess) {
        console.error('Failed to seed development data. Please check the script logs.');
        // Optionally, decide if this failure should abort the entire process
        // return;
    }

    console.log('\n✨ All tasks completed successfully!');
}

// Run the script
setupSystem().catch(error => {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
}); 
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const commands = {
  init: initProject,
  migrate: runMigrations,
  deploy: deployFunctions,
  help: showHelp,
};

const args = process.argv.slice(2);
const command = args[0] || 'help';

if (commands[command]) {
  commands[command]();
} else {
  console.error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}

function initProject() {
  console.log('ð Initializing Agent System...\n');

  // Copy migrations
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const packageMigrationsDir = path.join(__dirname, '..', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const migrations = fs.readdirSync(packageMigrationsDir);
  migrations.forEach((file) => {
    const source = path.join(packageMigrationsDir, file);
    const dest = path.join(migrationsDir, file);
    fs.copyFileSync(source, dest);
    console.log(`â Copied migration: ${file}`);
  });

  // Copy backend functions
  const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
  const packageFunctionsDir = path.join(__dirname, '..', 'backend');

  if (!fs.existsSync(functionsDir)) {
    fs.mkdirSync(functionsDir, { recursive: true });
  }

  const functions = fs.readdirSync(packageFunctionsDir);
  functions.forEach((dir) => {
    const source = path.join(packageFunctionsDir, dir);
    const dest = path.join(functionsDir, dir);

    if (fs.statSync(source).isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      const files = fs.readdirSync(source);
      files.forEach((file) => {
        fs.copyFileSync(path.join(source, file), path.join(dest, file));
      });

      console.log(`â Copied function: ${dir}`);
    }
  });

  // Create config file
  const configPath = path.join(process.cwd(), 'agent-system.config.ts');
  if (!fs.existsSync(configPath)) {
    const configTemplate = `import { AgentSystemConfig } from '@lovable/agent-system';

export const agentSystemConfig: AgentSystemConfig = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || '',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  // Optional: customize table and function names
  // tables: {
  //   agents: 'agents',
  //   executions: 'agent_executions',
  // },
  // functions: {
  //   testAgent: 'test-agent',
  //   checkTriggers: 'check-and-execute-triggers',
  // },
};
`;
    fs.writeFileSync(configPath, configTemplate);
    console.log('â Created agent-system.config.ts');
  }

  console.log('\nâ¨ Agent System initialized successfully!');
  console.log('\nNext steps:');
  console.log('1. Run migrations: npx agent-system migrate');
  console.log('2. Deploy functions: npx agent-system deploy');
  console.log('3. Import AgentSystemProvider in your app');
}

function runMigrations() {
  console.log('ð¦ Running migrations...\n');

  try {
    execSync('npx supabase db push', { stdio: 'inherit' });
    console.log('\nâ Migrations applied successfully!');
  } catch (error) {
    console.error('â Failed to run migrations');
    process.exit(1);
  }
}

function deployFunctions() {
  console.log('ð Deploying edge functions...\n');

  const functions = ['test-agent', 'check-and-execute-triggers', 'list-tables', 'list-columns'];

  try {
    functions.forEach((fn) => {
      console.log(`Deploying ${fn}...`);
      execSync(`npx supabase functions deploy ${fn}`, { stdio: 'inherit' });
    });
    console.log('\nâ All functions deployed successfully!');
  } catch (error) {
    console.error('â Failed to deploy functions');
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Agent System CLI

Usage: npx agent-system <command>

Commands:
  init      Initialize Agent System in your project
  migrate   Run database migrations
  deploy    Deploy edge functions
  help      Show this help message

Examples:
  npx agent-system init
  npx agent-system migrate
  npx agent-system deploy
`);
}

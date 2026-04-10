#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Module imports ─────────────────────────────────────────────────────────────
const { detectPlatforms } = require('../src/detect-platforms');
const { detectStack } = require('../src/detect-stack');
const { mapComponents } = require('../src/map-components');
const { loadAndValidate, listProfiles } = require('../src/profile-loader');
const { writeClaudeMd } = require('../src/generate-claude-md');
const { writeAgentsMd } = require('../src/generate-agents-md');
const { writeCopilotInstructions } = require('../src/generate-copilot-instructions');
const { verifyInstall } = require('../src/verify-install');
const { addTech } = require('../src/add-tech');
const { uninstall } = require('../src/uninstall');
const ui = require('../src/prompt-ui');

// Platform installers
const { installClaude } = require('../src/install-claude');
const { installVSCode } = require('../src/install-vscode');
const { installCursor } = require('../src/install-cursor');
const { installCopilotCli } = require('../src/install-copilot-cli');
const { installCodex } = require('../src/install-codex');
const { installOpencode } = require('../src/install-opencode');
const { installGemini } = require('../src/install-gemini');
const { installAntigravity } = require('../src/install-antigravity');

// ── CLI Flag parsing ───────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {
    // Platforms
    claude: false,
    cursor: false,
    vscode: false,
    'copilot-cli': false,
    codex: false,
    opencode: false,
    gemini: false,
    antigravity: false,
    all: false,

    // Scope
    global: false,
    local: false,
    both: false,

    // Profile
    profile: null,

    // Tech stack
    frontend: null,
    backend: null,
    db: null,
    orm: null,
    cache: null,
    cloud: null,
    cicd: null,
    testing: null,
    mobile: null,

    // Operations
    'auto-detect': false,
    'add-tech': false,
    update: false,
    uninstall: false,
    'check-update': false,
    'skip-verify': false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--claude') flags.claude = true;
    else if (arg === '--cursor') flags.cursor = true;
    else if (arg === '--vscode') flags.vscode = true;
    else if (arg === '--copilot-cli') flags['copilot-cli'] = true;
    else if (arg === '--codex') flags.codex = true;
    else if (arg === '--opencode') flags.opencode = true;
    else if (arg === '--gemini') flags.gemini = true;
    else if (arg === '--antigravity') flags.antigravity = true;
    else if (arg === '--all') flags.all = true;
    else if (arg === '--global' || arg === '-g') flags.global = true;
    else if (arg === '--local' || arg === '-l') flags.local = true;
    else if (arg === '--both') flags.both = true;
    else if (arg === '--auto-detect') flags['auto-detect'] = true;
    else if (arg === '--add-tech') flags['add-tech'] = true;
    else if (arg === '--update') flags.update = true;
    else if (arg === '--uninstall') flags.uninstall = true;
    else if (arg === '--check-update') flags['check-update'] = true;
    else if (arg === '--skip-verify') flags['skip-verify'] = true;
    else if (arg.startsWith('--') && args[i + 1] && !args[i + 1].startsWith('--')) {
      const key = arg.slice(2);
      if (key in flags) {
        flags[key] = args[++i];
      }
    }
  }

  return flags;
}

/**
 * Determine if we're in non-interactive mode.
 * Non-interactive if platform + scope + profile are all specified via flags.
 */
function isNonInteractive(flags) {
  const hasPlatform = flags.claude || flags.cursor || flags.vscode || flags.codex ||
    flags.opencode || flags.gemini || flags.antigravity || flags['copilot-cli'] || flags.all;
  const hasScope = flags.global || flags.local || flags.both;
  const hasProfile = !!flags.profile;
  return hasPlatform && hasScope && hasProfile;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function printPlatformResults(platforms) {
  ui.writeln('');
  ui.writeln(ui.colored('Scanning your development environment...', ui.DIM));
  ui.writeln('');
  ui.writeln(`  ${ui.colored('AI coding tools:', ui.BOLD)}`);

  const check = (v) => v ? ui.colored('✓', ui.GREEN, ui.BOLD) : ui.colored('✗', ui.DIM);
  const ver = (v) => v ? ui.colored(v, ui.DIM) : ui.colored('not found', ui.DIM);

  ui.writeln(`    ${check(platforms.claude.detected)} Claude Code CLI        ${ver(platforms.claude.version)}`);
  ui.writeln(`    ${check(platforms.codex.detected)} Codex CLI              ${ver(platforms.codex.version)}`);
  ui.writeln(`    ${check(platforms.opencode.detected)} OpenCode               ${ver(platforms.opencode.version)}`);
  ui.writeln('');
  ui.writeln(`  ${ui.colored('IDEs & editors:', ui.BOLD)}`);

  const vsExt = platforms.vscode.detected
    ? ` (extensions: GitHub Copilot ${platforms.vscode.copilot ? ui.colored('✓', ui.GREEN) : ui.colored('✗', ui.RED)}, Copilot Chat ${platforms.vscode.copilotChat ? ui.colored('✓', ui.GREEN) : ui.colored('✗', ui.RED)})`
    : '';
  ui.writeln(`    ${check(platforms.vscode.detected)} VS Code               ${ver(platforms.vscode.version)}${vsExt}`);
  ui.writeln(`    ${check(platforms.cursor.detected)} Cursor IDE             ${ver(platforms.cursor.version)}`);
  ui.writeln(`    ${check(platforms.jetbrains.detected)} JetBrains             ${ver(platforms.jetbrains.version)}`);
  ui.writeln('');
  ui.writeln(`  ${ui.colored('Other:', ui.BOLD)}`);
  ui.writeln(`    ${check(platforms.gemini.detected)} Gemini CLI             ${ver(platforms.gemini.version)}`);
  ui.writeln(`    ${check(platforms.antigravity.detected)} Antigravity           ${ver(platforms.antigravity.version)}`);
  ui.writeln(`    ${check(platforms.copilotCli.detected)} GitHub Copilot CLI     ${ver(platforms.copilotCli.version)}`);
  ui.writeln('');
}

/**
 * Save stack.json to .rapidx/.
 */
function saveStackJson(targetDir, stackSelections, components, profileId) {
  const rapidxDir = path.join(targetDir, '.rapidx');
  fs.mkdirSync(rapidxDir, { recursive: true });

  const stackData = Object.assign({}, stackSelections, {
    detected_at: new Date().toISOString(),
    profile: profileId,
    installed_components: {
      rules: Array.from(components.rules),
      skills: Array.from(components.skills),
      agents: Array.from(components.agents),
      hooks: Array.from(components.hooks),
    },
  });

  fs.writeFileSync(path.join(rapidxDir, 'stack.json'), JSON.stringify(stackData, null, 2), 'utf8');
  return stackData;
}

/**
 * Run the interactive tech stack questionnaire.
 */
async function runStackQuestionnaire(detectedStack) {
  const stack = {};

  ui.section('Frontend');

  const feFramework = await ui.singleSelect('Frontend framework', [
    { label: 'React', value: 'react' },
    { label: 'Next.js', value: 'nextjs' },
    { label: 'Angular', value: 'angular' },
    { label: 'Vue.js / Nuxt', value: 'vue' },
    { label: 'Svelte / SvelteKit', value: 'svelte' },
    { label: 'None / not applicable', value: 'none' },
  ]);

  if (feFramework !== 'none') {
    const detectedFeVer = detectedStack.react || detectedStack.next || detectedStack.angular || detectedStack.vue || detectedStack.svelte;
    const feVersion = await ui.textInput('Frontend version', detectedFeVer ? detectedFeVer.version : '');

    const uiLibraries = await ui.multiSelect('UI library', [
      { label: 'Tailwind CSS', value: 'tailwind' },
      { label: 'Material UI / MUI', value: 'mui' },
      { label: 'Ant Design', value: 'antd' },
      { label: 'Chakra UI', value: 'chakra' },
      { label: 'shadcn/ui', value: 'shadcn' },
      { label: 'None / custom', value: 'none' },
    ]);

    const stateManagement = await ui.multiSelect('State management', [
      { label: 'Redux / RTK', value: 'redux' },
      { label: 'Zustand', value: 'zustand' },
      { label: 'Jotai / Recoil', value: 'jotai' },
      { label: 'Context API only', value: 'context' },
      { label: 'None', value: 'none' },
    ]);

    stack.frontend = {
      framework: feFramework,
      version: feVersion || null,
      ui_library: uiLibraries.filter(v => v !== 'none'),
      state_management: stateManagement.filter(v => v !== 'none'),
    };
  }

  ui.section('Backend');

  const beChoice = await ui.singleSelect('Language & framework', [
    { label: 'TypeScript / Node.js — Express', value: 'typescript-express' },
    { label: 'TypeScript / Node.js — NestJS', value: 'typescript-nestjs' },
    { label: 'TypeScript / Node.js — Fastify', value: 'typescript-fastify' },
    { label: 'Python — FastAPI', value: 'python-fastapi' },
    { label: 'Python — Django / DRF', value: 'python-django' },
    { label: 'Python — Flask', value: 'python-flask' },
    { label: 'Java — Spring Boot', value: 'java-springboot' },
    { label: 'Go — stdlib / Chi / Gin', value: 'go-stdlib' },
    { label: 'Rust — Axum / Actix', value: 'rust-axum' },
    { label: 'C# — .NET / ASP.NET', value: 'csharp-dotnet' },
    { label: 'PHP — Laravel', value: 'php-laravel' },
    { label: 'None / not applicable', value: 'none' },
  ]);

  if (beChoice !== 'none') {
    const [lang, fw] = beChoice.split('-');
    const detectedBeVer = detectedStack.typescript || detectedStack.python || detectedStack.go || detectedStack.java;
    const beVersion = await ui.textInput('Runtime version', detectedBeVer ? detectedBeVer.version : '');

    const apiStyles = await ui.multiSelect('API style', [
      { label: 'REST', value: 'rest' },
      { label: 'GraphQL', value: 'graphql' },
      { label: 'gRPC', value: 'grpc' },
      { label: 'tRPC', value: 'trpc' },
    ]);

    stack.backend = {
      language: lang,
      language_version: beVersion || null,
      runtime: lang === 'typescript' || lang === 'javascript' ? 'node' : lang,
      runtime_version: (detectedStack.node && detectedStack.node.version) || null,
      framework: fw || null,
      framework_version: null,
      api_style: apiStyles,
    };
  }

  ui.section('Database');

  const dbChoice = await ui.singleSelect('Primary database', [
    { label: 'PostgreSQL', value: 'postgresql' },
    { label: 'MySQL / MariaDB', value: 'mysql' },
    { label: 'MongoDB', value: 'mongodb' },
    { label: 'DynamoDB', value: 'dynamodb' },
    { label: 'SQL Server', value: 'sqlserver' },
    { label: 'SQLite', value: 'sqlite' },
    { label: 'None / not applicable', value: 'none' },
  ]);

  if (dbChoice !== 'none') {
    const detectedDbVer = detectedStack.databases && detectedStack.databases.value && detectedStack.databases.value[dbChoice];
    const dbVersion = await ui.textInput('Database version', detectedDbVer || '');

    const ormChoice = await ui.singleSelect('ORM / query layer', [
      { label: 'Prisma', value: 'prisma' },
      { label: 'Drizzle', value: 'drizzle' },
      { label: 'TypeORM', value: 'typeorm' },
      { label: 'Sequelize', value: 'sequelize' },
      { label: 'SQLAlchemy', value: 'sqlalchemy' },
      { label: 'Django ORM', value: 'django-orm' },
      { label: 'JPA / Hibernate', value: 'jpa' },
      { label: 'GORM', value: 'gorm' },
      { label: 'Raw SQL', value: 'none' },
    ]);

    const cache = await ui.multiSelect('Cache layer', [
      { label: 'Redis', value: 'redis' },
      { label: 'Memcached', value: 'memcached' },
      { label: 'None', value: 'none' },
    ]);

    stack.database = {
      primary: dbChoice,
      primary_version: dbVersion || null,
      orm: ormChoice !== 'none' ? ormChoice : null,
      orm_version: null,
      cache: cache.filter(v => v !== 'none'),
    };
  }

  ui.section('Infrastructure & cloud');

  const cloud = await ui.singleSelect('Cloud provider', [
    { label: 'AWS', value: 'aws' },
    { label: 'Azure', value: 'azure' },
    { label: 'GCP', value: 'gcp' },
    { label: 'On-premise / hybrid', value: 'on-premise' },
    { label: 'None / not decided', value: 'none' },
  ]);

  const containers = await ui.multiSelect('Container & orchestration', [
    { label: 'Docker', value: 'docker' },
    { label: 'Kubernetes', value: 'kubernetes' },
    { label: 'Docker Compose only', value: 'docker-compose' },
    { label: 'None', value: 'none' },
  ]);

  const cicd = await ui.multiSelect('CI/CD', [
    { label: 'GitHub Actions', value: 'github-actions', checked: !!(detectedStack.cicd && detectedStack.cicd.platform === 'github-actions') },
    { label: 'GitLab CI', value: 'gitlab-ci' },
    { label: 'Jenkins', value: 'jenkins' },
    { label: 'Azure DevOps', value: 'azure-devops' },
    { label: 'CircleCI', value: 'circleci' },
    { label: 'None', value: 'none' },
  ]);

  stack.infrastructure = {
    cloud: cloud !== 'none' ? cloud : null,
    containers: containers.filter(v => v !== 'none'),
    cicd: cicd.filter(v => v !== 'none'),
    orchestration: containers.includes('kubernetes') ? 'kubernetes' : null,
  };

  ui.section('Testing');

  const testFrameworks = await ui.multiSelect('Test frameworks', [
    { label: 'Jest', value: 'jest' },
    { label: 'Vitest', value: 'vitest' },
    { label: 'Playwright', value: 'playwright' },
    { label: 'Cypress', value: 'cypress' },
    { label: 'pytest', value: 'pytest' },
    { label: 'JUnit', value: 'junit' },
    { label: 'Go testing', value: 'gotest' },
    { label: 'None / will set up later', value: 'none' },
  ]);

  const e2eFrameworks = ['playwright', 'cypress'];
  const unitFrameworks = ['jest', 'vitest', 'pytest', 'junit', 'gotest'];
  stack.testing = {
    unit: testFrameworks.filter(f => unitFrameworks.includes(f)),
    e2e: testFrameworks.filter(f => e2eFrameworks.includes(f)),
    coverage_tool: null,
    frameworks: testFrameworks.filter(f => f !== 'none'),
  };

  ui.section('Mobile (optional)');

  const mobileFramework = await ui.singleSelect('Mobile framework', [
    { label: 'React Native', value: 'react-native' },
    { label: 'Flutter', value: 'flutter' },
    { label: 'Swift (iOS native)', value: 'swift-ios' },
    { label: 'Kotlin (Android native)', value: 'kotlin' },
    { label: 'None / not applicable', value: 'none' },
  ]);

  if (mobileFramework !== 'none') {
    stack.mobile = { framework: mobileFramework };
  }

  return stack;
}

/**
 * Show the installation plan and ask for confirmation.
 */
async function showInstallPlan(platforms, profileId, stackSelections, components) {
  const fe = stackSelections.frontend || {};
  const be = stackSelections.backend || {};
  const db = stackSelections.database || {};
  const infra = stackSelections.infrastructure || {};

  const techParts = [
    fe.framework ? `${fe.framework}${fe.version ? ' ' + fe.version : ''}` : null,
    be.language ? `${be.language}${be.language_version ? ' ' + be.language_version : ''}` : null,
    be.framework ? be.framework : null,
    db.primary ? `${db.primary}${db.primary_version ? ' ' + db.primary_version : ''}` : null,
    db.orm || null,
    ...(infra.containers || []),
    ...(infra.cicd || []),
  ].filter(Boolean);

  ui.writeln('');
  ui.writeln(ui.colored("  Here's what RapidX will install based on your selections:", ui.BOLD));
  ui.writeln('');
  ui.writeln(`  ${ui.colored('Platforms:', ui.BOLD)}     ${platforms.join(', ')}`);
  ui.writeln(`  ${ui.colored('Profile:', ui.BOLD)}       ${profileId}`);
  ui.writeln(`  ${ui.colored('Tech stack:', ui.BOLD)}    ${techParts.join(', ') || 'not configured'}`);
  ui.writeln('');
  ui.writeln(`  ${ui.colored('Components to install:', ui.BOLD)}`);
  ui.writeln(`    ${ui.colored('Rules', ui.CYAN)} (${components.rules.size}):   ${Array.from(components.rules).join(', ')}`);
  ui.writeln(`    ${ui.colored('Skills', ui.CYAN)} (${components.skills.size}): ${Array.from(components.skills).join(', ')}`);
  ui.writeln(`    ${ui.colored('Agents', ui.CYAN)} (${components.agents.size}): ${Array.from(components.agents).join(', ')}`);
  ui.writeln(`    ${ui.colored('Hooks', ui.CYAN)} (${components.hooks.size}):   ${Array.from(components.hooks).join(', ')}`);
  ui.writeln('');

  if (components.skipped.rules.length + components.skipped.skills.length + components.skipped.agents.length > 0) {
    ui.writeln(`  ${ui.colored('Skipping (not relevant to your stack):', ui.DIM)}`);
    if (components.skipped.rules.length) {
      ui.writeln(`    ${ui.colored('Rules:', ui.DIM)}   ${components.skipped.rules.join(', ')}`);
    }
    if (components.skipped.skills.length) {
      ui.writeln(`    ${ui.colored('Skills:', ui.DIM)}  ${components.skipped.skills.join(', ')}`);
    }
    if (components.skipped.agents.length) {
      ui.writeln(`    ${ui.colored('Agents:', ui.DIM)}  ${components.skipped.agents.join(', ')}`);
    }
    ui.writeln('');
  }

  return ui.confirm('Proceed?');
}

/**
 * Run per-platform installers.
 */
async function runInstallers(platforms, targetDir, profile, stack, components) {
  const total = platforms.length + 5; // extra steps for init, stack.json, generators, verify
  const progress = ui.progressBar(total);

  ui.writeln('');
  progress.advance('Creating directory structure...');
  fs.mkdirSync(path.join(targetDir, '.rapidx'), { recursive: true });
  progress.done('Creating directory structure...');

  for (const platform of platforms) {
    progress.advance(`Configuring ${platform}...`);

    try {
      const opts = { targetDir, profile, stack, components };
      switch (platform) {
        case 'claude': installClaude(opts); break;
        case 'vscode': installVSCode(opts); break;
        case 'cursor': installCursor(opts); break;
        case 'copilot-cli': installCopilotCli(opts); break;
        case 'codex': installCodex(opts); break;
        case 'opencode': installOpencode(opts); break;
        case 'gemini': installGemini(opts); break;
        case 'antigravity': installAntigravity(opts); break;
      }
      progress.done(`Configuring ${platform}...`);
    } catch (e) {
      process.stderr.write(`\n  [RapidX] Error configuring ${platform}: ${e.message}\n`);
      progress.done(`Configuring ${platform} (with errors)...`);
    }
  }

  progress.advance('Loading client profile...');
  // Profile already loaded
  progress.done('Loading client profile...');

  progress.advance('Saving stack configuration...');
  saveStackJson(targetDir, stack, components, profile.profile_id);
  progress.done('Saving stack configuration...');

  progress.advance('Running verification...');
  const verification = verifyInstall({ targetDir, platforms });
  if (verification.errors.length) {
    verification.errors.forEach(e => process.stderr.write(`  [RapidX] Verification error: ${e}\n`));
  }
  progress.done('Running verification...');

  ui.writeln('');
  ui.writeln(ui.colored('  Installation complete!', ui.GREEN, ui.BOLD));

  return verification;
}

/**
 * Print the quick-start guide.
 */
function printQuickStart(platforms, profileId, stack, targetDir, components) {
  const fe = stack.frontend || {};
  const be = stack.backend || {};
  const db = stack.database || {};

  const techStr = [
    fe.framework ? `${fe.framework}${fe.version ? ' ' + fe.version : ''}` : null,
    be.language ? `${be.language}${be.language_version ? ' ' + be.language_version : ''}` : null,
    be.framework || null,
    db.primary ? `${db.primary}${db.primary_version ? ' ' + db.primary_version : ''}` : null,
  ].filter(Boolean).join(' · ');

  ui.writeln('');
  ui.writeln(ui.colored('  ✓ RapidX is ready!', ui.GREEN, ui.BOLD));
  ui.writeln('');
  ui.summary({
    platforms: platforms,
    profile: profileId,
    techStack: techStr || 'not configured',
    location: targetDir,
    installed: `${components.rules.size} rules · ${components.skills.size} skills · ${components.agents.size} agents · ${components.hooks.size} hooks`,
    skipped: `${components.skipped.rules.length} rules · ${components.skipped.skills.length} skills · ${components.skipped.agents.length} agents (not relevant to stack)`,
  });

  ui.writeln(ui.colored('  Quick start:', ui.BOLD));
  if (platforms.includes('claude')) {
    ui.writeln(`    ${ui.colored('Claude Code:', ui.CYAN)}    claude → /gsd:new-project`);
  }
  if (platforms.includes('vscode')) {
    ui.writeln(`    ${ui.colored('VS Code:', ui.CYAN)}        Open project → Copilot Chat → type /gsd:new-project`);
  }
  if (platforms.includes('cursor')) {
    ui.writeln(`    ${ui.colored('Cursor:', ui.CYAN)}         Open project → AI chat → commands available`);
  }
  ui.writeln('');
  ui.writeln(ui.colored('  Key commands:', ui.BOLD));
  ui.writeln(`    ${ui.colored('/gsd:new-project', ui.CYAN)}       Start a new project with Get Things Done workflow`);
  ui.writeln(`    ${ui.colored('/gsd:map-codebase', ui.CYAN)}      Analyze existing codebase`);
  ui.writeln(`    ${ui.colored('/gsd:quick', ui.CYAN)}             Quick ad-hoc task or bug fix`);
  ui.writeln(`    ${ui.colored('/rapidx:help', ui.CYAN)}           Show all RapidX commands`);
  ui.writeln(`    ${ui.colored('/rapidx:switch-client', ui.CYAN)}  Change client profile`);
  ui.writeln(`    ${ui.colored('/rapidx:add-tech', ui.CYAN)}       Add a technology to your stack`);
  ui.writeln('');
  ui.writeln(`  Config saved to: ${ui.colored('.rapidx/stack.json', ui.CYAN)}`);
  ui.writeln('');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const flags = parseArgs(process.argv);

  // Show animated banner
  await ui.banner();

  // Handle --check-update
  if (flags['check-update']) {
    ui.writeln('  Checking for updates... (visit https://github.com/rapidx/rapidx-platform for latest)');
    process.exit(0);
  }

  // Detect platforms
  ui.writeln(ui.colored('  Scanning your development environment...', ui.DIM));
  const platforms = detectPlatforms();
  printPlatformResults(platforms);

  // Determine target directory
  const scope = flags.global ? 'global' : (flags.both ? 'both' : 'local');
  const targetDir = flags.global ? os.homedir() : process.cwd();

  // ── Handle --uninstall ───────────────────────────────────────────────────────
  if (flags.uninstall) {
    const platformList = buildPlatformList(flags, platforms);
    const confirmed = await ui.confirm('Remove RapidX from the selected platforms?');
    if (confirmed) {
      uninstall({ targetDir, platforms: platformList });
      ui.writeln(ui.colored('  RapidX uninstalled.', ui.GREEN));
    }
    process.exit(0);
  }

  // ── Handle --add-tech ───────────────────────────────────────────────────────
  if (flags['add-tech']) {
    ui.writeln(ui.colored('  Adding technology to existing install...', ui.CYAN));
    const detectedStack = detectStack(process.cwd());
    const newSelections = await runStackQuestionnaire(detectedStack);
    const installedPlatforms = buildPlatformList(flags, platforms);
    addTech({ targetDir, newStackSelections: newSelections, platforms: installedPlatforms });
    ui.writeln(ui.colored('  Technology added successfully.', ui.GREEN));
    process.exit(0);
  }

  // ── Handle --update ──────────────────────────────────────────────────────────
  if (flags.update) {
    ui.writeln(ui.colored('  Updating RapidX...', ui.CYAN));
    // Re-run install with existing stack.json
    const stackPath = path.join(targetDir, '.rapidx', 'stack.json');
    if (!fs.existsSync(stackPath)) {
      process.stderr.write('[RapidX] No existing installation found. Run without --update to install.\n');
      process.exit(1);
    }
    const existingStack = JSON.parse(fs.readFileSync(stackPath, 'utf8'));
    const profileId = existingStack.profile || 'default';
    const profile = loadAndValidate(profileId, existingStack);
    const components = mapComponents(existingStack);
    const installedPlatforms = buildPlatformList(flags, platforms);
    await runInstallers(installedPlatforms, targetDir, profile, existingStack, components);
    printQuickStart(installedPlatforms, profileId, existingStack, targetDir, components);
    process.exit(0);
  }

  // ── Interactive or non-interactive install ────────────────────────────────────
  const nonInteractive = isNonInteractive(flags);

  let selectedPlatforms;
  let stackSelections;
  let profileId;
  let installScope;

  if (nonInteractive) {
    // Use flags directly
    selectedPlatforms = buildPlatformList(flags, platforms);
    installScope = scope;
    profileId = flags.profile;

    if (flags['auto-detect']) {
      const detected = detectStack(process.cwd());
      stackSelections = buildStackFromDetected(detected);
    } else {
      stackSelections = parseStackFromFlags(flags);
    }
  } else {
    // Interactive flow

    // Platform selection
    const platformOptions = [
      { label: `Claude Code CLI${platforms.claude.detected ? ' (detected v' + (platforms.claude.version || '?') + ')' : ''}`, value: 'claude', checked: platforms.claude.detected },
      { label: `VS Code + GitHub Copilot${platforms.vscode.detected ? ' (detected)' : ''}`, value: 'vscode', checked: platforms.vscode.detected },
      { label: `Cursor IDE${platforms.cursor.detected ? ' (detected v' + (platforms.cursor.version || '?') + ')' : ''}`, value: 'cursor', checked: platforms.cursor.detected },
      { label: 'Codex CLI / App', value: 'codex', checked: false },
      { label: 'OpenCode', value: 'opencode', checked: false },
      { label: 'GitHub Copilot CLI (standalone)', value: 'copilot-cli', checked: platforms.copilotCli.detected },
      { label: 'Gemini CLI', value: 'gemini', checked: platforms.gemini.detected },
      { label: 'Antigravity', value: 'antigravity', checked: platforms.antigravity.detected },
    ];

    selectedPlatforms = await ui.multiSelect('Which platforms do you want to configure?', platformOptions);

    if (selectedPlatforms.length === 0) {
      ui.writeln(ui.colored('  No platforms selected. Exiting.', ui.YELLOW));
      process.exit(0);
    }

    // VS Code without Copilot warning
    if (selectedPlatforms.includes('vscode') && !platforms.vscode.copilot) {
      ui.writeln('');
      ui.writeln(ui.colored('  GitHub Copilot extension not detected.', ui.YELLOW));
      ui.writeln('  Install it from: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot');
      ui.writeln('');
    }

    // Tech stack auto-detection
    ui.writeln('');
    ui.writeln(ui.colored('  Scanning project files for technology stack...', ui.DIM));
    const detectedStack = detectStack(process.cwd());

    // Tech stack questionnaire
    stackSelections = await runStackQuestionnaire(detectedStack);

    // Installation scope
    const scopeChoice = await ui.singleSelect('Where should RapidX be installed?', [
      { label: `Local — applies to current project only (${process.cwd()})`, value: 'local' },
      { label: `Global — applies to all projects (${os.homedir()})`, value: 'global' },
      { label: 'Both — global defaults + local project overrides', value: 'both' },
    ]);
    installScope = scopeChoice;

    // Profile selection
    const availableProfiles = listProfiles();
    const profileOptions = availableProfiles.map(p => ({ label: p, value: p }));
    profileOptions.push({ label: 'custom — Run the client discovery questionnaire', value: 'custom' });
    profileId = await ui.singleSelect('Select a client profile', profileOptions);

    if (profileId === 'custom') {
      profileId = await ui.textInput('Enter a custom profile ID', 'my-client');
      // Use default as base
      profileId = 'default';
    }
  }

  // Map components
  const components = mapComponents(stackSelections);

  // Show install plan and confirm
  const proceed = await showInstallPlan(selectedPlatforms, profileId, stackSelections, components);
  if (!proceed) {
    ui.writeln(ui.colored('  Installation cancelled.', ui.YELLOW));
    process.exit(0);
  }

  // Load profile
  const profile = loadAndValidate(profileId, stackSelections);

  // Determine actual install dir(s)
  const installDirs = installScope === 'both'
    ? [process.cwd(), os.homedir()]
    : [installScope === 'global' ? os.homedir() : process.cwd()];

  // Run installers
  for (const dir of installDirs) {
    ui.writeln(ui.colored(`\n  Installing RapidX to ${dir}...`, ui.CYAN));
    const verification = await runInstallers(selectedPlatforms, dir, profile, stackSelections, components);

    if (!verification.success) {
      ui.writeln(ui.colored('  Some verification checks failed:', ui.YELLOW));
      verification.errors.forEach(e => ui.writeln(`  - ${e}`));
    }
  }

  printQuickStart(selectedPlatforms, profileId, stackSelections, installDirs[0], components);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildPlatformList(flags, platforms) {
  if (flags.all) {
    return Object.entries(platforms)
      .filter(([k, v]) => v.detected && k !== 'jetbrains')
      .map(([k]) => k === 'copilotCli' ? 'copilot-cli' : k);
  }
  const list = [];
  if (flags.claude) list.push('claude');
  if (flags.vscode) list.push('vscode');
  if (flags.cursor) list.push('cursor');
  if (flags['copilot-cli']) list.push('copilot-cli');
  if (flags.codex) list.push('codex');
  if (flags.opencode) list.push('opencode');
  if (flags.gemini) list.push('gemini');
  if (flags.antigravity) list.push('antigravity');
  // Defaults to detected platforms if nothing specified
  if (list.length === 0) {
    if (platforms.claude.detected) list.push('claude');
    if (platforms.vscode.detected) list.push('vscode');
    if (platforms.cursor.detected) list.push('cursor');
  }
  return list;
}

function parseStackFromFlags(flags) {
  const stack = {};
  if (flags.frontend) {
    const [fw, ver] = flags.frontend.split('@');
    stack.frontend = { framework: fw, version: ver || null, ui_library: [], state_management: [] };
  }
  if (flags.backend) {
    const parts = flags.backend.split('@');
    const [langFw, ver] = parts;
    const sep = langFw.includes('-') ? langFw.lastIndexOf('-') : -1;
    const lang = sep >= 0 ? langFw.slice(0, sep) : langFw;
    const fw = sep >= 0 ? langFw.slice(sep + 1) : null;
    stack.backend = { language: lang, framework: fw, language_version: ver || null, api_style: [] };
  }
  if (flags.db) {
    const [db, ver] = flags.db.split('@');
    stack.database = {
      primary: db, primary_version: ver || null,
      orm: flags.orm || null, cache: flags.cache ? [flags.cache] : [],
    };
  }
  if (flags.cloud || flags.cicd) {
    stack.infrastructure = {
      cloud: flags.cloud || null,
      cicd: flags.cicd ? flags.cicd.split(',') : [],
      containers: [],
    };
  }
  if (flags.testing) {
    const frameworks = flags.testing.split(',');
    stack.testing = { frameworks, unit: frameworks, e2e: [] };
  }
  if (flags.mobile) {
    stack.mobile = { framework: flags.mobile };
  }
  return stack;
}

function buildStackFromDetected(detected) {
  const stack = {};
  if (detected.react) stack.frontend = { framework: 'react', version: detected.react.version, ui_library: [], state_management: [] };
  else if (detected.next) stack.frontend = { framework: 'nextjs', version: detected.next.version, ui_library: [], state_management: [] };
  else if (detected.angular) stack.frontend = { framework: 'angular', version: detected.angular.version, ui_library: [], state_management: [] };
  else if (detected.vue) stack.frontend = { framework: 'vue', version: detected.vue.version, ui_library: [], state_management: [] };

  if (detected.express) stack.backend = { language: 'typescript', framework: 'express', language_version: detected.typescript && detected.typescript.version, api_style: ['rest'] };
  else if (detected.nestjs) stack.backend = { language: 'typescript', framework: 'nestjs', language_version: detected.typescript && detected.typescript.version, api_style: ['rest'] };
  else if (detected.django) stack.backend = { language: 'python', framework: 'django', language_version: detected.python && detected.python.version, api_style: ['rest'] };
  else if (detected.fastapi) stack.backend = { language: 'python', framework: 'fastapi', language_version: detected.python && detected.python.version, api_style: ['rest'] };
  else if (detected.springboot) stack.backend = { language: 'java', framework: 'springboot', language_version: detected.java && detected.java.version, api_style: ['rest'] };
  else if (detected.go) stack.backend = { language: 'go', framework: null, language_version: detected.go.version, api_style: ['rest'] };

  if (detected.databases && detected.databases.value) {
    const dbs = detected.databases.value;
    const primary = Object.keys(dbs)[0];
    if (primary) {
      stack.database = { primary, primary_version: dbs[primary], orm: null, cache: [] };
    }
  }
  if (detected.prisma) { stack.database = stack.database || {}; stack.database.orm = 'prisma'; stack.database.orm_version = detected.prisma.version; }
  if (detected.drizzle) { stack.database = stack.database || {}; stack.database.orm = 'drizzle'; }
  if (detected.typeorm) { stack.database = stack.database || {}; stack.database.orm = 'typeorm'; }

  if (detected.cicd) {
    stack.infrastructure = { cloud: null, cicd: [detected.cicd.platform], containers: [] };
  }

  const testFws = [];
  if (detected.jest) testFws.push('jest');
  if (detected.vitest) testFws.push('vitest');
  if (detected.playwright) testFws.push('playwright');
  if (testFws.length) stack.testing = { frameworks: testFws, unit: testFws, e2e: [] };

  return stack;
}

// Run
main().catch(err => {
  process.stderr.write(`[RapidX] Fatal error: ${err.message}\n`);
  if (process.env.DEBUG) process.stderr.write(err.stack + '\n');
  process.exit(1);
});

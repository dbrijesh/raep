'use strict';

const readline = require('readline');

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const CYAN = `${ESC}[36m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const RED = `${ESC}[31m`;
const BLUE = `${ESC}[34m`;
const MAGENTA = `${ESC}[35m`;
const WHITE = `${ESC}[37m`;

const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const CURSOR_UP = n => `${ESC}[${n}A`;
const CLEAR_LINE = `${ESC}[2K${ESC}[G`;
const CLEAR_SCREEN_DOWN = `${ESC}[J`;

function colored(str, ...codes) {
  return `${codes.join('')}${str}${RESET}`;
}

function write(str) {
  process.stdout.write(str);
}

function writeln(str) {
  process.stdout.write((str || '') + '\n');
}

/**
 * Clear N lines above and reset cursor position.
 */
function clearLines(n) {
  for (let i = 0; i < n; i++) {
    write(CURSOR_UP(1) + CLEAR_LINE);
  }
}

// ── Banner ────────────────────────────────────────────────────────────────────

/**
 * Print the RapidX ASCII art welcome banner.
 */
function banner() {
  writeln('');
  writeln(colored('╔══════════════════════════════════════════════════════════════╗', CYAN, BOLD));
  writeln(colored('║                                                              ║', CYAN, BOLD));
  writeln(colored('║   RapidX Agentic Engineering Platform                        ║', CYAN, BOLD));
  writeln(colored('║   Enterprise-grade SDLC orchestration                        ║', CYAN, BOLD));
  writeln(colored('║                                                              ║', CYAN, BOLD));
  writeln(colored('║   Powered by Get Things Done + Everything Claude Code        ║', CYAN, BOLD));
  writeln(colored('║                                                              ║', CYAN, BOLD));
  writeln(colored('╚══════════════════════════════════════════════════════════════╝', CYAN, BOLD));
  writeln('');
}

// ── Section header ────────────────────────────────────────────────────────────

/**
 * Print a section header with box drawing characters.
 * @param {string} title
 */
function section(title) {
  const line = '─'.repeat(60);
  writeln('');
  writeln(colored(`─── ${title} ${line.slice(title.length + 4)}`, YELLOW, BOLD));
}

// ── Summary ───────────────────────────────────────────────────────────────────

/**
 * Print a formatted installation summary.
 * @param {object} data
 */
function summary(data) {
  writeln('');
  writeln(colored('  Installation Summary', BOLD, CYAN));
  writeln(colored('  ' + '─'.repeat(40), DIM));

  if (data.platforms) {
    writeln(`  ${colored('Platforms:', BOLD)}     ${data.platforms.join(', ')}`);
  }
  if (data.profile) {
    writeln(`  ${colored('Profile:', BOLD)}       ${data.profile}`);
  }
  if (data.techStack) {
    writeln(`  ${colored('Tech stack:', BOLD)}    ${data.techStack}`);
  }
  if (data.location) {
    writeln(`  ${colored('Location:', BOLD)}      ${data.location}`);
  }
  if (data.installed) {
    writeln(`  ${colored('Installed:', BOLD)}     ${data.installed}`);
  }
  if (data.skipped) {
    writeln(`  ${colored('Skipped:', BOLD, DIM)}       ${colored(data.skipped, DIM)}`);
  }
  writeln('');
}

// ── Progress bar ──────────────────────────────────────────────────────────────

/**
 * Create a progress tracker.
 * @param {number} total - Total number of steps.
 * @returns {{ advance(label: string): void, complete(): void }}
 */
function progressBar(total) {
  let current = 0;
  const padNum = String(total).length;

  function render(label, done) {
    const stepStr = String(current).padStart(padNum, ' ');
    const check = done ? colored('✓', GREEN, BOLD) : colored('…', YELLOW);
    write(CLEAR_LINE);
    write(`  [${stepStr}/${total}] ${label.padEnd(40)} ${check}`);
    if (done) write('\n');
  }

  return {
    advance(label) {
      current++;
      render(label, false);
    },
    complete() {
      render('', true);
      // Replace the pending line
      write(CURSOR_UP(1));
      write(CLEAR_LINE);
    },
    done(label) {
      write(CLEAR_LINE);
      write(`  [${String(current).padStart(padNum, ' ')}/${total}] ${label.padEnd(40)} ${colored('✓', GREEN, BOLD)}\n`);
    },
  };
}

// ── Confirm ───────────────────────────────────────────────────────────────────

/**
 * Ask a Y/n confirmation question.
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function confirm(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${colored(message, BOLD)} ${colored('[Y/n]', DIM)} `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === '' || a === 'y' || a === 'yes');
    });
  });
}

// ── Text input ────────────────────────────────────────────────────────────────

/**
 * Prompt for text input with an optional default value.
 * @param {string} prompt
 * @param {string} [defaultValue]
 * @returns {Promise<string>}
 */
function textInput(prompt, defaultValue) {
  return new Promise((resolve) => {
    const hint = defaultValue ? ` ${colored(`(${defaultValue})`, DIM)}` : '';
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${colored(prompt, BOLD)}${hint}: `, (answer) => {
      rl.close();
      const val = answer.trim();
      resolve(val || defaultValue || '');
    });
  });
}

// ── Raw mode selector helpers ─────────────────────────────────────────────────

/**
 * Set up raw mode on stdin and return a cleanup function.
 */
function enterRawMode() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
}

function exitRawMode() {
  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch (_) {}
  }
  process.stdin.pause();
  write(SHOW_CURSOR);
}

// ── Single select ─────────────────────────────────────────────────────────────

/**
 * Interactive single-choice select.
 * @param {string} title
 * @param {{ label: string, value: string }[]} options
 * @returns {Promise<string>} Resolves to the selected value.
 */
function singleSelect(title, options) {
  return new Promise((resolve, reject) => {
    let cursor = 0;
    const numLines = options.length + 3;

    write(HIDE_CURSOR);

    function render(firstRender) {
      if (!firstRender) {
        write(CURSOR_UP(numLines) + CLEAR_SCREEN_DOWN);
      }
      writeln('');
      writeln(`  ${colored(title, BOLD, CYAN)}`);
      writeln(colored(`  Use ↑↓ to move, Enter to select`, DIM));
      for (let i = 0; i < options.length; i++) {
        const selected = i === cursor;
        const marker = selected ? colored('●', GREEN, BOLD) : colored('○', DIM);
        const label = selected ? colored(options[i].label, BOLD) : options[i].label;
        writeln(`  ${marker} ${label}`);
      }
    }

    render(true);
    enterRawMode();

    function onData(key) {
      if (key === '\x03') { // Ctrl+C
        exitRawMode();
        process.stdin.removeListener('data', onData);
        writeln('');
        process.exit(0);
      } else if (key === '\x1b[A') { // Up
        cursor = (cursor - 1 + options.length) % options.length;
        render(false);
      } else if (key === '\x1b[B') { // Down
        cursor = (cursor + 1) % options.length;
        render(false);
      } else if (key === '\r' || key === '\n') { // Enter
        exitRawMode();
        process.stdin.removeListener('data', onData);
        // Show selection result
        write(CURSOR_UP(numLines) + CLEAR_SCREEN_DOWN);
        writeln(`  ${colored(title, BOLD, CYAN)}: ${colored(options[cursor].label, GREEN)}`);
        resolve(options[cursor].value);
      }
    }

    process.stdin.on('data', onData);
  });
}

// ── Multi select ──────────────────────────────────────────────────────────────

/**
 * Interactive multi-choice select.
 * @param {string} title
 * @param {{ label: string, value: string, checked?: boolean }[]} options
 * @returns {Promise<string[]>} Resolves to array of selected values.
 */
function multiSelect(title, options) {
  return new Promise((resolve) => {
    let cursor = 0;
    const checked = options.map(o => !!o.checked);
    const numLines = options.length + 4;

    write(HIDE_CURSOR);

    function render(firstRender) {
      if (!firstRender) {
        write(CURSOR_UP(numLines) + CLEAR_SCREEN_DOWN);
      }
      writeln('');
      writeln(`  ${colored(title, BOLD, CYAN)}`);
      writeln(colored('  Use ↑↓ to move, Space to toggle, Enter to confirm', DIM));
      writeln('');
      for (let i = 0; i < options.length; i++) {
        const active = i === cursor;
        const box = checked[i] ? colored('[✓]', GREEN, BOLD) : colored('[ ]', DIM);
        const label = active ? colored(options[i].label, BOLD) : options[i].label;
        const cursor_marker = active ? colored('▶', CYAN) : ' ';
        writeln(`  ${cursor_marker} ${box} ${label}`);
      }
    }

    render(true);
    enterRawMode();

    function onData(key) {
      if (key === '\x03') { // Ctrl+C
        exitRawMode();
        process.stdin.removeListener('data', onData);
        writeln('');
        process.exit(0);
      } else if (key === '\x1b[A') { // Up
        cursor = (cursor - 1 + options.length) % options.length;
        render(false);
      } else if (key === '\x1b[B') { // Down
        cursor = (cursor + 1) % options.length;
        render(false);
      } else if (key === ' ') { // Space — toggle
        checked[cursor] = !checked[cursor];
        render(false);
      } else if (key === '\r' || key === '\n') { // Enter — confirm
        exitRawMode();
        process.stdin.removeListener('data', onData);
        write(CURSOR_UP(numLines) + CLEAR_SCREEN_DOWN);
        const selected = options.filter((_, i) => checked[i]).map(o => o.label);
        writeln(`  ${colored(title, BOLD, CYAN)}: ${colored(selected.join(', ') || 'none', GREEN)}`);
        resolve(options.filter((_, i) => checked[i]).map(o => o.value));
      }
    }

    process.stdin.on('data', onData);
  });
}

module.exports = {
  banner,
  section,
  summary,
  progressBar,
  confirm,
  textInput,
  singleSelect,
  multiSelect,
  // Color helpers for other modules
  colored,
  write,
  writeln,
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW, RED, BLUE, MAGENTA, WHITE,
};

'use strict';

/**
 * inject-agent-skills.js
 *
 * Appends a "## Active skills" section to an agent file during installation.
 * Only skills that were actually installed for the user's tech stack are injected —
 * determined by the `components.skills` Set produced by mapComponents().
 *
 * Platform-specific reference formats:
 *   copilot — `#file:.github/copilot/skills/<skill>.md`
 *   cursor  — `@.cursor/skills/<skill>/SKILL.md`
 *   claude  — `.claude/skills/<skill>/SKILL.md` (informational, no @ syntax in agent files)
 */

const agentSkillMap = require('./agent-skill-map.json');

/**
 * Return the candidate skills for a given agent (from agent-skill-map.json).
 * @param {string} agentName — e.g. "code-reviewer"
 * @returns {string[]}
 */
function candidateSkills(agentName) {
  const entry = agentSkillMap[agentName];
  return entry ? entry.skills : [];
}

/**
 * Filter candidate skills to only those present in the installed skill set.
 * @param {string} agentName
 * @param {Set<string>|string[]} installedSkills — from components.skills
 * @returns {string[]}
 */
function resolveSkills(agentName, installedSkills) {
  const installed = installedSkills instanceof Set ? installedSkills : new Set(installedSkills);
  return candidateSkills(agentName).filter(s => installed.has(s));
}

/**
 * Build the injected skills section for Copilot.
 * Skills are referenced with `#file:` so they load into Copilot Chat context.
 *
 * @param {string[]} skills
 * @param {string} agentName
 * @returns {string}
 */
function copilotSkillsSection(skills, agentName) {
  if (!skills.length) return '';
  const refs = skills.map(s => `- \`#file:.github/copilot/skills/${s}.md\``).join('\n');
  const exampleSkill = skills[0];
  return `
## Active skills

These skills were installed for your tech stack. Attach them alongside this agent in Copilot Chat for deeper context:

${refs}

**Example — attach this agent and its primary skill together:**
\`\`\`
#file:.github/copilot/agents/rapidx-${agentName}.md
#file:.github/copilot/skills/${exampleSkill}.md
[your request here]
\`\`\`
`;
}

/**
 * Build the injected skills section for Cursor.
 * Skills are referenced with @ so Cursor loads them into Composer context.
 *
 * @param {string[]} skills
 * @returns {string}
 */
function cursorSkillsSection(skills) {
  if (!skills.length) return '';
  const refs = skills.map(s => `- @.cursor/skills/${s}/SKILL.md`).join('\n');
  return `
## Active skills

These skills were installed for your tech stack. Reference them with @ in Composer alongside this agent:

${refs}
`;
}

/**
 * Inject the skills section into agent file content.
 * Appends the section at the end of the file (after the last content line).
 *
 * @param {string} content       — original agent file content
 * @param {string} agentName     — e.g. "code-reviewer"
 * @param {Set<string>|string[]} installedSkills — from components.skills
 * @param {'copilot'|'cursor'}   platform
 * @returns {string}             — augmented content
 */
function injectAgentSkills(content, agentName, installedSkills, platform) {
  const skills = resolveSkills(agentName, installedSkills);
  if (!skills.length) return content;

  const section = platform === 'copilot'
    ? copilotSkillsSection(skills, agentName)
    : cursorSkillsSection(skills);

  return content.trimEnd() + '\n' + section;
}

module.exports = { injectAgentSkills, resolveSkills, candidateSkills };

/**
 * Axon 2.0 Command Exports
 *
 * Simplified command structure:
 * - drive: Main entry point (Perception -> Planning -> Execution -> Verification)
 * - init: Initialize project
 * - skills: Manage skills
 * - status: Show project status
 * - doctor: Environment check
 */

export { driveCommand } from './drive';
export { initCommand } from './init';
export { skillsCommand } from './skills';
export { statusCommand } from './status';
export { doctorCommand } from './doctor';

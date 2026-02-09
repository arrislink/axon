/**
 * Interactive prompt utilities
 */

import inquirer from 'inquirer';
import chalk from 'chalk';

export interface ConfirmOptions {
    message: string;
    default?: boolean;
}

export interface SelectOption<T = string> {
    name: string;
    value: T;
    description?: string;
}

export interface InputOptions {
    message: string;
    default?: string;
    validate?: (input: string) => boolean | string;
}

/**
 * Confirm prompt (yes/no)
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message: options.message,
            default: options.default ?? false,
        },
    ]);
    return confirmed;
}

/**
 * Single select prompt
 */
export async function select<T = string>(
    message: string,
    choices: SelectOption<T>[]
): Promise<T> {
    const { selected } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selected',
            message,
            choices: choices.map((c) => ({
                name: c.description ? `${c.name} ${chalk.dim(`- ${c.description}`)}` : c.name,
                value: c.value,
            })),
        },
    ]);
    return selected;
}

/**
 * Multi-select prompt
 */
export async function multiSelect<T = string>(
    message: string,
    choices: SelectOption<T>[]
): Promise<T[]> {
    const { selected } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selected',
            message,
            choices: choices.map((c) => ({
                name: c.description ? `${c.name} ${chalk.dim(`- ${c.description}`)}` : c.name,
                value: c.value,
            })),
        },
    ]);
    return selected;
}

/**
 * Text input prompt
 */
export async function input(options: InputOptions): Promise<string> {
    const { value } = await inquirer.prompt([
        {
            type: 'input',
            name: 'value',
            message: options.message,
            default: options.default,
            validate: options.validate,
        },
    ]);
    return value;
}

/**
 * Password/secret input prompt
 */
export async function password(message: string): Promise<string> {
    const { value } = await inquirer.prompt([
        {
            type: 'password',
            name: 'value',
            message,
            mask: '*',
        },
    ]);
    return value;
}

/**
 * Editor prompt for multi-line input
 */
export async function editor(message: string, defaultValue?: string): Promise<string> {
    const { value } = await inquirer.prompt([
        {
            type: 'editor',
            name: 'value',
            message,
            default: defaultValue,
        },
    ]);
    return value;
}

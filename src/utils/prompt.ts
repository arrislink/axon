/**
 * Interactive prompt utilities (using prompts)
 */

import prompts from 'prompts';

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
    const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: options.message,
        initial: options.default ?? false,
    });
    return response.value;
}

/**
 * Single select prompt
 */
export async function select<T = string>(
    message: string,
    choices: SelectOption<T>[]
): Promise<T> {
    const response = await prompts({
        type: 'select',
        name: 'value',
        message,
        choices: choices.map((c) => ({
            title: c.name,
            value: c.value,
            description: c.description
        })),
    });
    return response.value;
}

/**
 * Multi-select prompt
 */
export async function multiSelect<T = string>(
    message: string,
    choices: SelectOption<T>[]
): Promise<T[]> {
    const response = await prompts({
        type: 'multiselect',
        name: 'value',
        message,
        choices: choices.map((c) => ({
            title: c.name,
            value: c.value,
            description: c.description
        })),
    });
    return response.value || [];
}

/**
 * Text input prompt
 */
export async function input(options: InputOptions): Promise<string> {
    const response = await prompts({
        type: 'text',
        name: 'value',
        message: options.message,
        initial: options.default,
        validate: options.validate,
    });
    return response.value || '';
}

/**
 * Password/secret input prompt
 */
export async function password(message: string): Promise<string> {
    const response = await prompts({
        type: 'password',
        name: 'value',
        message,
    });
    return response.value || '';
}

/**
 * Editor prompt (fallback to text input for now)
 */
export async function editor(message: string, defaultValue?: string): Promise<string> {
    const response = await prompts({
        type: 'text',
        name: 'value',
        message: `${message} (Editor not supported, please enter text)`,
        initial: defaultValue,
    });
    return response.value || '';
}

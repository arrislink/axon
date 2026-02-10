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

export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message: options.message,
    initial: options.default ?? false,
  });
  return response.value;
}

export async function select<T = string>(message: string, choices: SelectOption<T>[]): Promise<T> {
  const response = await prompts({
    type: 'select',
    name: 'value',
    message,
    choices: choices.map((c) => ({
      title: c.name,
      value: c.value,
      description: c.description,
    })),
  });
  return response.value;
}

export async function multiSelect<T = string>(
  message: string,
  choices: SelectOption<T>[],
): Promise<T[]> {
  const response = await prompts({
    type: 'multiselect',
    name: 'value',
    message,
    choices: choices.map((c) => ({
      title: c.name,
      value: c.value,
      description: c.description,
    })),
  });
  return response.value || [];
}

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

export async function password(message: string): Promise<string> {
  const response = await prompts({
    type: 'password',
    name: 'value',
    message,
  });
  return response.value || '';
}

export async function editor(message: string, defaultValue?: string): Promise<string> {
  const editorCmd = process.env['EDITOR'] || process.env['VISUAL'] || 'nano';
  const tmpFile = `${process.cwd()}/.axon-editor-${Date.now()}.md`;

  try {
    if (defaultValue) {
      await Bun.write(tmpFile, defaultValue);
    }

    const proc = Bun.spawnSync([editorCmd, tmpFile]);

    if (proc.success) {
      const edited = await Bun.file(tmpFile).text();
      return edited;
    }
    throw new Error('Editor exited with error');
  } catch (err) {
    console.warn('⚠️  外部编辑器不可用，请直接输入内容');
    const response = await prompts({
      type: 'text',
      name: 'value',
      message,
      initial: defaultValue,
    });
    return response.value || '';
  } finally {
    try {
      const file = Bun.file(tmpFile);
      if (await file.exists()) {
        await Bun.spawn(['rm', tmpFile]).exited;
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

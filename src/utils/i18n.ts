/**
 * Simple localization utility
 */

export type Locale = 'en' | 'zh';

let currentLocale: Locale = 'en';

/**
 * Detect system language
 */
export function detectLocale(): Locale {
    const lang = process.env['LANG'] || process.env['LANGUAGE'] || process.env['LC_ALL'] || 'en';
    if (lang.toLowerCase().includes('zh')) {
        currentLocale = 'zh';
    } else {
        currentLocale = 'en';
    }
    return currentLocale;
}

/**
 * Get current locale
 */
export function getLocale(): Locale {
    return currentLocale;
}

/**
 * Translate a message
 */
export function t(en: string, zh: string): string {
    return currentLocale === 'zh' ? zh : en;
}

// Auto-detect on import
detectLocale();

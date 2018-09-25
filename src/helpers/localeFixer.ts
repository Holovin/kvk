import { log } from './logger';

// TODO: check letters: k?, m, n
const onlyCyrillic = 'БГДЁЖЗИЙЛПУФЦЧШЩЪЫЬЭЮЯ' + 'бвгдёжзийлмнптфцчшщъыьэюя';
const onlyLatin = 'DFGIJLNQRSTUVWYZ' + 'bdfghijlmnqrstuvwz';

const locales: any = {
    cyrillic: onlyCyrillic,
    latin: onlyLatin,
};

const replaceRules: any = {
    cyrillic: 'АВСЕНКМОРХасекорх',
    latin:    'ABCEHKMOPXacekopx',
};

export function localeFixer(str: string): string {
    const words = str.split(' ');

    const afterWords = words.map(word => {
        const locale = detectLocale(word);
        const invertedLocale = getInvertedLocale(locale);

        if (!locale) {
            return word;
        }

        return word
            .split('')
            .map(letter => {
                const position = replaceRules[invertedLocale].indexOf(letter);

                return position === -1
                    ? letter
                    : replaceRules[locale][position]
            }).join('');
    }).join(' ');

    if (str !== afterWords) {
        log.warn(`[LOCALE_FIX] Fix data from [${str}] to [${afterWords}]`);
    }

    return afterWords;
}

function detectLocale(word: string): string {
    for (let k = 0; k < word.length; k++) {
        for (let i = 0, keys = Object.keys(locales); i < keys.length; i++) {
            const currentLocale = locales[keys[i]];

            if (currentLocale.includes(word[k])) {
                return keys[i];
            }
        }
    }

    return null;
}

function getInvertedLocale(locale: string): string {
    return locale === 'cyrillic' ? 'latin' : 'cyrillic';
}

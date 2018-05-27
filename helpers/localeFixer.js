// const cyrillic = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' +
//                  'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
//
// const latin    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
//                  'abcdefghijklmnopqrstuvwxyz';
// TODO: check letters: k?, m, n

const log = require('./logger');

const onlyCyrillic = 'БГДЁЖЗИЙЛПУФЦЧШЩЪЫЬЭЮЯ' + 'бвгдёжзийлмнптфцчшщъыьэюя';
const onlyLatin = 'DFGIJLNQRSTUVWYZ' + 'bdfghijlmnqrstuvwz';

const locales = {
    cyrillic: onlyCyrillic,
    latin: onlyLatin,
};

const replaceRules = {
    cyrillic: 'АВСЕНКМОРХасекорх',
    latin:    'ABCEHKMOPXacekopx',
};

function localeFixer(str) {
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

    if (words !== afterWords) {
        log.warn(`[LOCALE_FIX] Fix data from [${words}] to [${afterWords}]`);
    }

    return afterWords;
}

function detectLocale(word) {
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

function getInvertedLocale(locale) {
    return locale === 'cyrillic' ? 'latin' : 'cyrillic';
}

module.exports = localeFixer;

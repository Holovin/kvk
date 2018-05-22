// const cyrillic = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' +
//                  'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
//
// const latin    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
//                  'abcdefghijklmnopqrstuvwxyz';
// TODO: check letters: k?, m, n

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

    return words.map(word => {
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

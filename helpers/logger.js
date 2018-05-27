const winston = require('winston');

const loggerFormatter = winston.format.printf(info => {
    return `${info.level.toUpperCase()} [${info.timestamp}] ${info.message}`;
});

const log = winston.createLogger({
    level: 'debug',
    transports: [
        new winston.transports.File({ filename: 'info.log', level: 'info' }),
        new winston.transports.File({ filename: 'debug.log' }),
        new winston.transports.Console({ level: 'info' })
    ],
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
        loggerFormatter,
    ),
});

module.exports = log;
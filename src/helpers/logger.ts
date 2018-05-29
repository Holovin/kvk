import { createLogger, format, transports } from 'winston';

const loggerFormatter = format.printf(info => {
    return `${info.level.toUpperCase().padEnd(8)} [${info.timestamp}] ${info.message}`;
});

export const log = createLogger({
    level: 'debug',
    transports: [
        new transports.File({ filename: 'info.log', level: 'info' }),
        new transports.File({ filename: 'debug.log' }),
        new transports.Console({ level: 'debug' }),
    ],
    format: format.combine(
        format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
        loggerFormatter,
    ),
});

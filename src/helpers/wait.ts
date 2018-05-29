import {log} from "./logger";

export { log } from './logger';

export function wait(timeout: number): Promise<void> {
    log.debug(`[WAIT] Start with ${timeout}`);

    return new Promise((resolve) => {
        setTimeout(() => {
            log.debug(`[WAIT] End with ${timeout}`);
            return resolve();
        }, timeout);
    });
}
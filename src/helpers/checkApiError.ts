import { stringify } from 'circular-json';
import { get, isError } from 'lodash';
import { log } from './logger';

const errCodes: any = {
    1: 'History very outdated, try get new',
    2: 'Key old, get new',
    3: 'User error, get new key + ts',
    4: 'API version error',
};

export function checkApiError(response: any, error: any | Error = null): boolean {
    if (error) {
        if (isError(error)) {
            log.error(`[API] ${error.name}: [${error.message}]\n${error.stack}`);
        } else {
            log.error(`[API] Error: ${stringify(error)}`);
        }

        return true;
    }

    if (!response) {
        log.error('[API] Empty response');
        return true;
    }

    // if queue
    if (Array.isArray(response)) {
        return !!response.reduce((result, item) => result + Number(checkApiError(item)), 0);
    }

    // api errors
    if (get(response, 'error.error_code')) {
        log.error(`[API] ${stringify(response.error)}`);
        return true;
    }

    // long poll errors
    if (get(response, 'failed')) {
        log.error(`[API] ${errCodes[response.failed]}`);
        return true;
    }

    log.debug(`[API] No errors (${stringify(response)})`);
    return false;
}

import { log } from './logger';
import { get } from 'lodash';

const errCodes: any = {
    1: 'History very outdated, try get new',
    2: 'Key old, get new',
    3: 'User error, get new key + ts',
    4: 'API version error',
};

export function checkApiError(response: any): boolean {
    // if queue
    if (Array.isArray(response)) {
        let errors = 0;

        response.forEach(item => {
            errors += checkApiError(item) ? 1 : 0;
        });

        return errors > 0;
    }

    // api errors
    if (get(response, 'error.error_code')) {
        log.error(`[API] ${JSON.stringify(response.error)}`);
        return true;
    }

    // long poll errors
    if (get(response, 'failed')) {
        log.error(`[API] ${errCodes[response.failed]}`);
        return true;
    }

    log.debug(`[API] No errors (${JSON.stringify(response)})`);
    return false;
}

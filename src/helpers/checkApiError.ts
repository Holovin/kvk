import { stringify } from 'circular-json';
import { get } from 'lodash';
import { log } from './logger';

const errCodes: any = {
    1: 'History very outdated, try get new',
    2: 'Key old, get new',
    3: 'User error, get new key + ts',
    4: 'API version error',
};

export function checkApiError(response: any, error: any = null): boolean {
    if (error) {
        log.error(`[API] Error field not empty: ${stringify(error)}`);
        return true;
    }

    if (!response) {
        log.error('[API] Empty response');
        return true;
    }

    // if queue
    if (Array.isArray(response)) {
        let errors = 0;

        response.forEach(item => {
            errors += checkApiError(item, null) ? 1 : 0;
        });

        return errors > 0;
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

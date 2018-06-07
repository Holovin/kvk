import * as cp from 'child_process';
import opn from 'opn';
import { log } from './logger';

export function opnUrl(url: string): Promise<cp.ChildProcess> {
    log.info(`[OPN] {url}`);
    return opn(encodeURI(url), {wait: false});
}

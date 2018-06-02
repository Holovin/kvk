import * as cp from 'child_process';
import opn from 'opn';

export function opnUrl(url: string): Promise<cp.ChildProcess> {
    return opn(encodeURI(url), {wait: false});
}

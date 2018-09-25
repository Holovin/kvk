import moment from 'moment-timezone';

export function processTimestamp(timestampInput: any, addFrom = false): string {
    const timestamp = timestampInput * 1000;
    const timestampStr = `${moment(timestamp).format('DD/MM/YYYY HH:mm:ss')}`;

    if (addFrom) {
        return `${timestampStr} (${moment(timestamp).fromNow()})`;
    }

    return timestampStr;
}

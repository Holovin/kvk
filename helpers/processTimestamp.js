const moment = require('moment-timezone');

function processTimestamp(timestampInput, addFrom = false) {
    const timestamp = timestampInput * 1000;
    const timestampStr = `${moment(timestamp).format('DD/MM/YYYY HH:mm:ss')}`;

    if (addFrom) {
        return `${timestampStr} (через ${moment(timestamp).fromNow()})`;
    }

    return timestampStr;
}

module.exports = processTimestamp;

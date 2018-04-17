const dotenv = require('dotenv').config();
const req = require('request-promise');
const moment = require('moment-timezone');
const get = require('lodash/get');

moment.tz.setDefault('Europe/Minsk');
moment.locale('ru');

// --- //

async function getStart() {
    try {
        const answer = await req.post({
            url: process.env.URL_API_START,
            json: true,
        }).form({
            build_ver: process.env.API_BUILD_VER,
            need_leaderboard: process.env.API_NEED_LEADERBOARD,
            func_v: process.env.API_FUNC_V,
            access_token: process.env.API_ACCESS_TOKEN,
            v: process.env.API_V,
            lang: process.env.API_LANG,
            https: process.env.API_HTTPS,
        });

        return {
            gameId: get(answer, 'response.game_info.game.game_id', ''),
            gameStatus: get(answer, 'response.game_info.game.status', ''),
            startTime: processTimestamp(get(answer, 'response.game_info.game.start_time', ''), true),
            server_time: processTimestamp(get(answer, 'response.server_time', '')),
            prize: get(answer, 'response.game_info.game.prize', ''),
            videoOwner: get(answer, 'response.game.video_owner_id', ''),
            videoId: get(answer, 'response.game.video_id', ''),
        };
    } catch (e) {
        console.warn(e);
        return '';
    }
}

function processTimestamp(timestampInput, addFrom = false) {
    const timestamp = timestampInput * 1000;
    const timestampStr = `${moment(timestamp).format('DD/MM/YYYY HH:mm:ss')}`;

    if (addFrom) {
        return `${timestampStr} (через ${moment(timestamp).fromNow()})`;
    }

    return timestampStr;
}

// INIT
(async () => {
    await gameWaiter();
})();

//
async function gameWaiter() {
    const status = await getStart();
    console.warn(`WAIT: `, status);

    // started!
    if (status.gameStatus === 'started') {
        const lp_url = await getLongPollUrl(status.videoOwner, status.videoId);

    } else if (status.gameStatus === 'planned') {
        // do next
        setTimeout(async () => {
            await gameWaiter();
        }, 5000);

    } else {
        // something wrong?
        console.warn(`Unknown game status >>> ${status.gameStatus}`);
    }
}

async function getLongPollUrl(videoOwner, videoId) {
    const answer = await req.post({
        url: process.env.URL_API_GET_LP,
        json: true,
    }).form({
        video_id: videoId,
        owner_id: videoOwner,
        access_token: process.env.API_ACCESS_TOKEN,
        v: process.env.API_V,
        lang: process.env.API_LANG,
        https: process.env.API_HTTPS,
    });

    return answer.response.url;
}

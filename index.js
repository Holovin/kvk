const dotenv = require('dotenv').config();

// request
const request = require('request-promise-native');
const req = request.defaults({
    headers: {
        'User-Agent': process.env.ua,
    },
});
const to = require('await-to-js').to;
const url = require('url');

// moment
const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Minsk');
moment.locale('ru');

// lodash
const get = require('lodash/get');
const trimEnd = require('lodash/trimEnd');

// other
const opn = require('opn');

// helpers
const checkApiError = require('./helpers/checkApiError');
const runAfter = require('./helpers/runAfter');
const processTimestamp = require('./helpers/processTimestamp');
// --- //

async function getStart() {
    const [err, response] = await to(req.post({
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

    }));

    if (err || checkApiError(response)) {
        console.warn(err);
        return;
    }

    return {
        gameId: get(response, 'response.game_info.game.game_id', ''),
        gameStatus: get(response, 'response.game_info.game.status', ''),
        startTime: processTimestamp(get(response, 'response.game_info.game.start_time', ''), true),
        server_time: processTimestamp(get(response, 'response.server_time', '')),
        prize: get(response, 'response.game_info.game.prize', ''),
        videoOwner: get(response, 'response.game_info.game.video_owner_id', ''),
        videoId: get(response, 'response.game_info.game.video_id', ''),
    };
}

// Init
(async () => {
    await gameWaiter();
})();

// Core function
async function gameWaiter() {
    const status = await getStart();
    console.warn(`WAIT: `, status);

    // started!
    if (status.gameStatus === 'started') {
        const lp_url_raw = await getLongPollUrl(status.videoOwner, status.videoId);
        const url_params = url.parse(lp_url_raw, true);

        // [?param1=value1] part, need for increment ts_id
        const lp_params = url_params.query;

        // [https://....?] part
        const lp_url = `${url_params.protocol}//${url_params.host}${url_params.pathname}`;

        if (lp_url) {
            await getNextEvent(lp_url, lp_params);
        }

    } else if (status.gameStatus === 'planned') {
        // do next
        await runAfter(gameWaiter, [], 5000);

    } else {
        // something wrong?
        console.warn(`Unknown game status >>> ${status.gameStatus}`);
    }
}

async function getLongPollUrl(videoOwner, videoId) {
    const [err, response] = await to(req.post({
        url: process.env.URL_API_GET_LP,
        json: true,

    }).form({
        video_id: videoId,
        owner_id: videoOwner,
        access_token: process.env.API_ACCESS_TOKEN,
        v: process.env.API_V,
        lang: process.env.API_LANG,
        https: process.env.API_HTTPS,
    }));

    if (err || checkApiError(response)) {
        console.warn(err);
        return;
    }

    console.log(response);

    return response.response.url;
}

async function getNextEvent(lp_url, lp_params) {
    const [err, response] = await to(req.get({
        url: lp_url,
        qs: lp_params,
        json: true,
    }));

    if (err || checkApiError(response)) {
        console.warn(err);

        runAfter(getNextEvent, [lp_url, lp_params], 300);
        return false;
    }

    // update TS
    lp_params.ts = response.ts;

    // seems ok?
    if (response.events.length > 0) {
        // wtf is <!>0?
        response.events.forEach(rawEvent => {
            const event = JSON.parse(trimEnd(rawEvent, '<!>0'));

            // take question ->
            if (event.type === 'sq_question' || event.type === 'sq_question_answers_right') {
                const question = get(event, 'question.text', '');
                const number = get(event, 'question.number', '');
                const answers = [];

                if (event.type === 'sq_question') {
                    get(event, 'question.answers', []).forEach(answer => {
                        answers.push(answer.text);
                    });

                } else {
                    get(event, 'question.answers', []).forEach(answer => {
                        if (get(event, 'question.right_answer_id') === answer.id) {
                            answers.push(`>>> ${answer.text} (${answer.users_answered})`);
                        } else {
                            answers.push(`${answer.text} (${answer.users_answered})`);
                        }
                    });
                }

                // TODO: rework after tests
                console.log(`${number}. ${question}\n > ${answers.join('\n > ')}`);
                opn(`'https://www.google.com/search?q=${question}`);
            }

            // ITS TIME TO STOP, OKAY?
            if (event.type === 'sq_ed_game') {
                console.warn('!!! Receive stop event !!!');
                console.warn(event);

                return true;
            }
        });
    }

    // get next events
    await runAfter(getNextEvent, [lp_url, lp_params], 300);
}

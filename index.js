const config = require('nconf')
    .env()
    .file({file: './config/dev.json'});

// request
const request = require('request-promise-native');
const req = request.defaults(config.get('http:headers'));
const to = require('await-to-js').to;
const url = require('url');

// moment
const moment = require('moment-timezone');
moment.tz.setDefault(config.get('system.timezone'));
moment.locale(config.get('system.locale'));

// lodash
const get = require('lodash/get');
const trimEnd = require('lodash/trimEnd');

// other
const opn = require('opn');

// helpers
const checkApiError = require('./helpers/checkApiError');
const runAfter = require('./helpers/runAfter');
const processTimestamp = require('./helpers/processTimestamp');
const localeFixer = require('./helpers/localeFixer');

// --- //
const api = config.get('api');

async function getStart() {
    const [err, response] = await to(req.post({
        url: url.resolve(api.url.host, api.url.start),
        json: true,

    }).form({
        build_ver:        api.params.build_ver,
        need_leaderboard: api.params.need_leaderboard,
        func_v:           api.params.func_v,
        access_token:     api.params.access_token,
        v:                api.params.v,
        lang:             api.params.lang,
        https:            api.params.https,
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
        url: url.resolve(api.url.host, api.url.get_lp),
        json: true,

    }).form({
        video_id:     videoId,
        owner_id:     videoOwner,
        access_token: api.params.access_token,
        v:            api.params.v,
        lang:         api.params.lang,
        https:        api.params.https,
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

    console.log('Event: ', Date());

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
                const question = localeFixer(get(event, 'question.text', ''));
                const number = get(event, 'question.number', '');
                const answers = [];

                if (event.type === 'sq_question') {
                    get(event, 'question.answers', []).forEach(answer => {
                        const answerText = localeFixer(answer.text);

                        answers.push(answerText);
                        opn(`https://www.google.com/search?q=${answerText}`);
                    });

                    runAfter(() => opn(`https://www.google.com/search?q=${question}`), [], 500);

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

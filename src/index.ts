import request from 'request-promise-native';

import moment from 'moment-timezone';
import nconf from 'nconf';
import opn from 'opn';

import { resolve, parse } from 'url';
import { get, trimEnd } from 'lodash';

import { to } from 'await-to-js';

import { log, checkApiError, localeFixer, processTimestamp, runAfter } from './helpers';

// configs
const config = nconf.env().file({file: './config/dev.json'});
const req = request.defaults(config.get('http:headers'));

moment.tz.setDefault(config.get('system.timezone'));
moment.locale(config.get('system.locale'));
//

class Client {
    private api = config.get('api');

    public async run() {
        await this.gameWaiter()
    }

    private async gameWaiter() {
        const status = await this.getStart();
        log.info(`Game status: ${JSON.stringify(status)}`);

        // started!
        if (!status) {
            log.error(`EMPTY game status (seems wrong token)`);
            return;
        }

        if (status.gameStatus === 'started') {
            const lp_url_raw = await this.getLongPollUrl(status.videoOwner, status.videoId);
            const url_params = parse(lp_url_raw, true);

            // [?param1=value1] part, need for increment ts_id
            const lp_params = url_params.query;

            // [https://....?] part
            const lp_url = `${url_params.protocol}//${url_params.host}${url_params.pathname}`;
            log.info(`Game stated, lp link >>> ${lp_url}`);

            if (lp_url) {
                await this.getNextEvent(lp_url, lp_params);
            }

        } else if (status.gameStatus === 'planned') {
            // do next
            log.info(`Wait...`);
            await runAfter(this.gameWaiter.bind(this), [], 5000);

        } else {
            // something wrong?
            log.error(`Unknown game status >>> ${JSON.stringify(status)}`);
        }
    }

    private async getStart() {
        log.debug('Try get start link...');

        const request = req.post({
            url: resolve(this.api.url.host, this.api.url.start),
            json: true,
            form: {
                build_ver:          this.api.params.build_ver,
                need_leaderboard:   this.api.params.need_leaderboard,
                func_v:             this.api.params.func_v,
                access_token:       this.api.params.access_token,
                v:                  this.api.params.v,
                lang:               this.api.params.lang,
                https:              this.api.params.https,
            }
        }).promise();

        const [err, response] = await to(request);

        if (err || checkApiError(response)) {
            log.error(`Cant get start link!`);
            log.debug(`Err: ${JSON.stringify(err)}`);
            return;
        }

        log.debug('Get start link >>> ok');

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

    private async getLongPollUrl(videoOwner: string, videoId: string): Promise<string> {
        log.debug(`Try get lp url...`);

        const request = req.post({
            url: resolve(this.api.url.host, this.api.url.get_lp),
            json: true,
            form: {
                video_id:     videoId,
                owner_id:     videoOwner,
                access_token: this.api.params.access_token,
                v:            this.api.params.v,
                lang:         this.api.params.lang,
                https:        this.api.params.https,
            },
        }).promise();

        const [err, response] = await to(request);

        if (err || checkApiError(response)) {
            log.error(`Cant get lp url!`);
            log.debug(`Err: ${JSON.stringify(err)}`);
            return;
        }

        log.debug(`LP answer: ${JSON.stringify(response)}`);
        return (response as any).response.url;
    }

    async getNextEvent(lp_url: string, lp_params: any): Promise<boolean> {
        const request = req.get({
            url: lp_url,
            qs: lp_params,
            json: true,
        }).promise();

        const [err, response] = await to(request);

        log.debug(`Event: ${response}`);

        if (err || checkApiError(response)) {
            log.error(`Cant get event!`);
            log.debug(`Err: ${JSON.stringify(err)}`);

            await runAfter(this.getNextEvent.bind(this), [lp_url, lp_params], 300);
            return false;
        }

        // update TS
        lp_params.ts = response.ts;

        // seems ok?
        if (response.events.length > 0) {
            // wtf is <!>0?
            response.events.forEach((rawEvent: any) => {
                const event = JSON.parse(trimEnd(rawEvent, '<!>0'));

                // take question ->
                if (event.type === 'sq_question' || event.type === 'sq_question_answers_right') {
                    const question = localeFixer(get(event, 'question.text', ''));
                    const number = get(event, 'question.number', '');
                    const answers: any = [];

                    if (event.type === 'sq_question') {
                        get(event, 'question.answers', []).forEach((answer: any) => {
                            const answerText = localeFixer(answer.text);

                            answers.push(answerText);

                            // fix ULTRA HARD QUESTIONS
                            if (answerText.includes('/')) {
                                log.warn('Try split answers!');

                                const splitAnswers = answerText.split('/');

                                splitAnswers.forEach((splitAnswer: string) => {
                                    log.debug(`Open SPLIT answers in browser: [${splitAnswer}]`);
                                    opn(`https://www.google.com/search?q=${splitAnswer}`);
                                });

                            } else {
                                log.debug(`Open answers in browser: [${answerText}]`);
                                opn(`https://www.google.com/search?q=${answerText}`);
                            }
                        });

                        runAfter(() => {
                            log.debug(`Open question in browsers: [${question}]`);
                            opn(`https://www.google.com/search?q=${question}`);
                            opn(`https://yandex.com/search/?text=${question}`);
                        }, [], 100);

                    } else {
                        get(event, 'question.answers', []).forEach((answer: any) => {
                            if (get(event, 'question.right_answer_id') === answer.id) {
                                answers.push(`[correct] ${answer.text} (${answer.users_answered})`);
                            } else {
                                answers.push(`${answer.text} (${answer.users_answered})`);
                            }
                        });
                    }

                    log.info(`${number}. ${question}\n > ${answers.join('\n > ')}`);
                }

                // ITS TIME TO STOP, OKAY?
                if (event.type === 'sq_ed_game') {
                    log.info(`-- STOP -- [${event}]`);
                    process.exit(0);
                    return true;
                }
            });
        }

        // get next events
        await runAfter(this.getNextEvent.bind(this), [lp_url, lp_params], 300);
    }
}

(async () => {
    const client = new Client();
    await client.run();
})();

// TODO:
// * remove bind
// * create interfaces for 'any' replace
// * rework lp logic

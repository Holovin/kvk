import 'source-map-support/register';

import request from 'request-promise-native';
import moment from 'moment-timezone';
import nconf from 'nconf';
import opn from 'opn';

import { resolve, parse } from 'url';
import { get, trimEnd } from 'lodash';
import { to } from 'await-to-js';
import { ParsedUrlQuery } from 'querystring';
import { stringify } from 'circular-json';

import { log, checkApiError, localeFixer, processTimestamp, wait } from './helpers';
import { ConfigApiInterface, GameInitialDataInterface } from './interfaces';
import { EventType, GameStatus } from './enums';

// configs
const config = nconf.env().file({file: './config/dev.json'});
const req = request.defaults(config.get('http:headers'));

moment.tz.setDefault(config.get('system.timezone'));
moment.locale(config.get('system.locale'));

//

class Client {
    private api: ConfigApiInterface = config.get('api');
    private lpUrl: string;
    private lpParams: ParsedUrlQuery;

    public async run(): Promise<boolean> {
        let needStartListenEvents: boolean;

        // TODO: error handling
        // wait game
        do {
            [needStartListenEvents] = await Promise.all([
                this.getGameData(),
                wait(5000)
            ]);

        } while (!needStartListenEvents);

        let needNext: boolean;

        // get events
        do {
            [needNext] = await Promise.all([
                this.getNextEvent(),
                wait(100)
            ]);

        } while (needNext);

        return false;
    }

    public async getGameData(): Promise<boolean> {
        const [error, game] = await to<GameInitialDataInterface>(this.getGameInitialData());

        if (checkApiError(game, error)) {
            throw Error('GetGameData');
        }

        log.info(`Game #${game.gameId}, status: ${game.gameStatus}, time: ${game.startTime}`);

        switch (game.gameStatus) {
            case GameStatus.STARTED: {
                const [error, lpUrlRaw] = await to(this.getLongPollUrl(game.videoOwner, game.videoId));
                const urlParams = parse(lpUrlRaw, true);

                if (error || !lpUrlRaw) {
                    log.error
                }

                // [?param1=value1] part, need for increment ts_id
                this.lpParams = urlParams.query;

                // [https://....?] part
                this.lpUrl = `${urlParams.protocol}//${urlParams.host}${urlParams.pathname}`;

                return true;
            }

            case GameStatus.PLANNED: {
                return false;
            }

            default: {
                throw Error(`GetGameData - unknown state: ${game.gameStatus}`);
            }
        }
    }

    private async getGameInitialData(): Promise<GameInitialDataInterface> {
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

        if (checkApiError(response, err)) {
            throw Error('GetStart error');
        }

        return {
            gameId: get(response, 'response.game_info.game.game_id', ''),
            gameStatus: get(response, 'response.game_info.game.status', ''),
            startTime: processTimestamp(get(response, 'response.game_info.game.start_time', ''), true),
            serverTime: processTimestamp(get(response, 'response.server_time', '')),
            prize: get(response, 'response.game_info.game.prize', ''),
            videoOwner: get(response, 'response.game_info.game.video_owner_id', ''),
            videoId: get(response, 'response.game_info.game.video_id', ''),
        };
    }

    private async getLongPollUrl(videoOwner: string, videoId: string): Promise<string> {
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

        if (checkApiError(response, err)) {
            throw Error('GetLongPollUrl error');
        }

        const lp_url = get(response, 'response.url', null);

        if (!lp_url) {
            log.error(`Cant get lp url! Error: ${stringify(err)}`);
            throw Error('getLongPollUrl error');
        }

        log.debug(`LP answer: ${JSON.stringify(response)}`);
        return lp_url;
    }

    async getNextEvent(): Promise<boolean> {
        const request = req.get({
            url: this.lpUrl,
            qs: this.lpParams,
            json: true,
        }).promise();

        const [error, response] = await to(request);

        if (checkApiError(response, error) || !response.ts) {
            return true;
        }

        // update TS
        this.lpParams.ts = response.ts;

        // wtf is <!>0?
        response.events.forEach(async (rawEvent: any) => {
            const event = JSON.parse(trimEnd(rawEvent, '<!>0'));

            // take question ->
            if (event.type === EventType.QUESTION_START || event.type === EventType.QUESTION_END) {
                const question = localeFixer(get(event, 'question.text', ''));
                const number = get(event, 'question.number', '');
                const answers: string[] = [];

                if (event.type === EventType.QUESTION_START) {
                    get(event, 'question.answers', []).forEach(async (answer: any) => {
                        const answerText = localeFixer(answer.text);

                        answers.push(answerText);

                        // fix ULTRA HARD QUESTIONS
                        if (answerText.includes('/')) {
                            log.warn('Try split answers!');

                            const splitAnswers = answerText.split('/');

                            splitAnswers.forEach( async (splitAnswer: string) => {
                                log.debug(`Open SPLIT answers in browser: [${splitAnswer}]`);
                                await Promise.all([
                                    opn(`https://www.google.com/search?q=${splitAnswer}`),
                                    wait(300),
                                ]);
                            });

                        } else {
                            log.debug(`Open answers in browser: [${answerText}]`);
                            await Promise.all([
                                opn(`https://www.google.com/search?q=${answerText}`),
                                wait(300),
                            ]);
                        }
                    });

                    log.debug(`Open question in browsers: [${question}]`);

                    await Promise.all([
                        opn(`https://www.google.com/search?q=${question}`),
                        opn(`https://yandex.com/search/?text=${question}`),
                    ]);

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
            if (event.type === EventType.GAME_END) {
                log.info(`-- STOP -- `);
                return false;
            }
        });

        return true;
    }
}

(async () => {
    const client = new Client();
    await client.run();
})();

// TODO:
// * create interfaces for 'any' replace

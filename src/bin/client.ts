import 'source-map-support/register';
import prettyError from 'pretty-error';

import request from 'request-promise-native';

import * as moment from 'moment-timezone';
import 'moment/locale/ru';

import nconf from 'nconf';

import { resolve, parse } from 'url';
import { get, trimEnd } from 'lodash';
import { to } from 'await-to-js';
import { ParsedUrlQuery } from 'querystring';
import { stringify } from 'circular-json';

import { ConfigApiInterface, GameInitialDataInterface } from '../interfaces';
import { EventType, GameStatus } from '../enums';
import { CommentInterface } from '../interfaces/events/comment.interface';
import { FriendAnswerInterface } from '../interfaces/events/friendAnswer.interface';
import { GameEndInterface } from '../interfaces/events/gameEnd.interface';
import { QuestionEndInterface } from '../interfaces/events/questionEnd.interface';
import { QuestionStartInterface } from '../interfaces/events/questionStart.interface';
import { GetStartInterface } from '../interfaces/events/getStart.interface';
import { checkApiError } from '../helpers/checkApiError';
import { log } from '../helpers/logger';
import { wait } from '../helpers/wait';
import { opnUrl as opn } from '../helpers/opn';
import { processTimestamp } from '../helpers/processTimestamp';
import { localeFixer } from '../helpers/localeFixer';

// configs
const config = nconf.env().file({file: './config/dev.json'});
const req = request.defaults(config.get('http:headers'));

moment.tz.setDefault(config.get('system.timezone'));
prettyError.start();
// end configs

class Client {
    private api: ConfigApiInterface = config.get('api');
    private lpUrl: string;
    private lpParams: ParsedUrlQuery;

    public async run(): Promise<boolean> {
        let lastError = null;
        let needStartListenEvents: boolean;

        // TODO: error handling
        // wait game
        do {
            [lastError, needStartListenEvents] = await to(this.getGameData());

            if (checkApiError(true, lastError)) {
                log.warn(`[!!!] Something wrong 1? ${lastError}`);
            }

            await wait(5000);

        } while (!needStartListenEvents);

        let needNext: boolean;

        // get events
        do {
            lastError = null;

            [lastError, needNext] = await to(this.getNextEvent());

            if (checkApiError(true, lastError)) {
                log.warn(`[!!!] Something wrong 2? ${stringify(lastError)}`);
            }

            await wait(100);

        } while (needNext);

        return false;
    }

    public async getGameData(): Promise<boolean> {
        const [error, game] = await to<GameInitialDataInterface>(this.getGameInitialData());

        if (checkApiError(game, error)) {
            throw error;
        }

        log.info(`Game #${game.gameId}, status: ${game.gameStatus}, time: ${game.startTime}`);

        switch (game.gameStatus) {
            case GameStatus.STARTED: {
                const [lpError, lpUrlRaw] = await to(this.getLongPollUrl(game.videoOwner, game.videoId));
                const urlParams = parse(lpUrlRaw, true);

                if (checkApiError(lpUrlRaw, lpError)) {
                    throw Error('GetGameData');
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
        const getStartRequest = req.post({
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
            },
        }).promise();

        const [error, response]: [any, GetStartInterface] = await to(getStartRequest);

        if (checkApiError(response, error)) {
            throw error;
        }

        const {response: {game_info: {game}, server_time}} = response;

        return {
            gameId:     game.game_id.toString(),
            gameStatus: game.status,
            startTime:  game.start_time ? processTimestamp(game.start_time, true) : '',
            serverTime: processTimestamp(server_time),
            prize:      game.prize.toString(),
            videoOwner: game.video_owner_id ? game.video_owner_id.toString() : '',
            videoId:    game.video_id ? game.video_id.toString() : '',
        };
    }

    private async getLongPollUrl(videoOwner: string, videoId: string): Promise<string> {
        const lpRequest = req.post({
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

        const [error, response] = await to(lpRequest);

        if (checkApiError(response, error)) {
            throw error;
        }

        const lpUrl = get(response, 'response.url', null);

        if (!lpUrl) {
            log.error(`Cant get lp url, but no error?`);
            throw Error('getLongPollUrl error');
        }

        log.debug(`LP answer: ${JSON.stringify(response)}`);
        return lpUrl;
    }

    private async processQuestionStart(event: QuestionStartInterface): Promise<boolean> {
        const questionText = localeFixer(event.question.text);
        const number = event.question.number;
        const answers: string[] = [];

        event.question.answers.forEach(async answer => {
            const answerText = localeFixer(answer.text);
            answers.push(answerText);

            log.debug(`Open answers in browser: [${answerText}]`);
            opn(`https://www.google.com/search?q=${answerText}`);
        });

        log.debug(`Open question in browsers: [${event}]`);

        await wait(400);

        // TODO
        const flagName = 'x-answers';
        const sep = '|||';

        // opn(`https://yandex.com/search/?text=${questionText}`);
        opn(`https://www.google.com/search?q=${questionText} ${answers.join(' ')}&${flagName}=${answers.join(sep)}`);
        opn(`https://www.google.com/search?q=${questionText}&${flagName}=${answers.join(sep)}`);

        log.info(`${number}. ${questionText}\n > ${answers.join('\n > ')}`);
        return true;
    }

    private async processQuestionEnd(event: QuestionEndInterface): Promise<boolean> {
        const questionText = localeFixer(event.question.text);
        const number = event.question.number;
        const answers: string[] = [];

        event.question.answers.forEach(async answer => {
            const answerText = localeFixer(answer.text);

            const stringStatus = event.question.right_answer_id === answer.id
                ? '\u{2705}'
                : '\u{274C}';

            answers.push(`${stringStatus} ${answerText} (${answer.users_answered})`);
        });

        log.info(`${number}. ${questionText}\n > ${answers.join('\n > ')}`);
        return true;
    }

    private async getNextEvent(): Promise<boolean> {
        const nextRequest = req.get({
            url: this.lpUrl,
            qs: this.lpParams,
            json: true,
        }).promise();

        const [error, response] = await to(nextRequest);

        if (checkApiError(response, error) || !response.ts) {
            return true;
        }

        // update TS
        this.lpParams.ts = response.ts;

        // wtf is <!>0?
        response.events.forEach(async (rawEvent: string) => {
            const event: CommentInterface
                | FriendAnswerInterface
                | GameEndInterface
                | QuestionStartInterface
                | QuestionEndInterface
                = JSON.parse(trimEnd(rawEvent, '<!>0'));

            switch (event.type) {
                case EventType.COMMENT: {
                    // TODO
                    return true;
                }

                case EventType.QUESTION_START:
                    return await this.processQuestionStart(event as QuestionStartInterface);

                case EventType.QUESTION_END:
                    return await this.processQuestionEnd(event as QuestionEndInterface);

                case EventType.FRIEND_ANSWER:
                    return true;

                case EventType.GAME_END:
                    // TODO
                    return false;

                case EventType.ADS_PROMO:
                    // TODO
                    return true;

                case EventType.WINNERS:
                    // TODO:
                    return true;

                default:
                    log.warn(`Unknown event type! ${stringify(event)}`);
                    return true;
            }
        });

        return true;
    }
}

(async () => {
    const client = new Client();
    await client.run();
})();

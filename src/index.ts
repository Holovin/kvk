import 'source-map-support/register';
import prettyError from 'pretty-error';

import request from 'request-promise-native';
import moment from 'moment-timezone';
import nconf from 'nconf';

import { resolve, parse } from 'url';
import { get, trimEnd } from 'lodash';
import { to } from 'await-to-js';
import { ParsedUrlQuery } from 'querystring';
import { stringify } from 'circular-json';

import { log, checkApiError, localeFixer, processTimestamp, wait, opn } from './helpers';
import { ConfigApiInterface, GameInitialDataInterface } from './interfaces';
import { EventType, GameStatus } from './enums';
import { CommentInterface } from './interfaces/events/comment.interface';
import { FriendAnswerInterface } from './interfaces/events/friendAnswer.interface';
import { GameEndInterface } from './interfaces/events/gameEnd.interface';
import { QuestionEndInterface } from './interfaces/events/questionEnd.interface';
import { QuestionStartInterface } from './interfaces/events/questionStart.interface';

// configs
const config = nconf.env().file({file: './config/dev.json'});
const req = request.defaults(config.get('http:headers'));

// TODO: not work
moment.tz.setDefault(config.get('system.timezone'));
moment.locale(config.get('system.locale'));

prettyError.start();

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
                wait(5000),
            ]);

        } while (!needStartListenEvents);

        let needNext: boolean;

        // get events
        do {
            [needNext] = await Promise.all([
                this.getNextEvent(),
                wait(100),
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

        const [err, response] = await to(getStartRequest);

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

        const [err, response] = await to(lpRequest);

        if (checkApiError(response, err)) {
            throw Error('GetLongPollUrl error');
        }

        const lpUrl = get(response, 'response.url', null);

        if (!lpUrl) {
            log.error(`Cant get lp url! Error: ${stringify(err)}`);
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
        opn(`https://www.google.com/search?q=${event}`);
        opn(`https://yandex.com/search/?text=${event}`);

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

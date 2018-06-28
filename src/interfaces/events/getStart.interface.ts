import { GameStatus } from '../../enums';
import { LeaderboardUserInterface } from '../helpers/leaderboardUser.interface';

export interface GetStartInterface {
    response: {
        game_info: {
            game: {
                game_id: number,
                status: GameStatus,
                video_owner_id?: number,  // status: started
                video_id?: number,        // status: started
                no_questions?: boolean,   // status: started
                is_closed?: boolean,      // status: started
                start_time?: number,      // status: planned
                prize: number,
                question_number?: number, // status: started
            },
            user: {
                extra_lives: number,
                balance: number,
                coins: number,
                invites_left: number,
            },
            in_game: number,
            lives_used: number,
            rating_percent: number,
            video_url: string,
            custom_variables: {
                android_exo_fraction: number,
                android_longpoll_timeout: number,
                ios_queue_timeout: number,
                ios_queue_timeout_new: number,
            },
            is_coin_promo_enabled: boolean,
            stats_disabled: false,
            is_log_enabled: false,
            last_answer?: {                // status: started
                question_id: number,
                answer_id: number,
            },
        },
        me: {
            id: number,
            first_name: string,
            last_name: string,
            photo_200: string,
        }
        train_mode: boolean,
        server_time: number,
        leaderboard: {
            leaderboard: LeaderboardUserInterface[],
            all_time_leaderboard: LeaderboardUserInterface[],
        },
        week_leaderboard: LeaderboardUserInterface[],
    };
}

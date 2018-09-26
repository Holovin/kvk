import { GetStartInterface } from 'qoosb_shared';
import { GameStatus } from 'qoosb_shared';

const leaderboard = [
    {
        name: 'Name',
        photo_url: '[not used]',
        value: 1951,
    },
];

export const getStartPlannedMock: GetStartInterface = {
    response: {
        game_info: {
            game: {
                game_id: 0,
                status: GameStatus.PLANNED,
                start_time: 1527526800,
                prize: 50000,
            },
            user: {
                extra_lives: 1,
                balance: 1,
                coins: 1,
                invites_left: 10000,
            },
            in_game: 1,
            lives_used: 0,
            rating_percent: 99,
            video_url: '[not used]',
            custom_variables: {
                android_exo_fraction: 0.75,
                android_longpoll_timeout: 6000,
                ios_queue_timeout: 25,
                ios_queue_timeout_new: 25,
            },
            is_coin_promo_enabled: true,
            stats_disabled: false,
            is_log_enabled: false,
        },
        me: {
            id: 1,
            first_name: 'Name',
            last_name: 'Name',
            photo_200: '[not used]',
        },
        train_mode: true,
        server_time: 1527523070,
        leaderboard: {
            leaderboard,
            all_time_leaderboard: [
                {
                    name: 'Name',
                    photo_url: '[not used]',
                    value: 14000,
                },
            ],
        },
        week_leaderboard: leaderboard,
    },
};

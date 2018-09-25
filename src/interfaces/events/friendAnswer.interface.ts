import { EventType } from '../../enums';

export interface FriendAnswerInterface {
    type: EventType.FRIEND_ANSWER;
    game_id: number;
    user_id: number;
    answer_id: 0;
    photo_url: string;
    is_live_enabled: boolean;
}

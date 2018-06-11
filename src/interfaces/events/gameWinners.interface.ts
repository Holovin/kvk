import { EventType } from '../../enums';
import { WinnerUserInterface } from '../helpers/winnerUser.interface';

export interface GameWinnersInterface {
    type: EventType.WINNERS;
    owner_id: number;
    video_id: number;
    users: WinnerUserInterface[];
    prize: number;
    winners_num: number;
    version: number;
}

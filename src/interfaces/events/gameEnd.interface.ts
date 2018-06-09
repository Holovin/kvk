import { EventType } from '../../enums';
import { EventCommonInterface } from '../helpers/eventCommon.interface';

export interface GameEndInterface extends EventCommonInterface {
    type: EventType.GAME_END;
}

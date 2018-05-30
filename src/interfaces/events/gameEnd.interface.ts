import { EventType } from '../../enums';
import { EventCommonDtoInterface } from './helpers/eventCommon.dto.interface';

export interface GameEndInterface extends EventCommonDtoInterface {
    type: EventType.GAME_END;
}

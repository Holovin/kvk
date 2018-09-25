import { EventType } from '../../enums';

export interface EventCommonInterface {
    type: EventType;
    owner_id: number;
    video_id: number;
    version: number;
}

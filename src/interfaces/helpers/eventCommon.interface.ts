import { EventType } from 'qoosb_shared';

export interface EventCommonInterface {
    type: EventType;
    owner_id: number;
    video_id: number;
    version: number;
}

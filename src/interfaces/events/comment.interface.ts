import { EventCommonInterface } from './helpers/eventCommon.interface';
import { UserInterface } from './helpers/user.interface';

export interface CommentInterface extends EventCommonInterface {
    comment: {
        id: number;
        from_id: number;
        date: number;
        text: string;
    };
    user: UserInterface;
}

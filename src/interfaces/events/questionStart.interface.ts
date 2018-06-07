import { EventCommonInterface } from './helpers/eventCommon.interface';

export interface QuestionStartInterface extends EventCommonInterface {
    question: {
        id: number;
        text: string;
        answers: [
            {
                id: number;
                text: string;
            }
            ];
        time: null;
        number: number;
    };
}

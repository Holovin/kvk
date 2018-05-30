import { EventCommonDtoInterface } from './helpers/eventCommon.dto.interface';

export interface QuestionStartInterface extends EventCommonDtoInterface {
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

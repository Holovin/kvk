import { EventType } from '../../enums';

export interface GameBannerInterface {
    type: EventType.ADS_PROMO;
    color: string;
    text_color: string;
    icon: string;
    title: string;
    text: string;
    action_type: string;
    action_data: {
        ios: string;
        android: string;
    };
    time: number;
    coin_reward: number;
    version: number;
}

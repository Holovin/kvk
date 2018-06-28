import { ErrorInterface } from '../error.interface';

export interface VideoGetInterface extends ErrorInterface {
    response: {
        count: number,
        items:
            [
                {
                    id: number,
                    owner_id: number,
                    title: string,
                    duration: number,
                    description: string,
                    date: number,
                    comments: number,
                    views: number,
                    width: number,
                    height: number,
                    photo_130: string,
                    photo_320: string,
                    photo_800: string,
                    live_status?: string,    // LIVE only
                    live: number,            // LIVE only
                    spectators: number,      // LIVE only
                    first_frame_800: string, // LIVE only
                    first_frame_320: string, // LIVE only
                    first_frame_160: string, // LIVE only
                    first_frame_130: string, // LIVE only
                    adding_date?: number,    // VID only
                    files: {
                        external: string,    // LIVE only
                        live: string,        // LIVE only
                        hls: string,         // LIVE only
                        mp4_240: string,     // VID only
                        mp4_360: string,     // VID only
                        mp4_480: string,     // VID only
                        mp4_720: string,     // VID only
                        mp4_1080: string,    // VID only
                    },
                    player: string,
                    can_add: number,
                    can_comment: number,
                    can_repost: number,
                    likes: {
                        user_likes: number,
                        count: number,
                    },
                    reposts: {
                        count: number,
                        user_reposted: number,
                    },
                    repeat: number,
                }
            ],
        profiles:
            [
                {
                    id: number,
                    first_name: string,
                    last_name: string,
                }
            ],
        groups:
            [
                {
                    id: number,
                    name: string,
                    screen_name: string,
                    is_closed: number,
                    type: string,
                    photo_50: string,
                    photo_100: string,
                    photo_200: string,
                }
            ],
    };
}

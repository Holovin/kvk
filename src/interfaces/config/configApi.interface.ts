import { ConfigApiUrlInterface } from './configApiUrl.interface';
import { ConfigApiParamsInterface } from './configApiParams.interface';

export interface ConfigApiInterface {
    url: ConfigApiUrlInterface;
    params: ConfigApiParamsInterface;
}

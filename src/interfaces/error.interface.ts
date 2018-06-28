export interface ErrorInterface {
    error?: {
        error_code: number,
        error_msg: string,
        request_params:
            [
                {
                    key: string,
                    value: string,
                }
            ],
    };
}

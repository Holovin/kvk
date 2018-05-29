export const runAfter = async <T> (method: Function, params: any[], delay: number): Promise<T> => {
    await setTimeout(async (): Promise<void> => {}, delay);
    return await method(...params);
};

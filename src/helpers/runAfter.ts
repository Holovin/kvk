export async function runAfter(method: Function, params: any[], delay: number) {
    setTimeout(async (): Promise<void> => {
        await method(...params);
    }, delay);
}

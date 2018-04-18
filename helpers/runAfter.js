async function runAfter(method, params, delay) {
    setTimeout(async () => {
        await method(...params);
    }, delay);
}

module.exports = runAfter;

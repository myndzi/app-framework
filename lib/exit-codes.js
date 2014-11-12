var exitCodes = {
    RELOAD: -1,
    OK: 0,
    SHUTDOWN_NOT_AVAILABLE: 1,
    SHUTDOWN_TIMEOUT_EXCEEDED: 2,
    SERVER_ERROR: 3,
    UNKNOWN: 99
};

for (var key in exitCodes) {
    module.exports[key] = exitCodes[key];
    module.exports[exitCodes[key]] = key;
}

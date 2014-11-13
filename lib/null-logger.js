'use strict';

function noop() { }

module.exports = function (app) {
    app.log = {
        trace: noop,
        silly: noop,
        info: noop,
        warn: noop,
        error: noop
    };
};

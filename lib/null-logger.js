'use strict';

function noop() { }

module.exports = function (app) {
    app.log = {
        trace: noop,
        debug: noop,
        info: noop,
        warn: noop,
        error: noop,
        fatal: noop,
        close: function (cb) { if (cb) { cb(); } }
    };
};

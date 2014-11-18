'use strict';

module.exports = function (app) {
    function log(type, error) {
        if (error) {
            return console.error.bind(console, type.toUpperCase() + ':');
        } else {
            return console.log.bind(console, type.toUpperCase() + ':');
        }
    }
    app.log = {
        trace: log('trace'),
        silly: log('silly'),
        info: log('info'),
        warn: log('warn', true),
        error: log('error', true),
        close: function () { }
    };
};

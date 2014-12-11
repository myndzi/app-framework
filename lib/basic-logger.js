'use strict';

var util = require('util');

module.exports = function (app) {
    var order = {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        fatal: 5
    };
    
    var level = 'warn';
    if (app.config && app.config.get) { level = app.config.get('log.level'); }

    function log(type, error) {
        if (order[type] < order[level]) {
            return function () { };
        }
        
        return function (args) {
            var msg;
            if (Array.isArray(args)) {
                msg = util.format.apply(util, args);
            } else {
                msg = util.format.apply(util, arguments);
            }
            msg = type.toUpperCase() + ': ' + msg;
            console[error ? 'error' : 'log'](msg);
        };
    }
    app.log = {
        trace: log('trace'),
        debug: log('debug'),
        info: log('info'),
        warn: log('warn', true),
        error: log('error', true),
        fatal: log('fatal', true),
        close: function (cb) { if (cb) { cb(); } }
    };
};

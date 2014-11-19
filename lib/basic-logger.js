'use strict';

var util = require('util');

module.exports = function (app) {
    var order = {
        trace: 0,
        silly: 1,
        info: 2,
        warn: 3,
        error: 4
    };
    
    var level = 'warn';
    if (app.config && app.config.get) { level = app.config.get('log.level'); }

    function log(type, error) {
        if (order[type] < level[type]) {
            return function () { };
        }
        
        return function () {
            var msg = util.format.apply(util, arguments);
            msg = type.toUpperCase() + ': ' + msg;
            console[error ? 'error' : 'log'](msg);
        };
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

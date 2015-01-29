'use strict';

module.exports = function (app) {
    var tv = require('traceview');
    var c = app.config.get('traceview');
    
    if (!c.enabled) { return; }
    
    tv.traceMode = c.traceMode;
};
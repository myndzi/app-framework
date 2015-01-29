'use strict';

module.exports = function (app) {
    
    var tv = require('traceview');
    var config = app.config.get();
    
    var tvConfig = config.traceview;
    
    if (!tvConfig || !tvConfig.enabled) { return; }
    
    tv.traceMode = tvConfig.traceMode;
};
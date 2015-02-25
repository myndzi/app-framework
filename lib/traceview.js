'use strict';

module.exports = function (app) {
    // matches check in index.js so that we don't accidentally load traceview
    // if it's not wanted
    if (!process.env.ENABLE_TRACEVIEW) { return; }
    
    var tv = require('traceview');
    var config = app.config.get();
    
    var tvConfig = config.traceview;
    
    if (!tvConfig || !tvConfig.enabled) { return; }
    
    tv.traceMode = tvConfig.traceMode;
};

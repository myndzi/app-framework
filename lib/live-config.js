'use strict';

module.exports = function (app) {
    // buffer any synchronous / early calls to app.configure
    var _configs = [ ];
    app.configure = function () {
        var i = arguments.length, args = new Array(i);
        while (i--) { args[i] = arguments[i]; }
        
        _configs.push(args);
    };
    app.once('loaded', function () {
        if (_configs.length) {
            _configs.forEach(function (args) {
                app.config.load.apply(app.config, args);
            });
            _configs = null;
            app.config.validate();
            app.emit('configure', app.config.get());
        }
        app.configure = function (opts) {
            app.config.load.apply(app.config, arguments);
            app.config.validate();
            app.emit('configure', app.config.get(), opts);
        };
    });
};

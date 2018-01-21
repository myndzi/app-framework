'use strict';

module.exports = function (app) {
    var signalsBound = false,
        shuttingDown = false;

    function _SHUTDOWN(signal) {
        if (shuttingDown) {
            app.log.warn('Got ' + signal + ' while shutting down, forcing dirty exit...');
            process.exit(99);
        }
        if (signal === 'SIGINT') {
            app.log.info('Terminating, press ^C again to force exit...');
        }
        app.shutdown(signal);
    }
    function _SIGINT() { _SHUTDOWN('SIGINT'); }
    function _SIGTERM() { _SHUTDOWN('SIGTERM'); }

    function bindSignals() {
        if (signalsBound) { return; }
        process.on('SIGINT', _SIGINT);
        process.on('SIGTERM', _SIGTERM);
        signalsBound = true;
    }

    function unbindSignals() {
        if (!signalsBound) { return; }
        process.removeListener('SIGINT', _SIGINT);
        process.removeListener('SIGTERM', _SIGTERM);
        signalsBound = false;
    }

    function reconfigure() {
        // bind signals for exiting explicitly, helps when running under Docker
        if (app.config.get('app.bindSignals')) {
            bindSignals();
        } else {
            unbindSignals();
        }
    }

    app.on('configure', reconfigure);

    app.on('shutdown', function () {
        shuttingDown = true;
    });

    app.on('after shutdown', function () {
        unbindSignals();
    });

    reconfigure();

    return app;
};

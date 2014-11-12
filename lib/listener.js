'use strict';

var Promise = require('bluebird');

module.exports = function (app) {
    var EXIT_CODES = app.lib('constants/exit-codes');
    
    app.listen = function () {
        return new Promise(function (resolve, reject) {
            var timeout = app.config.get('shutdown').timeout,
                cfg = app.config.get('app');
            
            var deferred = defer();
            
            var server = app.listen(cfg.port, cfg.ip);
            Promise.promisifyAll(server, { suffix: '$' });
            
            app.emit('server', server);
            
            server.on('listening', function () {
                var a = server.address();
                app.emit('listening', a.address, a.port, app.env);
                resolve();
            });
            
            app.once('shutdown', _shutdown);
            function _shutdown(await) {
                app.log.info('Closing HTTP server');
                await(server.close$());
            }
            
            server.once('close', _onclose);
            function _onclose() {
                app.log.info('HTTP server closed');
                _cleanup();
            }
            
            server.once('error', _onerror);
            function _onerror(err) {
                app.log.error(err);
                _cleanup();
                reject(err);
                app.shutdown(EXIT_CODES.SERVER_ERROR, err);
            }
            
            function _cleanup() {
                app.removeListener('shutdown', _shutdown);
                server.removeListener('close', _onclose);
                server.removeListener('error', _onerror);
            }
        });
    };
};

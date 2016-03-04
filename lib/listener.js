'use strict';

var Promise = require('bluebird');

module.exports = function (app) {
    var EXIT_CODES = require('./exit-codes');
    var _listen = app.listen;
    
    app.listen = function () {
        return new Promise(function (resolve, reject) {
            var cfg = app.config.get('app');
            
            var server = _listen.call(app, cfg.port, cfg.ip);
            
            app.emit('server', server);

            var _cleanup = function () { };
            
            function _onlistening() {
                var a = server.address();
                app.emit('listening', a.address, a.port, app.env);
                resolve();
            }
            server.once('listening', _onlistening);
            
            function _shutdown(await) {
                _cleanup();
                app.log.info('Closing HTTP server');
                await(server.close.bind(server));
            }
            app.once('shutdown', _shutdown);
            
            function _onclose() {
                app.log.info('HTTP server closed');
                _cleanup();
            }
            server.once('close', _onclose);
            
            function _onerror(err) {
                app.log.error(err);
                _cleanup();
                reject(err);
                app.shutdown(EXIT_CODES.SERVER_ERROR, err);
            }
            server.once('error', _onerror);
            
            _cleanup = function () {
                app.removeListener('shutdown', _shutdown);
                server.removeListener('listening', _onlistening);
                server.removeListener('close', _onclose);
                server.removeListener('error', _onerror);
            };
        });
    };
};

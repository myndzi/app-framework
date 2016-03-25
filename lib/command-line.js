'use strict';

var cUtils = require('./convict-utils');

module.exports = function (app, config) {
    app.config = cUtils.extendConvict(app.config, {
        app: {
            commands: {
                doc: 'Whether to allow processing of commands from the command line, e.g. self-test, dump-config',
                default: false,
                env: 'ALLOW_COMMANDS',
                arg: 'allow-commands'
            }
        }
    });

    var allowCommands = app.config.get('app.commands');

    if (!allowCommands) { return; }

    var optimist = null;
    try {
        // try to require convict's version of optimist, if it exists
        optimist = require('convict/node_modules/optimist');
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
    }

    try {
        // otherwise just try to load it at all
        optimist = require('optimist');
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
    }

    // if we didn't find it, give up
    if (optimist === null) { return; }

    var _ = optimist.argv._;
    if (_.indexOf('self-test') > -1) {
        app.on('listening', function () {
            app.shutdown(0, 'self-test', 10000);
        });
    } else if (_.indexOf('dump-config') > -1) {
        // don't output anything to the screen except json

        // override the top-level config object (used by index.js to set up pre-config logging)
        config.log = config.log || { };
        config.log.level = 'none';

        // override config (post-config logging)
        app.config.set('log.level', 'none');

        app.on('loaded', function () {
            console.log(JSON.stringify(app.config.get(), null, 2));
        });
        app.on('listening', function () {
            app.shutdown(0, 'dump-config', 10000);
        });
    }
};

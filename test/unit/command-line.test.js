'use strict';

require('should-eventually');

var EE = require('events').EventEmitter;
var commandLine = require('../../lib/command-line');
var convict = require('convict');

describe('command-line', function () {
    var _require = module.constructor.prototype.require,
        _env = process.env,
        didRequire = false,
        optimist = null;

    function getMock(obj, opts) {
        var ee = new EE();
        ee.config = convict({ });

        Object.keys(obj || { }).forEach(function (key) {
            ee[key] = obj[key];
        });

        commandLine(ee, opts || { });
        return ee;
    }

    function mockOptimist(obj) {
        optimist = obj;
    };
    function mockEnv(obj) {
        Object.keys(obj || { }).forEach(function (key) {
            process.env[key] = obj[key];
        });
    };

    beforeEach(function () {
        didRequire = false;
        optimist = null;

        module.constructor.prototype.require = function (m) {
            if (/(^|\/)optimist$/.test(m)) {
                didRequire = true;
                return optimist;
            } else {
                return _require.apply(this, arguments);
            }
        };
    });

    afterEach(function () {
        module.constructor.prototype.require = _require;
        process.env = _env;
        optimist = null;
    });

    it('should do nothing if commands are not enabled', function () {
        getMock();
        didRequire.should.equal(false);
    });

    it('should do nothing if optimist is not found', function () {
        var app = getMock({
            on: function () {
                throw new Error('no events should be bound');
            }
        }, {
            app: { commands: true }
        });

        didRequire.should.equal(true);
    });

    it('should do nothing if optimist is found but no command is specified', function () {
        mockOptimist({ argv: { _: [ ] } });
        var app = getMock({
            on: function () {
                throw new Error('no events should be bound');
            }
        }, {
            app: { commands: true }
        });
    });

    it('should call shutdown after load if self-test is given as an argument', function (done) {
        mockOptimist({ argv: { _: [ 'self-test' ] } });
        var app = getMock({ shutdown: done }, { app: { commands: true } });

        app.emit('listening');
    });

    it('should disable logging and console.log the config, then shutdown if dump-config is given as an argument', function (done) {
        var _console_log = console.log, app;
        var cfg = { app: { commands: true } };

        console.log = function (str) {
            str.should.equal(JSON.stringify(cfg, null, 2));
            console.log = _console_log;
            app.emit('listening');
        };

        after(function () {
            console.log = _console_log;
        });

        mockOptimist({ argv: { _: [ 'dump-config' ] } });
        app = getMock({ shutdown: done }, cfg);

        cfg.log.level.should.equal('none');
        app.config.get('log.level').should.equal('none');

        app.emit('loaded');
    });
});

'use strict';

require('should-eventually');

describe('basic-logger', function () {
    var _consoleLog = console.log,
        _consoleError = console.error,
        mockApp = { };
        
    var calls = 0,
        errors = 0;
    
    var quiet = false;
        
    var lastargs = [ ];
        
    before(function () {
        console.log = function () {
            calls++;
            lastargs = Array.prototype.slice.call(arguments, 0);
            if (quiet) { return; }
            return _consoleLog.apply(console, arguments);
        };
        console.error = function () {
            errors++;
            lastargs = Array.prototype.slice.call(arguments, 0);
            if (quiet) { return; }
            return _consoleError.apply(console, arguments);
        };
        
        require('../lib/basic-logger')(mockApp);
    });

    it('should attach a \'log\' object with log functions', function () {
        mockApp.should.have.property('log');
        ['trace', 'silly', 'info', 'warn', 'error']
        .forEach(function (type) { mockApp.log[type].should.be.a.Function });
    });
    it('should call console.log for trace, silly, and info and console.error for warn, error', function () {
        calls = errors = 0;
        quiet = true;
        ['trace', 'silly', 'info', 'warn', 'error']
        .forEach(function (type) { mockApp.log[type]('foo'); });
        quiet = false;
        calls.should.equal(3);
        errors.should.equal(2);
    });
    it('should pass supplied arguments', function () {
        quiet = true;
        ['trace', 'silly', 'info', 'warn', 'error']
        .forEach(function (type) {
            mockApp.log[type]('foo');
            lastargs[1].should.equal('foo');
        });
        quiet = false;
    });
    it('should prefix arguments with the log type', function () {
        quiet = true;
        ['trace', 'silly', 'info', 'warn', 'error']
        .forEach(function (type) {
            mockApp.log[type]('foo');
            lastargs[0].should.match(new RegExp('^'+type, 'i'));
        });
        quiet = false;
    });
    
    after(function () {
        console.log = _consoleLog;
        console.error = _consoleError;
    });
});

'use strict';

require('should-eventually');
var EventEmitter = require('events').EventEmitter;

var convict = require('convict');

describe('live-config', function () {
    var mockApp = new EventEmitter();
    mockApp.config = convict({
        test2: {
            two: {
                format: 'integer',
                default: 0
            }
        }
    }).load({
        app: { env: 'testing', root: __dirname }
    });
    
    before(function () {
        require('../../lib/live-config')(mockApp);
    });
    
    it('should add a \'configure\' method to app', function () {
        mockApp.should.have.property('configure').which.is.a.Function;
    });
    
    it('should buffer configure requests until after app has been loaded', function () {
        function _throw() { throw new Error('fail'); }
        mockApp.on('configure', _throw);
        mockApp.configure({ test2: { one: 1 } });
        mockApp.removeListener('configure', _throw);
    });
    
    it('should emit \'configure\' after applying stored configs, after app has loaded', function (done) {
        mockApp.once('configure', done.bind(null, null));
        require('../../lib/configure')(mockApp);
        mockApp.emit('loaded');
    });
    
    it('should correctly apply buffered configure calls', function () {
        // there was a bug where config.load() was being called with an array rather than applying
        // the array to the function call; this would create a key '0', which is what we check
        // for here in the regression test
        mockApp.config.has('0').should.equal(false);
    });
    
    it('should emit \'configure\' immediately when app is already loaded', function (done) {
        mockApp.once('configure', done.bind(null, null));
        mockApp.configure({});
    });
    
    it('should throw if an invalid configuration is applied', function () {
        (function () {
            mockApp.configure({ test2: { two: 'two' } });
        }).should.throw(/must be an integer/);
    });
    
    it('should reconfigure the app', function () {
        mockApp.configure({ test2: { two: 3 } });
        mockApp.config.get('test2.two').should.equal(3);
    });
});

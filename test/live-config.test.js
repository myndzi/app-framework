'use strict';

require('should-eventually');
var EventEmitter = require('events').EventEmitter;

describe('live-config', function () {
    var mockApp = new EventEmitter();
    mockApp.root = __dirname;
    
    var mockSchema = {
        app: {
            name: {
                default: 'test'
            }
        },
        env: {
            default: 'foo'
        },
        test2: {
            one: { default: 0 },
            two: { default: 0 }
        }
    };
    
    before(function () {
        require('../lib/live-config')(mockApp);
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
        require('../lib/configure')(mockApp, mockSchema);
        mockApp.emit('loaded');
    });
    
    it('should emit \'configure\' immediately when app is already loaded', function (done) {
        mockApp.once('configure', done.bind(null, null));
        mockApp.configure({});
    });
    
    it('should throw if an invalid configuration is applied', function () {
        (function () {
            mockApp.configure({ test2: { two: 'two' } });
        }).should.throw(/should be of type Number/);
    });
});

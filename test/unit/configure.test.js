'use strict';

require('should-eventually');

describe('configure', function () {
    var mockApp = {
        root: __dirname
    };
    
    var mod = require('../../lib/configure');
    
    before(function () {
        mod(mockApp);
    });
    
    it('should return a promise', function () {
        return mod(mockApp);
    });
    
    it('should attach a \'config\' object that is an instance of node-convict', function () {
        mockApp.should.have.property('config').with.property('validate');
    });
    
    it('should automatically assign config.env to \'test\' when running in mocha', function () {
        mockApp.config.get('env').should.equal('testing');
    });
    
    it('should return a rejected promise if config doesn\'t validate', function () {
        return mod(mockApp, {
            app: { name: { default: 'test' } },
            test: { default: 'succeed', format: ['succeed'] }
        }).should.eventually.throw(/must be one of the possible values/);
    });
});

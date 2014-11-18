'use strict';

var Promise = require('bluebird');

require('should-eventually');

describe('null-logger', function () {
    var mockApp = { };
    
    before(function () {
        require('../../lib/null-logger')(mockApp);
    });
    
    it('should attach a \'log\' object with log functions', function () {
        mockApp.should.have.property('log');
        ['trace', 'silly', 'info', 'warn', 'error']
        .forEach(function (type) { mockApp.log[type].should.be.a.Function });
    });
    
    it('should not write to process.stdout or process.stderr', function () {
        var writeOut = process.stdout.write,
            writeErr = process.stderr.write;
        
        return new Promise(function (resolve, reject) {
            process.stdout.write = reject;
            process.stderr.write = reject;
            
            ['trace', 'silly', 'info', 'warn', 'error']
            .forEach(function (type) { mockApp.log[type]('fail'); });
            
            process.stdout.removeListener('data', reject);
            process.stderr.removeListener('data', reject);
            
            resolve();
        }).catch(function (msg) {
            throw new Error(msg);
        }).finally(function () {
            process.stdout.write = writeOut;
            process.stderr.write = writeErr;
        });
    });
});

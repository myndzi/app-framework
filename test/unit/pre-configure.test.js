'use strict';

require('should-eventually');

var convict = require('convict');
var PATH = require('path');

describe('configure', function () {
    var mockApp = { };
    
    var mod = require('../../lib/pre-config');
    
    before(function () { return mod(mockApp); });
    
    it('should attach a \'config\' object that is an instance of node-convict', function () {
        mockApp.should.have.property('config').with.property('validate');
    });
    
    it('should assign default values for app.env, app.root, app.name, and log.level', function () {
        ['app.env', 'app.root', 'app.name', 'log.level']
        .forEach(function (key) {
            mockApp.config.has(key).should.equal(true);
        });
    });
    
    describe('app.env', function () {
        it('should default to development environment normally', function () {
            var _describe = global.describe;
            global.describe = 0;
            mod(mockApp);
            global.describe = _describe;
            
            mockApp.config.get('app.env').should.equal('development');
        });
        
        it('should default to testing environment if \'describe\' is defined in the global space', function () {
            mod(mockApp);
            mockApp.config.get('app.env').should.equal('testing');
        });
        
        it('should use the value of NODE_ENV in the environment if available', function () {
            var hasProperty = process.env.hasOwnProperty('NODE_ENV');
            var NODE_ENV = process.env.NODE_ENV;
            
            process.env.NODE_ENV = 'quux';
            
            mod(mockApp);
            mockApp.config.get('app.env').should.equal('quux');
            
            if (hasProperty) { process.env.NODE_ENV = NODE_ENV; }
            else { delete process.env.NODE_ENV; }
        });
        
        it('should use the specified value when supplied as \'env\' or \'app.env\'', function () {
            mod(mockApp, { env: 'foo' });
            mockApp.config.get('app.env').should.equal('foo');
            
            mod(mockApp, { app: { env: 'bar' } });
            mockApp.config.get('app.env').should.equal('bar');
            
            mod(mockApp, { env: 'foo', app: { env: 'bar' } });
            mockApp.config.get('app.env').should.equal('bar');
        });
    });
    
    describe('app.root', function () {
        it('should default to require.main\'s package.json folder', function () {
            mod(mockApp);
            var appRoot = mockApp.config.get('app.root');
            
            appRoot.should.equal(require.main.filename.slice(0, appRoot.length));
        });
        
        it('should throw if it can\'t locate a package.json for require.main', function () {
            var mainFN = require.main.filename;
            require.main.filename = '/';
            (function () {
                mod(mockApp);
            }).should.throw(/No suitable root directory was found/);
            require.main.filename = mainFN;
        });
        
        it('should use the specified value when supplied as \'root\' or \'app.root\'', function () {
            mod(mockApp, { root: __dirname + '/loadfiles-test-1' });
            mockApp.config.get('app.root').should.equal(__dirname + '/loadfiles-test-1');
            
            mod(mockApp, { app: { root: __dirname + '/loadfiles-test-2' } });
            mockApp.config.get('app.root').should.equal(__dirname + '/loadfiles-test-2');
            
            mod(mockApp, { root: __dirname + '/loadfiles-test-1', app: { root: __dirname + '/loadfiles-test-2' } });
            mockApp.config.get('app.root').should.equal(__dirname + '/loadfiles-test-2');
        });
        
        it('should throw if the app root doesn\'t exist or isn\'t a directory', function () {
            (function () {
                mod(mockApp, { root: 'foo' });
            }).should.throw(/App root doesn't exist/);
            
            (function () {
                mod(mockApp, { root: __filename });
            }).should.throw(/App root isn't a directory/);
        });
    });
    
    describe('app.name', function () {
        it('should default to the basename of app.root', function () {
            mod(mockApp, { root: __dirname });
            mockApp.config.get('app.name').should.equal(PATH.basename(__dirname));
        });
        
        it('should use the specified value when supplied as \'name\' or \'app.name\'', function () {
            mod(mockApp, { name: 'foo' });
            mockApp.config.get('app.name').should.equal('foo');
            
            mod(mockApp, { app: { name: 'bar' } });
            mockApp.config.get('app.name').should.equal('bar');
            
            mod(mockApp, { name: 'foo', app: { name: 'bar' } });
            mockApp.config.get('app.name').should.equal('bar');
        });
    });
    
    describe('log.level', function () {
        it('should set the default based on the environment', function () {
            [ { env: 'testing', level: 'none' },
              { env: 'development', level: 'debug' },
              { env: 'any', level: 'warn' } ]
            .forEach(function (v) {
                mod(mockApp, { env: v.env });
                mockApp.config.get('log.level').should.equal(v.level);
            });
        });
        
        it('should use the specified value when supplied as \'log.level\'', function () {
            mod(mockApp, { log: { level: 'foo' } });
            mockApp.config.get('log.level').should.equal('foo');
        });
        
        it('should interpret \'quiet\' as log.level = none', function () {
            mod(mockApp, { quiet: true });
            mockApp.config.get('log.level').should.equal('none');
        });
    });
});

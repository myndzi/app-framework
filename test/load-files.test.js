'use strict';

var Promise = require('bluebird'),
    PATH = require('path');

var mockApp = { path: function (str) { return PATH.join(__dirname, str); } },
    load = require('../lib/load-files');

before(function () {
    require('../lib/null-logger')(mockApp);
})
describe('load-files', function () {
    it('should load all the .js files in the specified folder, relative to app.path', function () {
        return load('loadfiles-test-1')(mockApp)
        .then(function () {
            mockApp.foo.should.equal(true);
            mockApp.bar.should.equal(true);
        });
    });
    it('should pass along extra arguments', function () {
        return load('loadfiles-test-1', 'baz')(mockApp)
        .then(function () {
            mockApp.foo.should.equal('baz');
        });
    });
    it('should assign the return values of each file to a key on app', function () {
        return load('loadfiles-test-1')(mockApp)
        .then(function () {
            var obj = mockApp['loadfiles-test-1'];
            obj.foo.should.equal(1);
            obj.should.not.have.property('bar');
        });
    });
    it('should use only the first period-separated token of the filename for the object key', function () {
        return load('loadfiles-test-1')(mockApp)
        .then(function () {
            var obj = mockApp['loadfiles-test-1'];
            obj.baz.should.equal(true);
        });
    });
    it('should not load non-js files', function () {
        return load('loadfiles-test-1')(mockApp)
        .then(function () {
            var obj = mockApp['loadfiles-test-1'];
            obj.should.not.have.property('keke1');
            obj.should.not.have.property('keke2');
        });
    });
    it('should call required-in modules with \'app\' and an \'xport\' callback', function () {
        function cb(app, xport) {
            app.should.equal(mockApp);
            xport.should.be.a.Function;
        }
        return load('loadfiles-test-2', cb)(mockApp);
    });
    it('should assign exported keys instead of the return value if xport is called', function () {
        function cb(app, xport) {
            xport('foo', 'bar');
            xport('baz', 'quux');
        }
        return load('loadfiles-test-2', cb)(mockApp)
        .then(function () {
            var obj = mockApp['loadfiles-test-2'].foo;
            obj.foo.should.equal('bar');
            obj.baz.should.equal('quux');
        });
    });
});

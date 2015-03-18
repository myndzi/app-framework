'use strict';

require('should-eventually');

describe('app', function () {
    var app;
    
    before(function () {
        return require('../../lib/index')({
            app: { root: __dirname }
        }).then(function (_app) {
            app = _app;
            return app.listen();
        });
    });
    
    it('should have methods \'lib\', \'path\', and properties \'log\', \'config\', \'root\'', function () {
        app.should.have.property('lib').which.is.a.Function;
        app.should.have.property('path').which.is.a.Function;
        app.should.have.property('root').equal(__dirname);
        app.should.have.property('config');
        app.should.have.property('log');
    });
    
    it('should be using the null-logger when called with quiet: true', function () {
        var mock = { };
        require('../../lib/null-logger')(mock);
        mock.log.debug.should.equal(app.log.debug);
    });
    
    it('should emit a \'loaded\' event when complete', function (done) {
        return require('../../lib/index')({
            root: __dirname,
            quiet: true
        }).then(function (app) {
            app.once('loaded', done);
        });
    });
    
    it('should emit a \'shutdown\' method when calling app.shutdown()', function () {
        var called = false;
        app.on('shutdown', function () {
            called = true;
        });
        return app.shutdown().then(function () {
            called.should.equal(true);
        });
    });
});

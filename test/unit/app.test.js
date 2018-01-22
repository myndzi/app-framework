'use strict';

require('should-eventually');

describe('app', function () {
    beforeEach(function () {
        var self = this;
        return require('../../lib/index')({
            app: {
              env: 'testing',
              root: __dirname
            }
        }).then(function (_app) {
            self.app = _app;
            return _app.listen();
        });
    });

    afterEach(function () {
        return this.app.shutdown();
    });

    it('should have methods \'lib\', \'path\', and properties \'log\', \'config\', \'root\'', function () {
        var app = this.app;
        app.should.have.property('lib').which.is.a.Function;
        app.should.have.property('path').which.is.a.Function;
        app.should.have.property('root').equal(__dirname);
        app.should.have.property('config');
        app.should.have.property('log');
    });

    it('should be using the null-logger when called with quiet: true', function () {
        var app = this.app;
        var mock = { };
        require('../../lib/null-logger')(mock);
        mock.log.debug.should.equal(app.log.debug);
    });

    it('should emit a \'loaded\' event when complete', function (done) {
        var app = this.app;
        return require('../../lib/index')({
            root: __dirname,
            quiet: true
        }).then(function (app) {
            app.once('loaded', done);
        });
    });

    it('should emit a \'shutdown\' event when calling app.shutdown()', function () {
        var app = this.app;
        var called = false;
        app.on('shutdown', function () {
            called = true;
        });
        return app.shutdown().then(function () {
            called.should.equal(true);
        });
    });
});

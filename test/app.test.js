'use strict';

describe('app', function () {
    var app;
    
    before(function () {
        require('../lib/index')({
            root: __dirname,
            //quiet: true
        }).then(function (_app) {
            app = _app;
            return app.listen();
        });
    });
    
    it('should', function () {
    });
});

'use strict';

require('should');

var convict = require('convict');

describe('configure', function () {
    var mockApp = {
        config: convict({
            app: {
                name: { format: String, default: null },
                env: { format: String, default: null },
                root: { format: String, default: null },
            },
            log: {
                level: { format: String, default: null }
            }
        }).load({
            log: { level: 'none' },
            app: {
                env: 'testing',
                root: __dirname,
                name: '__APP_FRAMEWORK_TEST__'
            }
        }),
        emit: function () { }
    };

    var mod = require('../../lib/configure');

    before(function () {
        return mod(mockApp, { }, { });
    });

    it('should attach a \'config\' object that is an instance of node-convict', function () {
        mockApp.should.have.property('config').with.property('validate');
    });

    it('should return a rejected promise if config doesn\'t validate', function () {
        return mod(mockApp, {
            app: { name: null }
        }, {
            app: { name: { default: 'test' } },
            test: { default: 'succeed', format: ['succeed'] }
        }).should.be.rejectedWith(/be of type/);
    });
});

'use strict';

var convict = require('convict'),
    extend = require('extend');

module.exports = function (config, schema) {
    var conf = convict(extend(true, { }, config._def, schema));
    conf.load(config.get());
    return conf;
};

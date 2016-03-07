'use strict';

var convict = require('convict'),
    extend = require('extend');

function recursiveSet(config, obj, schema, path) {
    Object.keys(obj).forEach(function (key) {
        if (
            Array.isArray(obj[key]) ||
            obj[key] === null ||
            typeof obj[key] !== 'object' ||
            !schema.properties[key] ||
            schema.properties[key].format === 'object'
        ) {
            config.set(path.concat(key).join('.'), obj[key]);
        } else {
            recursiveSet(config, obj[key], schema.properties[key], path.concat(key));
        }
    });
}
function load(config, obj) {
    recursiveSet(config, obj, config.getSchema(), [ ]);
}
function extendConvict(config, schema) {
    var conf = convict(extend(true, { }, config._def, schema));
    load(conf, config.get());
    return conf;
}

module.exports = {
    extendConvict: extendConvict,
    load: load
};

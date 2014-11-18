'use strict';

module.exports = function (app, arg) {
    app.foo = typeof arg === 'string' ? arg : true;
    return 1;
};

'use strict';

var fs = require('fs'),
    PATH = require('path');

var convict = require('convict');

// sets up a config environment for components that load before the schema proper
// TODO: deal with this potentially conflicting with the defined schema
module.exports = function (app, config) { // jshint maxcomplexity: 15, maxstatements: 25
    config = config || { };
    
    config.app = config.app || { };
    config.log = config.log || { };
    
    // deal with passing flat options / legacy keys
    
    if (config.env) {
        config.app.env = config.app.env || config.env;
        delete config.env;
    }
    if (config.root) {
        config.app.root = config.app.root || config.root;
        delete config.root;
    }
    if (config.name) {
        config.app.name = config.app.name || config.name;
        delete config.name;
    }
    if (config.quiet) {
        config.log.level = config.log.level || 'none';
        delete config.quiet;
    }
    
    app.config = convict({ });
    
    app.config.set('app.env', (function () {
        if (config.app && config.app.env) { return config.app.env; }
        if (process.env.NODE_ENV) { return process.env.NODE_ENV; }
        if (typeof describe === 'function') { return 'testing'; }
        return 'development';
    })());
    
    app.config.set('app.root', (function () {
        if (config.app && config.app.root) { return config.app.root; }
        
        // find main package dir
        var path = require.main.filename, newPath;
        while (!fs.existsSync(PATH.join(path, 'package.json'))) {
            newPath = PATH.dirname(path);
            if (path === newPath) {
                throw new Error('No suitable root directory was found');
            }
            path = newPath;
        }
        return path;
    })());
    
    var appRoot = app.config.get('app.root');
    
    try {
        var stat = fs.statSync(appRoot);
        if (!stat.isDirectory()) {
            throw new Error('App root isn\'t a directory: ' + appRoot);
        }
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw new Error('App root doesn\'t exist: ' + appRoot);
        }
        throw e;
    }
    
    app.config.set('app.name', (function () {
        if (config.app && config.app.name) { return config.app.name; }
        return PATH.basename(app.config.get('app.root'));
    })());
        
    app.config.set('log.level', (function () {
        if (config.log && config.log.level) { return config.log.level; }
        switch (app.config.get('app.env')) {
            case 'testing':
                return 'none';
            case 'development':
                return 'debug';
            default:
                return 'warn';
        }
    })());
};
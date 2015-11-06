# App-framework

It's a working title.

# What

This isn't so much a framework per se as it is a light wrapper around `express`. Its duties encompass configuration loading, logging, and application lifecycle flow. Each of these is covered in a bit more detail below.

# How

This includes a little boilerplate that allows the product to function as a module or a standalone executable.

	var App = require('@myndzi/app-framework');
	var extend = require('extend');
	module.exports = function (_config) {
		var config = extend({
			root: __dirname,
			name: 'myCoolApp',
			modules: ['database', 'middleware', 'routes']
		}, _config);

		return App(config).call('listen');
	};

	if (require.main === module) {
		module.exports();
	}


# Configuration

`app-framework` utilizes `convict` for configuration loading. Convict allows you to define a config schema; this schema can specify bindings to environment variables or command line switches. The result is a config object that's been validated against its schema and sourced from environment variables, command line arguments, and (possibly multiple) configuration files, making it extremely flexible.

`app-framework` itself will attempt to load the following files:

- A configuration schema located in `<appRoot>/config/.schema.js`
- A global default configuration file located in `<appRoot>/config/all.js`
- An environment configuration file located in `<appRoot>/config/<environment>.js`
- A system-local configuration file located in `/etc/<appName>.js`
- A user-local configuration file located in `<homeDir>/.<appName>.js`

### Note:

All configuration files are `.js` files, not `.json` files; they must be valid node files, which creates a little boilerplate wrapping everything like `module.exports = { ... };`, but being executable allows for a little logic when needed, for example to construct a path via the `path` module. This may go back to json in future versions, as the conditional-logic requirements have mostly been solved by the evolution of this package itself.

`app-framework` will also add to the existing config schema, when not present, the following items:

- `app.env` - the environment the application is running in, an enum:
	- development
	- testing
	- production
- `app.root` - the root directory of the application
- `app.name` - the name of the application
- `log.level` - configurable level for log output, an enum:
	- trace
	- debug
	- info
	- warn
	- error
	- fatal
	- none

These items obtain the following default values, if not specified:

- `app.env` - `testing` if there is a global function `describe` defined, `development` otherwise
- `app.root` - the first parent directory of `require.main.filename` that contains a `package.json` file
- `app.name` - the directory name of the app root
- `log.level` - Depends on the environment:
	- For environment `testing`, log level `none`
	- For environment `development`, log level `debug`
	- Otherwise, log level `warn`

You can redefine these default schema items so long as your new definition is compatible. The above settings are used during pre-configuration (more on pre-configuration in the bootstrap section)

A few other config keys are expected/used by `app-framework`, though it does not define a schema for them:

- `app.port` - the port to listen on
- `app.ip` - the ip to listen on
- `app.maxListeners` - configure the maxListeners value of the `app` event emitter; most likely to suppress warnings about too many listeners, e.g. on the `shutdown` event
- Log configuration (see below)

# Logging

No logger will be loaded if the app is instantiated with the config option `log.level` equal to `none`.

Otherwise, `app-framework` looks for the following configuration data:

- `log.types` - An array containing strings matching he types of log transports to enable; an enum:
	- `file`
	- `screen`
	- `syslog`
	- `ringbuffer`
- `log.file.filename` - When `file` is selected, this is the filename to log messages to; default is `log/app.log`; when a relative path is given, it is taken relative to `app.root`
- `log.syslog.facility` - The facility to use when sending syslog messages
- `log.syslog.connection` - Connection options to pass to [syslog2](https://www.npmjs.com/package/syslog2)
- `log.ringbuffer.limit` - Not yet implemented. Number of lines to retain in the ring buffer.

### Note:
`ringbuffer` is a special type of log that keeps a circular buffer of the last X log messages. Its intended use is to store log messages for dumping on unexpected exit (for example, when no screen logging is in use), but this behavior is not yet implemented. 

### Note:
Since this section can be disabled entirely, `app-framework` does not create the schema automatically like the core config values above.

### Note:
A basic stdout/stderr logger is used for bootstrapping and shutdown; these messages will not be captured by the configured log methods.

# Bootstrapping

`app-framework` implements a somewhat complex bootstrapping method designed to allow configuration of logging *as well as* logging of configuration, and promise-based asynchronous startup and shutdown. The startup flow goes like this:

- Pre-configuration
- Basic logger
- Full configuration
- Full logging
- Configured modules

Each of these steps is explained below:

## Pre-configuration
This loads the core schema described above, and loads any injected config data relevant to the core schema taken from:

- Injected config (passed to `App()` when instantiating)
- Environment variables
- Command line arguments

... along with defaults calculated as described in the Configuration section above.

This core set of data is used to locate and load other config files and so on, later.

## Basic logger
If `log.level` is none, this extends `app` with a `log` stub full of no-ops. Otherwise, it loads a basic logger that sends `warn` and higher messages to stderr and `info` and lower messages to stdout, prefixed with their level, such as: `INFO: some log message`.

### Note:
This behavior is *not affected by the main config files*, since they haven't been loaded yet.

## Full configuration
This step finds and loads the full schema and any config files; it logs some debug output during this process, which is handled by the basic logger

## Full logging
This step takes the processed configuration and instantiates the configured log transports, extending `app` with a full Bunyan instance at `app.log`

## Configured modules
The `modules` key passed on instantiation (`App({ modules: [ ... ] })`) defines directories within `<appRoot>/app` to load code from. Directories listed here will be searched for `.js` files to load, and those files will be loaded accordingly. This method should soon be deprecated in favor of calling `app.loadFiles` explicitly. Detailed behavior will be described in that section.

# API

## App() factory

Returns a promise for the instantiated application.

	App({
		root: '/app/root',
		name: 'myCoolApp',
		modules: ['modules', 'to', 'load']
    });

All `.js` files in `<appRoot>/app/<module>` are loaded for each item in the `modules` array; directory loading is described in more detail under `app.loadFiles`

## app.configure()
Merges an object into the app configuration:

	app.configure({
		caching: {
			enabled: false
		}
	});

### Note:
This doesn't necessarily make your app change behavior; for that, use the following:

## Event: 'configure'
Emitted when new configuration is loaded via `app.configure()`

	app.on('configure', function (newConfig) {
		// update behavior
	});
 

## app.env
Contains the configured environment

## app.root
Contains the application root

## app.lib()
A helper to load modules from `<appRoot>/lib`:

	var helper = app.lib('helper');

Equivalent to:

	var helper = require('path').join(app.root, 'helper');

Allows for loading of `lib`-dir files without needing to know your position in the file hierarchy

## app.path()
Returns a path relative to `<appRoot>/app`

## app.log\[level\]()
Logs a message of the given level. Follows [bunyan's semantics](https://www.npmjs.com/package/bunyan#log-method-api).

	app.log.info('Hi guys');
	app.log.error(new Error('oh no!'));
	app.log.debug('loaded file: %s', filename);

## app.listen()
Start the app listening on `app.port`:`app.ip`; returns a promise.

## Event: 'server'
Emitted when a server has been created for the app:

	app.on('server', function (server) {
		// ...
	});

## Event: 'listening'
Emitted when the server is listening:

	app.on('listening', function (address, port, env) {
		// ..
	});

## app.restart(msg, timeout)
Equivalent to `app.shutdown(EXIT_CODES.RELOAD, msg, timeout)`

## app.shutdown(code, msg, timeout)
Shuts down the app. All arguments are optional. `code` is the exit code to exit with; `msg` is a message / reason; timeout is a number in milliseconds to wait for async shutdown handlers to clean up before giving up.

`app.shutdown` does not actually call `process.exit()` anymore; instead, it leaves that behavior to its caller.

`code` defaults to `EXIT_CODES.UNKNOWN`.

If all shutdown handlers concluded, the resolved value is the value of `code`.

If the timeout is specified and expires before handlers have concluded, the code becomes `EXIT_CODES.SHUTDOWN_TIMEOUT_EXCEEDED`.

Defined shutdown codes are in `lib/exit-codes`, and as of this writing are as follows:

- RELOAD: -1
- OK: 0
- SHUTDOWN_NOT_AVAILABLE: 1
- SHUTDOWN_TIMEOUT_EXCEEDED: 2
- SERVER_ERROR: 3
- UNKNOWN: 99

## Event: 'before shutdown'
Emitted before the shutdown process begins. `code`, `msg`, and `timeout` are passed to this event after interpretation/defaults:

	app.on('before shutdown', function (code, msg, timeout) {
		app.log.warn('App shutting down: %s', msg);
	});

## Event: 'shutdown'
Emitted when the app actually shuts down. Shutdown handlers that require asynchronous cleanup may indicate this by passing a promise or callback-expecting function like so:

	app.on('shutdown', function (await) {
		await(asyncShutdown); // callback
		await(asyncShutdown$()); // promise
	});

You may call `await` as many times as you want, or even return your promise, though that is not recommended since it is an atypical use of event handlers.

## Event: 'after shutdown'
Emitted when shutdown has concluded. If shutdown concludes due to a timeout, an object is passed like this:

	{
		code: <exit code>,
		cleanupHandlers: [promises]
	}

If shutdown does not time out, this object is passed instead:

	{
		code: <exit code>,
		errors: [errors]
	}

The latter provides an array with any/all collected errors during the shutdown process; this includes synchronous throws from event handlers as well as promise rejections and callbacks that gave error arguments.

Synchronous values and callbacks all get converted to promises by the `await()` function; these promises are collected in an array and passed as `cleanupHandlers` in the case of a timeout. This is primarily useful to try and figure out which handlers stalled.

## app.loadFiles(type[, ..opts])
Loads the files from `<appRoot>/app/type`. Extends `app` with a map `app[type]` which maps filenames to their exports.

Loaded files are expected to export a function with the signature `function (app[, ..opts]) { }`

Files are required, then called with the above signature. Opts can be any number of arguments, and `arguments[1]` passed to `app.loadFiles()` will be `arguments[1]` when calling the module's exported function.

All `.js` files are loaded in arbitrary order; if you need more control over which files are loaded or their order, you can put an `index.json` file in the directory in question containing an ordered array of which files to load.

Example:

	myCoolApp/app/routes/foo.js
	myCoolApp/app/routes/bar.js
	myCoolApp/app/routes/baz.js
	myCoolApp/app/routes/index.json

If you wanted to ensure the routes were loaded in the order 'baz', 'bar', 'foo', `index.json` should contain:

	['baz.js', 'bar.js', 'foo.js']

If you wanted to only load `foo.js`, `index.json` should contain:

	['foo.js']

If `foo.js` contained something like the following:

	module.exports = function (app) {
		return function () { console.log('foo!'); }
	};

Then after `routes` was loaded, there would be a key, `app.routes.foo` which contained the function `function () { console.log('foo!'); }`

## Event: 'loaded'
Emitted when the app bootstrap process has completed. This will not include any promise handlers bound to the result of calling App().

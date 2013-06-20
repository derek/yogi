/*jshint maxlen: 300 */

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    api = require('../api'),
    git = require('../git'),
    spawn = require('win-spawn'),
    path = require('path'),
    request = require('request'),
    fs = require('fs'),
    async = require('async'),
    glob = require('glob'),
    mods = {
        init: function(options) {
            var module = util.getPackage(true),
                mod;

            this.module = module;
            this.loglevel = (options.parsed.loglevel || 'info');
            this.tmproot = (options.parsed.tmproot || false);
            this.timeout = (options.parsed.timeout || 300); // seconds
            this.refs = [
                // 'v3.5.0',
                // 'v3.6.0',
                // 'v3.7.0',
                // 'v3.8.0',
                // 'v3.9.0'
            ];
            this.wip = true;

            if (options.parsed.v36) {
                this.refs.push('v3.6.0');
            }

            if (options.parsed.v37) {
                this.refs.push('v3.7.3');
            }

            if (options.parsed.v38) {
                this.refs.push('v3.8.1');
            }

            if (options.parsed.v39) {
                this.refs.push('v3.9.1');
            }

            if (options.parsed.v310) {
                this.refs.push('v3.10.3');
            }

            if (options.parsed['3x']) {
                this.refs.push('3.x');
            }

            if (options.parsed.master) {
                this.refs.push('master');
            }

            if (options.parsed.wip === false) {
                this.wip = options.parsed.wip;
            }

            if (options.parsed.last3) {
                this.refs.push('v3.8.1');
                this.refs.push('v3.9.1');
                this.refs.push('v3.10.3');
            }

            // De-dupe the refs
            this.refs = this.refs.reverse().filter(function (e, i, arr) {
                return arr.indexOf(e, i+1) === -1;
            }).reverse();

            mod = util.findModule(true);

            this.yuiRoot = path.join(git.findRoot(),'..');

            if (!mod) {
                if (util.isYUI()) {
                    this.processYUI();
                }
            }
            else {
                this.component = options.parsed.component || mod.name;
                this.componentRoot = path.join(this.yuiRoot + '/src/' + this.component);
                this.processComponent(this.component);
            }
        },

        processYUI: function () {
            var yuiRoot = this.yuiRoot,
                executeTests = this._executeTests,
                files = glob.sync(yuiRoot + '/src/*/tests/performance/*.js');

            this._executeTests(files);
        },

        processComponent: function (componentName) {
            var yuiRoot = this.yuiRoot,
                testDir = path.join(yuiRoot, 'src', componentName, 'tests/performance'),
                filtered, testPaths;

            filtered = fs.readdirSync(testDir).filter(function (file) {
                return file.match(/js$/);
            });

            testPaths = filtered.map(function (file) {
                return path.join(yuiRoot, 'src', componentName, 'tests/performance', file);
            });

            this._executeTests(testPaths);
        },

        help: function() {
            return [
                'benchmark',
                'executes performance tests'
            ];
        },

        _executeTests: function (testpaths) {
            var self = this;

            log.info('Found ' + testpaths.length + ' test file' + (testpaths.length > 1 ? 's' : ''));
            async.eachSeries(testpaths, function (testpath, next) {
                self._executeTest(testpath, next);
            });
        },

        _executeTest: function (testpath, next) {
            var self = this,
                yuiRoot = this.yuiRoot,
                refs = this.refs,
                componentRoot = this.componentRoot,
                wip = this.wip,
                timeout = this.timeout,
                loglevel = this.loglevel,
                yogiRoot = path.join(__dirname, '../../'),
                stdout = '',
                tests = [],
                completed = 0,
                child,
                port = 3000,
                averages = {},
                argsObj = {
                    yuipath: yuiRoot,
                    iterations: 1,
                    loglevel: loglevel,
                    source: testpath,
                    phantomjs: true,
                    pretty: true,
                    wip: wip,
                    timeout: timeout
                },
                output = '',
                argsArr = [];

            if (this.tmproot) {
                argsObj.tmproot = this.tmproot;
            }

            log.info('Executing 1 test against ' + (refs.length + 1) + ' refs with ' + argsObj.iterations + ' iterations each. Run count is ' + argsObj.iterations * (refs.length + 1) + '.');
            log.info('Source: ' + argsObj.source);

            for (var key in argsObj) {
                argsArr.push('--' + key + '=' + argsObj[key]);
            }

            refs.forEach(function(ref) {
                argsArr.push('--ref=' + ref);
            });

            log.debug('Args: ' + argsArr.join(' '));

            child = spawn(path.resolve(__dirname + '/../../node_modules/yui-benchmark/bin/yb.js'), argsArr, {
                cwd: componentRoot,
                stdio: 'inherit'
            });

            child.on('exit', function (error, stdout, stderr) {
                next();
            });
        }
    };

util.mix(exports, mods);

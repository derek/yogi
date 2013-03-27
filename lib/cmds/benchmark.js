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
    mods = {
        init: function(options) {
            var module = util.getPackage(true),
                mod;

            this.module = module;
            this.debug = (options.parsed.loglevel == 'debug');

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
            var testPaths = require(this.yuiRoot + '/src/common/tests/performance.json');
            this._executeTests(testPaths);
        },

        processComponent: function (componentName) {
            // this.parseResults(require('./benchmark-test-data.json')); return false;
            var testPaths = require(this.yuiRoot + '/src/common/tests/performance.json');

            filtered = testPaths.filter(function (testpath) {
                return testpath.match(new RegExp('^' + componentName + '/'));
            });

            this._executeTests(filtered);
        },

        help: function() {
            return [
                'benchmark',
                'executes performance tests'
            ];
        },

        _executeTests: function (testpaths) {
            var self = this;
            
            log.info('Found ' + testpaths.length + ' test' + (testpaths.length > 1 ? 's' : ''));
            async.eachSeries(testpaths, function (testpath, next) {
                self._executeTest(path.join(self.yuiRoot, 'src', testpath), next);
            });
        },

        _executeTest: function (testpath, next) {
            var self = this,
                yuiRoot = this.yuiRoot,
                componentRoot = this.componentRoot,
                yogiRoot = path.join(__dirname, '../../'),
                stdout = '',
                tests = [],
                completed = 0,
                child,
                port = 3000,
                averages = {},
                refs = [
                    // 'v3.5.0',
                    // 'v3.6.0',
                    // 'v3.7.0',
                    // 'v3.8.0',
                    'v3.9.0'
                ],
                argsObj = {
                    yuipath: yuiRoot,
                    iterations: 1,
                    loglevel: 'debug',
                    source: testpath,
                    phantomjs: true,
                    pretty: true,
                },
                output = '',
                argsArr = [];

            log.info('Executing 1 test against ' + refs.length + ' refs with ' + argsObj.iterations + ' iterations each. Run count is ' + argsObj.iterations * refs.length + '.')

            for (key in argsObj) {
                argsArr.push('--' + key + '=' + argsObj[key])
            }

            refs.forEach(function(ref) {
                argsArr.push('--ref=' + ref);
            });

            log.debug('Args: ' + argsArr.join(' '));

            child = spawn('yui-benchmark', argsArr, {
                cwd: componentRoot
            });

            child.stdout.setEncoding('utf8');

            child.stdout.on('data', function(data) {
                if (self.debug || !/debug/.test(data)) {
                    process.stdout.write(data);
                }
            });

            child.on('exit', function (error, stdout, stderr) {
                next();
            });
        }
    };

util.mix(exports, mods);
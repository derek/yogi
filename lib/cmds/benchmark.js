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
    mods = {
        init: function(options) {
            var module = util.getPackage(true),
                mod;

            this.module = module;

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
                child = spawn('ybench', ['benchmark_data','-name', '*.json'], {
                    cwd: this.yuiRoot
                });

            child.stdout.setEncoding('utf8');
            child.stdout.on('data', function(data) {

            });
        },

        processComponent: function (componentName) {

            // this.parseResults(require('./benchmark-test-data.json')); return false;

            var plugin = this,
                yuiRoot = this.yuiRoot,
                componentRoot = this.componentRoot,
                yogiRoot = path.join(__dirname, '../../'),
                files = fs.readdirSync(componentRoot + '/tests/benchmark'),
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
                    'v3.8.0',
                    'v3.9.0',
                    'HEAD'
                ],
                argsObj = {
                    yuipath: yuiRoot,
                    iterations: 1,
                    loglevel: 'silent',
                    source: null,
                    phantomjs: true,
                    output: 'pretty',
                }
            
            files.forEach(function (file) {
                if (file.match(/js$/)) {
                    tests.push(path.join('tests/benchmark', file));
                } 
            });

            log.info('Executing ' + tests.length + ' test' + ((tests.length > 1) ? 's' : '') + ' against ' + refs.length + ' refs with ' + argsObj.iterations + ' iterations each. Run count is ' + argsObj.iterations * tests.length * refs.length + '.')

            tests.forEach(function (test, i) {
                var output = '',
                    argsArr = [];

                argsObj.source = test;
                for (key in argsObj) {
                    argsArr.push('--' + key + '=' + argsObj[key])
                }

                refs.forEach(function(ref) {
                    argsArr.push('--ref=' + ref);
                });

                log.debug('Args: ' + argsArr.join(' '));

                child = spawn('ybench', argsArr, {
                    cwd: componentRoot
                });

                child.stdout.setEncoding('utf8');

                child.stdout.on('data', function(data) {
                    output += data;
                });

                child.on('exit', function (error, stdout, stderr) {
                    console.log(output);
                });
            });
        },

        finish: function (plugin, results, testFile, sha) {

        },

        help: function() {
            return [
                'benchmark',
                'generates benchmark data'
            ];
        }
    };
    
util.mix(exports, mods);
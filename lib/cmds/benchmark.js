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
    Table = require('cli-table'),
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
                    'v3.6.0',
                    'v3.7.0',
                    // 'v3.8.0',
                    // 'v3.9.0pr3',
                    'HEAD'
                ],
                argsObj = {
                    yuipath: yuiRoot,
                    iterations: 3,
                    loglevel: 'silent',
                    source: null,
                    phantomjs: true,
                    json: true,
                }
            
            files.forEach(function (file) {
                if (file.match(/html$/)) {
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
                    plugin.parseResults(JSON.parse(output));
                });
            });
        },

        parseResults: function (results) {
            var data = {},
                refs = [],
                tables = {};

            results.forEach(function (result) {
                agent = result.UA.split(' ')[0];

                if (!data[result.name]) {
                    data[result.name] = {};
                }

                if (!data[result.name][agent]) {
                    data[result.name][agent] = {
                        refs: [],
                        fastest: null,
                        slowest: null
                    };
                }

                if (!data[result.name][agent].refs[result.ref]) {
                    data[result.name][agent].refs[result.ref] = {
                        cumulative: 0,
                        average: 0,
                        count: 0,
                        slower: null
                    };
                }

                if (refs.indexOf(result.ref) === -1) {
                    refs.push(result.ref);
                }

                data[result.name][agent].refs[result.ref].cumulative += result.value;
                data[result.name][agent].refs[result.ref].count++;
                tables[result.name] = new Table({
                    head: [''],
                    style : {
                        compact : true, 
                        'padding-right' : 2,
                        'padding-left' : 2,
                    }
                });
            });

            // Generate the averages
            for (test in data) {
                var set = data[test];
                for (agent in set) {
                    for (ref in set[agent].refs) {
                        var self = set[agent].refs[ref];
                        self.average = self.cumulative / self.count
                    }
                }
            }

            // Figure out the fastest/slowest
            for (test in data) {
                var set = data[test];
                for (agent in set) {
                    var fastest = null;
                    var slowest = null;

                    for (ref in set[agent].refs) {
                        var self = set[agent].refs[ref];

                        if (!fastest || self.average > fastest) {
                            set[agent].fastest = ref;
                            fastest = self.average;
                        }
                        if (!slowest || self.average < slowest) {
                            set[agent].slowest = ref;
                            slowest = self.average;
                        }
                    }
                }
            }

            // Figure out the slower %
            for (test in data) {
                var set = data[test];
                for (agent in set) {
                    var fastest = set[agent].fastest;
                    var slowest = set[agent].slowest;

                    for (ref in set[agent].refs) {
                        var self = set[agent].refs[ref];
                        self.slower = -(((set[agent].refs[fastest].average / self.average) - 1) * 100).toFixed(2);
                    }
                }
            }

            // Display the results
            for (test in data) {
                var table = tables[test];
                refs.forEach(function (ref) {
                    var row = [];

                    row.push(ref);

                    for (agent in data[test]) {
                        if (table.options.head.indexOf(agent) == -1) {
                            table.options.head.push(agent)
                        }

                        if (data[test][agent].refs[ref].slower) {
                            row.push(data[test][agent].refs[ref].slower.toFixed(0) + '%');
                            // row.push(data[test][agent].refs[ref].average);
                        }
                        else {
                            // row.push('');
                            row.push(log.color('Fastest', 'green'));
                        }
                    }

                    table.push(row);
                });
                console.log('\n');
                console.log(' ' + test);
                console.log(table.toString());
                console.log('\n');

            }
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
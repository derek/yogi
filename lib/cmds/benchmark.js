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

            mod = options.parsed.component || util.findModule(true);

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
                child = spawn('find', ['benchmark_data','-name', '*.json'], {
                    cwd: this.yuiRoot
                });

            child.stdout.setEncoding('utf8');
            child.stdout.on('data', function(data) {
                var blobs = [],
                    paths = data.trim().split('\n'),
                    combined,
                    output = {};

                paths.forEach(function(p, i) {
                    blobs.push(fs.readFileSync(p, 'utf8'));
                });
                
                combined = JSON.parse('[' + blobs + ']');

                combined.forEach(function (test){
                    if (!output[test.component]) {
                        output[test.component] = {};
                    }

                    if (!output[test.component][test.file]) {
                        output[test.component][test.file] = {
                            meta: {
                                title: test.name,
                                description: test.description
                            },
                            data: []
                        };
                    }
                    var data = {};
                    data.category = test.sha;
                    data[test.ua] = test.results.avg
                    output[test.component][test.file].data.push(data);
                });

                Object.keys(output).forEach(function(component, b, _array) {
                    Object.keys(output[component]).forEach(function(file, d, _array) {
                        var data = 'var chart = ' + JSON.stringify(output[component][file], null, 4) + ';';
                        var outputPath = yuiRoot + '/benchmark_data/' + component + '/' + file.replace('html', 'js');
                        
                        fs.writeFile(outputPath, data, function(err) {
                            if (err) {
                                console.log("Error: " + err);
                            }
                            else {
                                console.log("Wrote output to " + outputPath);
                            }
                        });
                    });
                });
            });
        },

        processComponent: function (componentName) {
            var plugin = this,
                componentRoot = this.componentRoot,
                yogiRoot = path.join(__dirname, '../../'),
                files = fs.readdirSync(componentRoot + '/tests/benchmark'),
                stdout = '',
                tests = [],
                completed = 0,
                child;

            files.forEach(function (file) {
                if (file.match(/html$/)) {
                    tests.push(file);
                } 
            });

            tests.forEach(function (test, i) {
                var bin = yogiRoot + 'scripts/benchmark.phantom',
                    testPath = componentRoot + '/tests/benchmark/' + test,
                    output = '';

                child = spawn(bin, [testPath], {
                    cwd: this.dir
                });

                child.stdout.setEncoding('utf8');

                child.stdout.on('data', function(data) {
                    output += data;
                });

                child.on('exit', function (error, stdout, stderr) {
                    completed++;

                    if (error !== 0) {
                        console.log('Error: ' + error);
                    }

                    output = JSON.parse(output.trim());
                    plugin.finish(plugin, output, test);
                });
            });
        },

        finish: function (plugin, results, testFile, sha) {

            // Ugly
            if (sha === undefined) {
                git.getSHA(function (err, sha) {
                    plugin.finish(plugin, results, testFile, sha);
                });

                return false;
            }

            var outputDir = plugin.yuiRoot + '/benchmark_data/' + plugin.component + '/' + sha + '/',
                outputFilename = (results.name + '-' + results.ua + '.json').toLowerCase(),
                outputPath = outputDir + outputFilename,
                output = {
                    sha: sha,
                    generatedAt: new Date().getTime(),
                    component: plugin.component,
                    file: testFile,
                    name: results.name,
                    description: results.description,
                    ua: results.ua,
                    results: {
                        calls: results.calls,
                        min: results.min,
                        max: results.max,
                        avg: results.avg
                    }
                },
                pretty = JSON.stringify(output, null, 4);
            
            // Ugly. mkdirp?
            if (!fs.existsSync(plugin.yuiRoot + '/benchmark_data/')) {
                fs.mkdirSync(plugin.yuiRoot + '/benchmark_data/');

                request.get('https://gist.github.com/derek/a72662122e80492cbfd7/raw/viewer.html', function (error, response, body) {
                    fs.writeFile(plugin.yuiRoot + '/benchmark_data/viewer.html', body, function(err) {
                        if (err) {
                            console.log("Error: " + err);
                        }
                    });
                });

                // Also copy the viewer.html file
                // https://gist.github.com/derek/a72662122e80492cbfd7/raw/b3951600bdc98a3115525650693fc9fe72cf2013/viewer.html
            }
            
            if (!fs.existsSync(plugin.yuiRoot + '/benchmark_data/' + plugin.component + '/')) {
                fs.mkdirSync(plugin.yuiRoot + '/benchmark_data/' + plugin.component + '/');
            }

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }

            fs.writeFile(outputPath, pretty, function(err) {
                if (err) {
                    console.log("Error: " + err);
                }
                else {
                    console.log("Wrote output to " + outputPath);
                }
            });
        },

        help: function() {
            return [
                'benchmark',
                'generates benchmark data'
            ];
        }
    };

util.mix(exports, mods);
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
    fs = require('fs'),
    mods = {
        init: function(options) {
            this.options = options;
            this.module = util.getPackage(true);
            this.component = util.findModule(true);

            if (!this.component) {
                if (util.isYUI()) {
                    this.processYUI();
                }
            }
            else {
                this.yuiRoot = path.join(git.findRoot(), '../src');
                this.componentRoot = path.join(this.yuiRoot + '/' + this.component.name);
                this.processComponent(this.component.name);
            }
        },

        processYUI: function () {
            var child = spawn('find', ['.','-name', 'benchmark.json'], {
                cwd: this.yuiRoot
            });

            child.stdout.setEncoding('utf8');
            child.stdout.on('data', function(data) {
                var blobs = [],
                    paths = data.trim().split('\n'),
                    combined;
                
                paths.forEach(function(path, i) {
                    blobs.push(fs.readFileSync(path, 'utf8'));
                });
                
                combined = JSON.parse('[' + blobs + ']');

                combined.forEach(function (component){
                    component.results.forEach(function (test) {
                        console.log(test);
                    });
                });
            });
        },

        processComponent: function (componentName) {
            var self = this,
                yogiRoot = path.join(__dirname, '../../'),
                bin = yogiRoot + 'scripts/benchmark.phantom',
                files = fs.readdirSync(this.componentRoot + '/tests/benchmark'),
                stdout = '',
                output = [],
                tests = [],
                completed = 0,
                child;

            files.forEach(function (file) {
                if (file.match(/html$/)) {
                    tests.push(file);
                } 
            });

            tests.forEach(function (test, i) {
                console.log("Executing: " + test);
                child = spawn(bin, [test], {
                    cwd: this.dir
                });

                child.stdout.setEncoding('utf8');

                child.stdout.on('data', function(data) {
                    output.push({
                        file: test,
                        output: JSON.parse(data)
                    });
                });

                child.on('exit', function (error, stdout, stderr) {
                    completed++;

                    if (error !== 0) {
                        console.log('Error: ' + error);
                    }
                    
                    if (completed == tests.length) {
                        self.finish(output);
                    }
                });
            });
        },

        finish: function (results) {
            var yuiRoot = path.join(git.findRoot(), '../src'),
                outputFilename = yuiRoot + '/' + this.component.name + '/' + 'benchmark.json',
                output = {
                    sha: '',
                    component: this.component.name,
                    results: results,
                },
                pretty;

            git.getSHA(function(err, sha){
                output.sha = sha;
                pretty = JSON.stringify(output, null, 4)
                
                fs.writeFile(outputFilename, pretty, function(err) {
                    if (err) {
                        console.log("Error: " + err);
                    }
                    else {
                        console.log("Wrote output to " + outputFilename);
                    }
                });
            
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
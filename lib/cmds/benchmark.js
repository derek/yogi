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
    path = require('path'),
    fs = require('fs'),
    mods = {
        init: function(options) {
            this.options = options;

            var module = util.getPackage(true),
                mod;

            this.module = module;
            mod = util.findModule(true);

            this.process();
        },

        process: function () {
            var self = this,
                spawn = require('child_process').spawn,
                exec = require('child_process').exec,
                yogiRoot = path.join(__dirname, '../../'),
                stdout = '', 
                child,
                tests = [
                    'basic.html'
                ];

            tests.forEach(function (path) {
                console.log('Processing: '  + path)
                child = exec(yogiRoot + 'scripts/benchmark.phantom ' + path,
                  function (error, stdout, stderr) {
                    if (error !== null) {
                        console.log('exec error: ' + error);
                    }
                    else {
                        self.parseOutput(stdout);
                    }
                });
            })
        },

        parseOutput: function (raw) {
            var data = JSON.parse(raw),
                pretty = JSON.stringify(data, null, 4),
                yuiRoot = path.join(git.findRoot(), '../src'),
                mod = util.findModule(true),
                moduleName = mod.name,
                outputFilename = yuiRoot + '/' + moduleName + '/' + 'benchmark.json';

            fs.writeFile(outputFilename, pretty, function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("Saved to " + outputFilename);
                    console.log(pretty);
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
/*jshint maxlen: 300 */

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    git = require('../git'),
    spawn = require('win-spawn'),
    path = require('path'),
    async = require('async'),
    glob = require('glob'),
    mods = {
        help: help,
        init: init,
        executeTests: executeTests
    };

function help () {
    return [
        'benchmark',
        'Executes performance tests'
    ];
}

function init (options) {
    var options = this.options = options.parsed,
        yuiRoot = this.yuiRoot = path.join(git.findRoot(), '..'),
        module = this.module = util.getPackage(true),
        mod = util.findModule(true),
        component = (options.component || (mod && mod.name)),
        testpaths = glob.sync(path.join(this.yuiRoot, '/src/' + (component ? component : '*') + '/tests/performance/*.js'));

    this.executeTests(testpaths);
}

function executeTests (testpaths) {
    var options = this.options,
        yuiRoot = this.yuiRoot,
        loglevel = (options.loglevel || 'info'),
        tmproot = (options.tmproot || false),
        timeout = (options.timeout || 300),
        outdir = (options.outdir || false),
        refs = (options.ref || []),
        wip = (options.working === undefined ? true : options.working),
        yb = path.resolve(__dirname + '/../../node_modules/yui-benchmark/bin/yb.js'),
        args = [];

    args = [
        '--yuipath=' + yuiRoot,
        '--loglevel=' + loglevel,
        '--wip=' + wip,
        '--timeout=' + timeout,
        '--phantom=true',
        '--pretty=true'
    ];

    if (tmproot) {
        args.push('--tmproot=' + tmproot);
    }

    refs.forEach(function(ref) {
        args.push('--ref=' + ref);
    });

    log.info('Found ' + testpaths.length + ' test file' + (testpaths.length > 1 ? 's' : ''));
    log.debug('Paths: \n' + testpaths.join('\n'));

    async.eachSeries(testpaths, function (testpath, next) {
        var actualArgs = args.concat('--source=' + testpath);

        if (outdir) {
            actualArgs.push('--out=' + path.resolve(process.cwd(), outdir, path.basename(testpath).replace(/.js$/, '.json')));
        }

        log.info('Executing: ' + testpath);
        log.debug('Args: ' + actualArgs.join(' '));

        spawn(yb, actualArgs, {
            stdio: 'inherit'
        }).on('close', next);
    });
}

util.mix(exports, mods);

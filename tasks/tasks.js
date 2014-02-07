/**
 * grunt-watch-change
 * github://litiws/grunt-watch-change
 *
 * Copyright (c) 2014 Liti Team
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  var mapTask, watchchangeTask;

  function processDestFiles(task, files, timeout) {
    if (files.length === 0) {
      return;
    }

    var tag = '[' + task.name + ':' + task.target + '] ';
    grunt.log.writeln(tag +
      grunt.util.pluralize(files.length, 'File /Files ') +
      grunt.log.wordlist(files));

    grunt.config.set([task.name, task.target, 'filesDest'], files);

    var conf = processTemplate(task.data.setConfig);
    grunt.util.recurse(conf, function(str) {
      grunt.config.set(str, files);
    });

    if (conf.length) {
      grunt.log.writeln(tag + 'Set config ' + grunt.log.wordlist(conf));
    }

    var tasks = task.data.tasks;
    if (typeof tasks == 'function') {
      tasks = tasks.call(task, files);
    }

    if (tasks && files.length > 0) {
      tasks = tasks instanceof Array ? tasks : [tasks];

      // Note: Experiment, do not use timeout.
      if (!timeout) {
        grunt.task.run(tasks);

      } else {
        grunt.log.writeln(tag + 'Timeout: ' + timeout);
        setTimeout(function() {
          grunt.task.run(tasks);
        }, timeout);
      }

      grunt.log.writeln(tag + 'Run ' +
        grunt.util.pluralize(tasks.length, 'task/tasks') +
        ': ' + grunt.log.wordlist(tasks));
    }
  }

  function processTemplate(obj) {
    var a;

    if (typeof obj == 'object') {
      a = [];
      grunt.util.recurse([obj], function(str) {
        a.push(grunt.template.process(str));
      });
      return a;

    } else if (typeof obj == 'string') {
      a = grunt.template.process(obj);
      return [a];
    }

    return [];
  }


  /**
   * mapTask
   * Map source files to dest files and execute tasks.
   *
   * Processing order
   * - {Minimatch}     match
   * - {Function}      preprocess
   * - {Function}      prefilter
   * - {String|RegExp} replace, replaceBy
   * - {Function}      postprocess
   * - {Function}      postfilter
   */
  mapTask = function mapTask() {

    var options = this.options({
      replace: '',
      replaceBy: '',
      match: '',
      prefilter: function() {
        return true;
      },
      postfilter: function() {
        return true;
      },
      preprocess: function(f) {
        return f;
      },
      postprocess: function(f) {
        return f;
      },
      destConfig: [],
      tasks: [],
    });

    var data = grunt.util._.merge(options, this.data);
    var files = this.filesSrc;

    files = (!data.match) ? files :
      grunt.file.match(processTemplate(data.match), files);
    files = files.map(data.preprocess);
    files = files.filter(data.prefilter);
    files = (!data.replace) ? files :
      files.map(function(s) {
        return s.replace(data.replace, data.replaceBy);
      });
    files = files.map(data.postprocess);
    files = files.filter(data.postfilter);

    processDestFiles(this, files, 0);
  };


  /**
   * watchchangeTask
   * Watch file changes and execute tasks only on changed files.
   *
   * Processing order
   * - {Minimatch}     match
   * - {Function}      preprocess
   * - {Function}      prefilter
   * - {String|RegExp} replace, replaceBy
   * - {Function}      postprocess
   * - {Function}      postfilter
   */

  function watchchangeInit() {

    var listenners = {}, changedFile = {};

    var onChange = grunt.util._.debounce(function() {
      grunt.log.writeln('Changed ' +
        grunt.util.pluralize(changedFile.length, 'file /files ') +
        grunt.log.wordlist(Object.keys(changedFile)));

      grunt.event.emit('changed', changedFile);
      changedFile = {};
    }, 200);

    watchchangeTask = function watchchangeTask() {
      var self = this;
      var name = self.name;

      // In case user renames our task,
      //   we register watch listenner once for each name.
      if (!listenners[name]) {
        listenners[name] = {};
        grunt.event.on('watch', function(action, filepath, target) {
          changedFile[filepath] = {
            action: action,
            filepath: filepath,
            target: target
          };

          onChange();
        });
      }

      var options = this.options({
        replace: undefined,
        replaceBy: undefined,
        match: undefined,
        action: undefined,
        destConfig: [],
        tasks: [],
        prefilter: undefined,
        postfilter: undefined,
        preprocess: undefined,
        postprocess: undefined,
        timeout: 0
      });
      var data = grunt.util._.merge(options, this.data);

      var actions = {};
      if (typeof data.action == 'object') {
        for (var i in data.action) {
          action[data.action[i]] = true;
        }

      } else if (typeof data.action == 'string') {
        actions[data.action] = true;
      }

      // In case user calls our task many times, we only keep one listenner.
      var listenner = listenners[name][self.target] ?
        grunt.event.off('changed', listenner) : 0;

      grunt.event.on('changed', function(changed) {
        var i;

        var filenames = Object.keys(changed);
        filenames = !data.match ? filenames :
          grunt.file.match(processTemplate(data.match), filenames);

        var files = filenames.map(function(i) {
          return changed[i];
        });

        files = !data.action ? files : grunt.file.filter(function(f) {
          return actions[f.action];
        });

        files = !data.preprocess ? files :
          files.map(function(f) {
            return {
              filepath: data.preprocess(f.filepath, f.action, f.target),
              action: f.action,
              target: f.target
            };
          });

        files = !data.prefilter ? files :
          files.filter(function(f) {
            return data.prefilter(f.filepath, f.action, f.target);
          });

        files = !data.replace ? files :
          files.map(function(f) {
            return {
              filepath: f.filepath.replace(data.replace, data.replaceBy),
              action: f.action,
              target: f.target
            };
          });

        files = !data.postprocess ? files :
          files.map(function(f) {
            return {
              filepath: data.postprocess(f.filepath, f.action, f.target),
              action: f.action,
              target: f.target
            };
          });

        files = !data.postfilter ? files :
          files.filter(function(f) {
            return data.postfilter(f.filepath, f.action, f.target);
          });

        processDestFiles(self, files.map(function(f) {
          return f.filepath;
        }), options.timeout);

      });
    };
  }


  watchchangeInit();

  grunt.registerMultiTask('map',
    'Map source files to dest files and execute tasks.',
    mapTask);

  grunt.registerMultiTask('watchchange',
    'Watch for changed files, store in config object and run tasks. Only work with grunt-contrib-watch.',
    watchchangeTask);
};

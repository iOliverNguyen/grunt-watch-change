module.exports = function(grunt) {

  var path = require('path');

  var options = {
    match: ['**/*.*', '!**/*.*m*'],
    preprocess: function(name) {
      return '#' + name.replace(/^test\//, '');
    },
    prefilter: function(name) {
      return path.basename(name).length == 7;
    },
    replace: /\.txt$/,
    replaceBy: '.log',
    postprocess: function(name) {
      return path.dirname(name) + '/' + path.basename(name).slice(0, 5);
    },
    postfilter: function(name) {
      return path.basename(name).indexOf('o') >= 0;
    }
  };

  var sample = [
    'test/other/path/to/the/baz.txt',
    'test/path/to/foo.txt',
    'test/path/to/baz.out',
    'test/some/path/quaz.txt',
    'test/te.out',
    'test/to/foo.xml'
  ];

  var fields = ['match', 'preprocess', 'prefilter', 'replace',
    'replaceBy', 'postprocess', 'postfilter',
  ];

  var expects = {
    match: [
      'test/other/path/to/the/baz.txt',
      'test/path/to/foo.txt',
      'test/path/to/baz.out',
      'test/some/path/quaz.txt',
      'test/te.out',
    ],

    preprocess: [
      '#other/path/to/the/baz.txt',
      '#path/to/baz.out',
      '#path/to/foo.txt',
      '#some/path/quaz.txt',
      '#te.out',
    ],

    prefilter: [
      '#other/path/to/the/baz.txt',
      '#path/to/baz.out',
      '#path/to/foo.txt',
      '#te.out',
    ],

    replace: [
      '#other/path/to/the/baz.log',
      '#path/to/baz.out',
      '#path/to/foo.log',
      '#te.out',
    ],

    replaceBy: [
      '#other/path/to/the/baz.log',
      '#path/to/baz.out',
      '#path/to/foo.log',
      '#te.out',
    ],

    postprocess: [
      '#other/path/to/the/baz.l',
      '#path/to/baz.o',
      '#path/to/foo.l',
      './#te.o',
    ],

    postfilter: [
      '#path/to/baz.o',
      '#path/to/foo.l',
      './#te.o',
    ],
  };

  var store = {};
  var taskConfig = {
    clean: ['test'],

    map: {
      test: {
        src: 'test/**/*.*',
        replaceBy: '.log',
        tasks: function(files) {
          store['map-' + this.target] = files;
        }
      }
    },

    watchchange: {
      test: {
        src: 'test/**/*.*',
        replaceBy: '.log',
        tasks: function(files) {
          store['change-' + this.target] = files;
        }
      }
    }
  };


  var expect = require('chai').expect;

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadTasks('./tasks');
  grunt.initConfig(taskConfig);

  var mapTasks = ['init'];
  ['map', 'watchchange']
    .forEach(function(name) {
      (function initOptions() {
        for (var i in fields) {
          var fi = fields[i];
          var opts = {};
          for (var j = 0; j <= i; j++) {
            var fj = fields[j];
            opts[fj] = options[fj];
          }

          var task = {};
          var sample = taskConfig[name].test;
          for (var k in sample) {
            task[k] = sample[k];
          }
          task.options = opts;
          task.setConfig = [name + 'Dest', fi, 'src'].join('.');
          taskConfig[name][fi] = task;
        }
      })();

      fields.forEach(function(target) {
        mapTasks.push(name + ':' + target);
        mapTasks.push('done' + name + ':' + target);
      });
    });

  function dict(a) {
    o = {};
    a.forEach(function(f) {
      o[f] = true;
    });
    return o;
  }

  grunt.registerTask('init', function() {
    sample.forEach(function(filepath) {
      if (!grunt.file.exists(filepath)) {
        grunt.file.write(filepath, '');
      }
    });
  });

  grunt.registerTask('done' + 'map', function() {
    var target = this.args[0];
    var actual = grunt.config.get(['map', target, 'filesDest']);
    var config = grunt.config.get(['mapDest', target, 'src']);
    var called = store['map-' + target];
    var expected = expects[target];

    expect(expected).an('array');
    expect(actual).an('array');
    expect(config).an('array');
    expect(called).an('array');

    expect(dict(actual)).eql(dict(expected), 'map' + ':' + target);
    expect(dict(config)).eql(dict(expected), 'map' + ':' + target);
    expect(dict(called)).eql(dict(expected), 'map' + ':' + target);

    grunt.log.writeln('PASS '.cyan + 'map' + ':' + target);
  });

  grunt.registerTask('done' + 'watchchange', function() {
    var self = this;
    setTimeout(function() {
      var target = self.args[0];
      var actual = grunt.config.get(['watchchange', target, 'filesDest']);
      var config = grunt.config.get(['watchchangeDest', target, 'src']);
      var called = store['change-' + target];
      var expected = expects[target];

      expect(expected).an('array');
      expect(actual).an('array');
      expect(config).an('array');
      expect(called).an('array');

      expect(dict(actual)).eql(dict(expected), 'watchchange' + ':' + target);
      expect(dict(config)).eql(dict(expected), 'watchchange' + ':' + target);
      expect(dict(called)).eql(dict(expected), 'watchchange' + ':' + target);

      grunt.log.writeln('PASS '.cyan + 'watchchange' + ':' + target);
    }, 1000);
  });

  grunt.registerTask('wait', function() {
    var done = this.async();
    setTimeout(function() {
      done();
    }, 2000);
  });

  setTimeout(function() {
    for (var i in sample) {
      grunt.event.emit('watch', 'changed', sample[i], 'test');
    }
  }, 500);

  mapTasks.push('wait');
  grunt.registerTask('test', 'Run all tests', mapTasks);
  grunt.registerTask('default', 'Default task', ['test']);
};

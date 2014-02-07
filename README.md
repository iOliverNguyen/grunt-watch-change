# grunt-watch-change

> Execute tasks on files with some preprocessing options.


## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-watch-change --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-watch-change');
```


## Introduction

This add 2 tasks `map` and `watchchange`. `map` will map source files to dest files and execute tasks while `watchchange` will watch file changes and execute tasks only on changed files.


## Sample usage

```js
module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-watch-change');

  var taskConfig = {
    clean: {
      // You do not need to declare this config. It stays here just for clarification.
      coffee: {
        src: []
      }
    },

    // This will clean only generated .js files from .coffee files.
    map: {
      cleancoffee: {
        src: ['src/**/*.coffee'],
        replace: /\.coffee/,
        replaceBy: '.js',
        setConfig: ['clean.coffee.src'],
        tasks: ['clean:coffee']
      }
    },

    coffee: {

    },

    jshint: {

    },

    // This will watch changes on all files inside `src` directory.
    watch: {
      source: {
        files: ['src/**/*.*'],
        tasks: []
      }
    },

    // This will run tasks based on changed files.
    watchchange: {
      coffee: {
        match: ['src/**/*.coffee'],
        setConfig: ['coffee.changed.src'],
        tasks: ['coffee:changed']
      },

      js: {
        match: ['src/**/*.js'],
        setConfig: ['jshint.changed.src'],
        prefilter: notCoffee,
        tasks: ['jshint:changed']
      }
    }
  };

  // This will check whether input file is generated file or not.
  function notCoffee(file) {
    return !grunt.file.exists(file.replace(/\.js/, '.coffee'));
  };

  grunt.initConfig(taskConfig);

  // We must run `watchchange` task before `watch` task.
  grunt.registerTask('watching', ['watchchange', 'watch']);
}
```


## Options

### Basic options (both `map` and `watchchange`)
```js
- {String}         destConfig: Target config to set array of result files when done.
- {Array|Function} tasks: Array of tasks or a function which return an array of tasks. Tasks will be executed only if there are at least one file in result.
```

### Only `watchchange`
```js
- {String} action: One of "added", "deleted" or "changed". If it is not set, all files will be accepted.
```

### Processing options (both `map` and `watchchange`)

These options will be processed with following order.

```js
- {Minimatch}     match: Patern to match files.
- {Function}      preprocess: Function accepts a single file path and return new one.
- {Function}      prefilter: Function accepts a single file path and return true or false.
- {String|RegExp} replace, replaceBy: Replace file path with new one.
- {Function}      postprocess: Same as preprocess.
- {Function}      postfilter: Same as prefilter.
```

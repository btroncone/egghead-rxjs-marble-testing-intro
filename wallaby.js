module.exports = wallaby => ({
  files: [
    'src/**/*.ts',
    {pattern: 'spec/helpers/*.ts', instrument: false}
  ],

  tests: ['spec/**/*-spec.ts'],
  compilers: {
    '**/*.ts': wallaby.compilers.typeScript({
      module: 1,  // commonjs
      target: 1,  // ES5
    })
  }, 
  env: {
    type: 'node'
  },
  testFramework: 'jasmine',
  setup: function (wallaby) {
    require('./spec/helpers/test-helper'); 
    require('./spec/helpers/ajax-helper');
  }
});
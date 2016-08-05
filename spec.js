require('./spec/helpers/test-helper.ts')
const testContext = require.context('./spec', true, /\.spec\.ts/);
testContext.keys().forEach(testContext);
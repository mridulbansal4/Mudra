const { withProjectBuildGradle } = require('expo/config-plugins');

// Adds the official Nexconn Maven repository so ai.nexconn.chat:chat resolves
// even if Maven Central lags behind a Nexconn release.
const NEXCONN_MAVEN = 'maven { url "https://maven.nexconn.ai/repository/maven-releases/" }';

function withNexconnMaven(config) {
  return withProjectBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes('maven.nexconn.ai')) {
      const replaced = contents.replace(
        /(allprojects\s*\{\s*repositories\s*\{)/,
        `$1\n    ${NEXCONN_MAVEN}`,
      );
      if (replaced === contents) {
        throw new Error('withNexconnMaven: could not find allprojects { repositories { } } in android/build.gradle');
      }
      contents = replaced;
    }
    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = withNexconnMaven;

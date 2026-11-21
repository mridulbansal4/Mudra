const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

function withReleaseSigning(config) {
  config = withGradleProperties(config, (mod) => {
    const props = mod.modResults;
    const setProp = (key, value) => {
      const existing = props.find((p) => p.type === 'property' && p.key === key);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    setProp('org.gradle.jvmargs', '-Xmx6g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8');
    setProp('org.gradle.parallel', 'true');
    setProp('org.gradle.caching', 'true');
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    const releaseSigningBlock = `
        release {
            if (project.hasProperty('MUDRA_UPLOAD_STORE_FILE')) {
                storeFile file(MUDRA_UPLOAD_STORE_FILE)
                storePassword MUDRA_UPLOAD_STORE_PASSWORD
                keyAlias MUDRA_UPLOAD_KEY_ALIAS
                keyPassword MUDRA_UPLOAD_KEY_PASSWORD
            }
        }`;

    if (!contents.includes('CMAKE_OBJECT_PATH_MAX')) {
      contents = contents.replace(
        /(defaultConfig\s*\{[\s\S]*?versionName\s+"[^"]+")/,
        `$1\n        externalNativeBuild {\n            cmake {\n                arguments "-DCMAKE_OBJECT_PATH_MAX=220"\n            }\n        }`,
      );
      contents = contents.replace(
        /(signingConfigs\s*\{)/,
        `externalNativeBuild {\n        cmake {\n            buildStagingDirectory file("M:/.c")\n        }\n    }\n    $1`,
      );
    }

    if (!contents.includes('MUDRA_UPLOAD_STORE_FILE')) {
      contents = contents.replace(
        /signingConfigs\s*\{([\s\S]*?debug\s*\{[\s\S]*?\})/,
        `signingConfigs {$1${releaseSigningBlock}`,
      );

      contents = contents.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
        `$1signingConfig project.hasProperty('MUDRA_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });

  return config;
}

module.exports = withReleaseSigning;

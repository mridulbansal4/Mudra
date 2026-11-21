import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const patches = [
  {
    file: 'node_modules/expo/node_modules/@expo/cli/build/src/utils/findUp.js',
    target: `for(let dir = root; _path().default.dirname(dir) !== dir; dir = _path().default.dirname(dir)){
        const file = _path().default.resolve(dir, fileName);
        if (_fs().default.existsSync(file)) {
            return file;
        }
    }`,
    replacement: `let dir = root;
    while (true) {
        const file = _path().default.resolve(dir, fileName);
        if (_fs().default.existsSync(file)) {
            return file;
        }
        const parent = _path().default.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }`,
  },
  {
    file: 'node_modules/expo-modules-autolinking/build/exports.js',
    target: `for(let dir = cwd; _path().default.dirname(dir) !== dir; dir = _path().default.dirname(dir)){
        const file = _path().default.resolve(dir, 'package.json');
        if (_fs().default.existsSync(file)) {
            return file;
        }
    }`,
    replacement: `let dir = cwd;
    while (true) {
        const file = _path().default.resolve(dir, 'package.json');
        if (_fs().default.existsSync(file)) {
            return file;
        }
        const parent = _path().default.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }`,
  },
  {
    file: 'node_modules/expo-modules-autolinking/build/commands/autolinkingOptions.js',
    target: `for(let dir = root; _path().default.dirname(dir) !== dir; dir = _path().default.dirname(dir)){
        const file = _path().default.resolve(dir, 'package.json');
        if (_fs().default.existsSync(file)) {
            return file;
        }
    }`,
    replacement: `let dir = root;
    while (true) {
        const file = _path().default.resolve(dir, 'package.json');
        if (_fs().default.existsSync(file)) {
            return file;
        }
        const parent = _path().default.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }`,
  },
  {
    file: 'node_modules/expo-modules-autolinking/build/utils.js',
    target: `const maybeRealpath = async (target)=>{
    try {
        return await _fs().default.promises.realpath(target);
    } catch  {
        return null;
    }
};`,
    replacement: `const maybeRealpath = async (target)=>{
    try {
        const real = await _fs().default.promises.realpath(target);
        const resolved = _path().default.resolve(target);
        if (process.platform === 'win32' && resolved[0].toLowerCase() !== real[0].toLowerCase()) {
            return resolved;
        }
        return real;
    } catch  {
        return null;
    }
};`,
  },
  {
    file: 'node_modules/react-native-gesture-handler/android/CMakeLists.txt',
    target: `cmake_minimum_required(VERSION 3.13)
project(GestureHandlerCodegen)`,
    replacement: `cmake_minimum_required(VERSION 3.13)
set(CMAKE_OBJECT_PATH_MAX 220)
project(GestureHandlerCodegen)`,
  },
  {
    file: 'node_modules/tailwind-variants/package.json',
    target: `  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",`,
    replacement: `  "main": "./dist/config-entry.cjs",
  "module": "./dist/config-entry.js",
  "types": "./dist/config-entry.d.ts",`,
  },
];

for (const p of patches) {
  const fullPath = path.join(rootDir, p.file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(p.target)) {
      fs.writeFileSync(fullPath, content.replace(p.target, p.replacement), 'utf8');
      console.log(`Patched ${p.file} for Windows subst root drive support`);
    }
  }
}

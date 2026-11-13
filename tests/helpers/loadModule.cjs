// AI-assisted: see docs/AI_LOG.md #13
// Carga módulos ES del proyecto en Node (convirtiéndolos a CommonJS con
// Babel) para poder probarlos sin React Native. Las dependencias externas
// se reemplazan con los "mocks" recibidos; las importaciones relativas se
// cargan recursivamente desde src/.
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

function loadModule(filePath, mocks = {}, cache = new Map()) {
  const absolute = path.resolve(filePath);

  if (cache.has(absolute)) {
    return cache.get(absolute).exports;
  }

  const source = fs.readFileSync(absolute, 'utf8');
  const { code } = babel.transformSync(source, {
    filename: absolute,
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });

  const module = { exports: {} };
  cache.set(absolute, module);

  const localRequire = (specifier) => {
    if (Object.prototype.hasOwnProperty.call(mocks, specifier)) {
      return mocks[specifier];
    }

    if (specifier.startsWith('.')) {
      let target = path.resolve(path.dirname(absolute), specifier);

      if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
        target += '.js';
      }

      return loadModule(target, mocks, cache);
    }

    throw new Error(
      `Dependencia sin mock en la prueba: "${specifier}" (importada desde ${absolute})`
    );
  };

  new Function('require', 'module', 'exports', code)(
    localRequire,
    module,
    module.exports
  );

  return module.exports;
}

module.exports = { loadModule };

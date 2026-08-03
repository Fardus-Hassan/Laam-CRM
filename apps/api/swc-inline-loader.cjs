const { transformSync } = require('@swc/core');

module.exports = function swcInlineLoader(source) {
  const result = transformSync(source, {
    filename: this.resourcePath,
    sourceMaps: true,
    jsc: {
      parser: {
        syntax: 'typescript',
        decorators: true,
        dynamicImport: true,
      },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
      },
      target: 'es2021',
      keepClassNames: true,
    },
    module: {
      type: 'es6',
    },
  });

  if (this.sourceMap && result.map) {
    return this.callback(null, result.code, JSON.parse(result.map));
  }
  return result.code;
};

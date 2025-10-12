import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const minify = process.argv.includes('--minify');
const watch = process.argv.includes('--watch');

const pluginOptions = [
  typescript({ tsconfig: './tsconfig.addon.json' }),
  minify && terser()
].filter(Boolean);
const watchOptions = watch
  ? { include: 'src/ts/**', clearScreen: false }
  : undefined;

export default [
  // // Page scripts (ES modules)
  // {
  //   input: {
  //     options: 'src/ts/options.ts',
  //   },
  //   output: {
  //     dir: 'src/js',
  //     format: 'es'  // preserve ES module syntax
  //   },
  //   plugins: pluginOptions,
  //   watch: watchOptions,
  // },

  // Background & content scripts (bundled)
  {
    input: {
      copyright: 'src/ts/copyright.ts',
      // popup: 'src/ts/popup.ts',
      // background: path.resolve(__dirname, 'src/ts/background.ts'),
      // content: path.resolve(__dirname, 'src/ts/content.ts')
    },
    output: {
      dir: 'src/js',
      format: 'iife',  // fully bundled, standalone
      entryFileNames: '[name].js',
      // name: '[name]'   // global variable for IIFE if needed
    },
    plugins: pluginOptions,
    watch: watchOptions,
  },
  {
    input: 'src/ts/background.ts',
    output: {
      dir: 'src/js',
      format: 'iife',
    },
    plugins: pluginOptions,
    watch: watchOptions,
  },
  {
    input: 'src/ts/content.ts',
    output: {
      dir: 'src/js',
      format: 'iife',
    },
    plugins: pluginOptions,
    watch: watchOptions,
  },
  {
    input: 'src/ts/options.ts',
    output: {
      dir: 'src/js',
      format: 'iife',
    },
    plugins: pluginOptions,
    watch: watchOptions,
  },
  {
    input: 'src/ts/popup.ts',
    output: {
      dir: 'src/js',
      format: 'iife',
    },
    plugins: pluginOptions,
    watch: watchOptions,
  },
];

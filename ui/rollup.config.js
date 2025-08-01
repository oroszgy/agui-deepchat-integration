import { defineConfig } from 'rollup'
import vue from 'rollup-plugin-vue'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import esbuild from 'rollup-plugin-esbuild'
import postcss from 'rollup-plugin-postcss'

export default defineConfig({
  input: 'src/index.ts',
  external: ['vue', '@ag-ui/client', '@bufbuild/protobuf'],
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'named'
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      exports: 'named'
    }
  ],
  plugins: [
    vue({
      target: 'browser',
      preprocessStyles: false,
      template: {
        isProduction: true
      },
      style: {
        postcssModules: false
      }
    }),
    postcss({
      extract: false,
      inject: true
    }),
    nodeResolve({
      preferBuiltins: false
    }),
    commonjs(),
    esbuild({
      target: 'es2020',
      minify: false,
      tsconfig: './tsconfig.lib.json'
    })
  ]
})

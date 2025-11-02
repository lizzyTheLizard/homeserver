import terser from '@rollup/plugin-terser'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import sass from 'rollup-plugin-sass'

export default [
  {
    input: './build/index.js',
    output: {
      file: './dist/homeserver.bundle.js',
      sourcemap: true,
    },
    onwarn(warning) {
      if (warning.code !== 'THIS_IS_UNDEFINED') {
        console.error(`(!) ${warning.message}`)
      }
    },
    plugins: [
      nodeResolve(),
      sass({ output: './dist/style.css', api: 'modern' }),
      terser({
        ecma: 2021,
        module: true,
        mangle: {
          properties: {
            regex: /^__/,
          },
        },
      }),
    ],
  },
]

import resolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

export default [{
  input: 'src/service-worker.js',
  output: {
    file: 'service-worker.min.js',
    format: 'iife'
  },
  plugins: [
    resolve(),
    terser()
  ]
}]

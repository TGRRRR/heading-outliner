import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default'
  },
  external: ['obsidian', '@codemirror/state', '@codemirror/view', '@codemirror/language'],
  plugins: [
    typescript(),
    nodeResolve({browser: true}),
    commonjs(),
  ]
};
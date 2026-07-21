const path = require('path');

module.exports = {
  mode: 'development',
  target: 'electron-main',
  entry: './src/main/main.js',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'main.js'
  },
  externals: {
    'electron': 'commonjs electron',
    'path': 'commonjs path',
    'fs': 'commonjs fs',
    'chokidar': 'commonjs chokidar',
    'exifreader': 'commonjs exifreader',
    'sharp': 'commonjs sharp',
    'crypto': 'commonjs crypto'
  },
  resolve: {
    extensions: ['.js']
  },
  node: {
    __dirname: false,
    __filename: false
  },
  devtool: false
};
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  target: 'electron-renderer',
  entry: './src/renderer/index.js',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'app.js'
  },
  resolve: {
    extensions: ['.js']
  },
  externals: {
    'electron': 'commonjs electron'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html'
    })
  ]
};
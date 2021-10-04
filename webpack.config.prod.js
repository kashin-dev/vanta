const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
// const util = require('util')
const HtmlWebpackPlugin = require('html-webpack-plugin');

const srcFiles = fs.readdirSync('./src')

let entries = {
  'gallery/gallery.min': './src/gallery.js',
}

// Compile vanta.xxxxx.js files
for (let i = 0; i < srcFiles.length; i++) {
  let file = srcFiles[i]
  if (file.indexOf('vanta') == 0) {
    let fileWithoutExtension = file.replace(/\.[^/.]+$/, "")
    entries['dist/' + fileWithoutExtension + '.min'] = './src/' + file
  }
}

module.exports = {
  entry: entries,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'out'),
    library: '_vantaEffect',
    libraryTarget: 'umd',
    globalObject: 'typeof self !== \'undefined\' ? self : this',
  },
  resolve: {
    alias: {
      three$: 'three/build/three.min.js',
      'three/.*$': 'three',
      // don't need to register alias for every module
    },
  },
  module: {
    rules: [
      {test: /\.(glsl|frag|vert)$/, use: ['raw-loader', 'glslify-loader'], exclude: /node_modules/},
    ],
  },
  devServer: {
    hot: true,
    historyApiFallback: true
  },
  optimization: {
    usedExports: true,
    minimize: true
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery"
    }),
    new HtmlWebpackPlugin({
      filename: "./index.html",
      template: "./dist/index.html"
    }),
    new webpack.HotModuleReplacementPlugin() // Enable HMR
  ]
}

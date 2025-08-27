/* eslint-disable */
const customAlias = require('./alias');

const webpackConfig = {
    resolve: {
        extensions: ['.js', '.mjs', '.jsx', '.json'],
        alias: customAlias
    }
};

module.exports = webpackConfig;
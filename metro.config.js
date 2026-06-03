const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Support Firebase
config.resolver.sourceExts.push('mjs');

module.exports = withNativeWind(config, { input: "./global.css" });

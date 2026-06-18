module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Required for react-native-vision-camera frame processors (PPG heart-rate).
    // babel-preset-expo already injects reanimated's react-native-worklets plugin
    // last; the worklets-core plugin powers VisionCamera's frame-processor worklets.
    plugins: ["react-native-worklets-core/plugin"],
  };
};

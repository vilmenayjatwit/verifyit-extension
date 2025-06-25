const path = require("path");

module.exports = {
  mode: "production",               // or "development" while you’re iterating
  entry: {
    background: "./frontend/background.ts",
    content:    "./content.ts",
    popup:      "./frontend/popup.ts"
  },
  output: {
    path: path.resolve(__dirname, "frontend/dist"),
    filename: "[name].js"           // → background.js, content.js, popup.js
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  }
};

import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import json from "@rollup/plugin-json";

const IS_ELECTRON_PROD = process.env.ELECTRON_ENV && process.env.ELECTRON_ENV === "prod";

console.info('Building desktop bundle in "' + (IS_ELECTRON_PROD ? "production" : "development") + '" mode.');

const tsPlugin = typescript({
  tsconfig: "./tsconfig.json",
  include: ["./src/**/*.ts", "!./src/**/*.spec.ts", "./../appcore/modules/**/*.ts"]
});

module.exports = [
  {
    input: "./src/main.ts",
    output: [
      {
        file: "./dist/desktop.bundle.js",
        format: "cjs"
      }
    ],
    watch: {
      chokidar: false
    },
    external: [
      "electron",
      "fs",
      "os",
      "util",
      "http",
      "https",
      "url",
      "path",
      "crypto",
      "tls",
      "events",
      "tty",
      "child_process",
      "stream",
      "zlib"
    ],
    plugins: [
      tsPlugin,
      resolve({ preferBuiltins: true }),
      commonjs({
        ignore: ["assert"],
        sourceMap: false
      }),
      json(),
      IS_ELECTRON_PROD ? terser() : null
    ]
  },
  {
    input: "./src/pre-loading/pre-loader.ts",
    external: ["electron"],
    output: [
      {
        file: "./dist/pre-loader.js",
        format: "cjs"
      }
    ],
    plugins: [tsPlugin, IS_ELECTRON_PROD ? terser() : null]
  }
];

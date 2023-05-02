#!/usr/bin/env zx
/* eslint-disable @typescript-eslint/no-restricted-imports */
import "zx/globals";

const mainDistDir = path.resolve(__dirname, "../dist/main");

// be careful for any side effects in handlers.js
const moduleFile = await import(path.resolve(mainDistDir, "handlers.js"));

const meta = Object.entries(moduleFile.handlers).map(
  ([namespace, namespaceHandlers]) => {
    return [
      namespace,
      Object.keys(namespaceHandlers).map((handlerName) => handlerName),
    ];
  }
);

await fs.writeFile(
  path.resolve(mainDistDir, "handlers-meta.js"),
  `module.exports = ${JSON.stringify(meta)};`
);

console.log("generate handlers-meta.js done");

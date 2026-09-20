/**
 * 把 tsc 产出的 CommonJS 客户端产物打包成 DSH 客户端 ModuleLoader 形态。
 *
 * 输入：`.build/client.js`（以及它 require 的内部模块，如 `./config.js`）
 * 输出：`lib/client.cjs`
 *
 * 为什么需要它：DSH 的客户端 bundle 必须是
 *   `window.__ModuleLoader__.load({ id, factory: (require) => module.exports })`
 * 形态，而 tsc 直接产出的 `.js` 是普通 CJS 文件（顶层 `exports.apply = …`），
 * 不能被 DSH 加载。这里做三件事：
 *   1. 从入口递归收集内部模块（`./xxx.js`），打成一张模块表；
 *   2. 外部模块（`react`、`react/jsx-runtime` 等）透传给 DSH 的 `require`；
 *   3. 用 factory 包起来，返回入口的 `module.exports`。
 *
 * 纯文件读写，不调用子进程。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const BUILD_DIR = join(root, '.build')
const ENTRY = 'client.js'
const OUT_FILE = join(root, 'lib', 'client.cjs')

const PACKAGE_ID = 'dafy-whale-theme'

/** 把 `from` 模块里的相对 `spec` 归一化为模块表键；非相对返回 null（= 外部模块）。 */
function normalizeId(from, spec) {
  if (!spec.startsWith('.')) return null
  const dir = from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : ''
  const parts = []
  for (const segment of `${dir}${spec}`.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') parts.pop()
    else parts.push(segment)
  }
  return parts.join('/')
}

/** 递归收集入口依赖的所有内部模块源码。 */
async function collect(entryId, collected = new Map()) {
  if (collected.has(entryId)) return collected
  const source = await readFile(join(BUILD_DIR, entryId), 'utf8')
  collected.set(entryId, source)

  const specifiers = new Set()
  for (const match of source.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
    const id = normalizeId(entryId, match[1])
    if (id !== null) specifiers.add(id)
  }
  for (const id of specifiers) await collect(id, collected)
  return collected
}

function stripSourceMap(source) {
  return source.replace(/\/\/#\s*sourceMappingURL=.*$/gm, '').trimEnd()
}

const modules = await collect(ENTRY)
const entrySource = modules.get(ENTRY)
if (entrySource === undefined) throw new Error(`wrap-client: 入口 ${ENTRY} 未被收集`)

// 模块表：id -> 工厂函数源码。每个模块包在 function(module, exports, require) 里。
const table = [...modules.entries()]
  .map(([id, source]) => {
    const body = stripSourceMap(source)
      .split('\n')
      .map((line) => `      ${line}`)
      .join('\n')
    return `    ${JSON.stringify(id)}: function (module, exports, require) {\n${body}\n    },`
  })
  .join('\n')

const wrapper = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(PACKAGE_ID)},
  factory: (require) => {
    var modules = {
${table}
    };
    var cache = {};
    function normalizeId(from, spec) {
      if (spec.charAt(0) !== ".") return null;
      var dir = from.indexOf("/") === -1 ? "" : from.slice(0, from.lastIndexOf("/") + 1);
      var parts = [];
      var segments = (dir + spec).split("/");
      for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (segment === "" || segment === ".") continue;
        if (segment === "..") parts.pop();
        else parts.push(segment);
      }
      return parts.join("/");
    }
    function load(id) {
      if (Object.prototype.hasOwnProperty.call(cache, id)) return cache[id].exports;
      var module = { exports: {} };
      cache[id] = module;
      var localRequire = function (spec) {
        var resolved = normalizeId(id, spec);
        if (resolved !== null && Object.prototype.hasOwnProperty.call(modules, resolved)) {
          return load(resolved);
        }
        return require(spec);
      };
      modules[id].call(module.exports, module, module.exports, localRequire);
      return module.exports;
    }
    return load(${JSON.stringify(ENTRY)});
  },
});
`

await mkdir(join(root, 'lib'), { recursive: true })
await writeFile(OUT_FILE, wrapper, 'utf8')

const totalBytes = Buffer.byteLength(wrapper, 'utf8')
console.log(
  `[wrap-client] ${modules.size} 个模块 -> lib/client.cjs (${(totalBytes / 1024).toFixed(1)} KB)`,
)
console.log(`[wrap-client] 内部模块: ${[...modules.keys()].join(', ')}`)

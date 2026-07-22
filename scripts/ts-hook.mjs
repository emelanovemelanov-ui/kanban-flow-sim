import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

function exists(p) {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('file:') || specifier.startsWith('node:') || specifier.startsWith('data:')) {
    return nextResolve(specifier, context)
  }

  // Relative/absolute without extension → try .ts
  if ((specifier.startsWith('.') || path.isAbsolute(specifier)) && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(specifier)) {
    const parent = context.parentURL ? new URL(context.parentURL) : null
    const base = parent ? path.dirname(parent.pathname.replace(/^\/([A-Za-z]:)/, '$1')) : process.cwd()
    // On Windows file URLs need care
    let parentDir = process.cwd()
    if (context.parentURL) {
      parentDir = path.dirname(fileURLToPath(context.parentURL))
    }
    const asTs = path.resolve(parentDir, specifier + '.ts')
    if (exists(asTs)) {
      return nextResolve(pathToFileURL(asTs).href, context)
    }
  }

  return nextResolve(specifier, context)
}

function fileURLToPath(url) {
  return path.normalize(decodeURIComponent(new URL(url).pathname.replace(/^\/([A-Za-z]:)/, '$1')))
}

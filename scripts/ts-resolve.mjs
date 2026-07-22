export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    if (!/\.(ts|js|mjs|cjs|json)$/.test(specifier)) {
      try {
        return await nextResolve(specifier + '.ts', context)
      } catch {
        return nextResolve(specifier, context)
      }
    }
  }
  return nextResolve(specifier, context)
}

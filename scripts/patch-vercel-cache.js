import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const cacheRoute = {
  src: '/assets/(.*)',
  headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  continue: true,
}

export function patchVercelCache(config) {
  const routes = [...config.routes]
  const hitIndex = routes.findIndex((route) => route.handle === 'hit')
  if (hitIndex === -1) {
    routes.push({ handle: 'hit' }, cacheRoute)
  } else {
    const nextPhase = routes.findIndex((route, index) => index > hitIndex && route.handle)
    const end = nextPhase === -1 ? routes.length : nextPhase
    const alreadyPresent = routes
      .slice(hitIndex + 1, end)
      .some(
        (route) =>
          route.src === cacheRoute.src &&
          route.headers?.['Cache-Control'] === cacheRoute.headers['Cache-Control'] &&
          route.continue === true,
      )
    if (!alreadyPresent) routes.splice(end, 0, cacheRoute)
  }
  return { ...config, routes }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configPath = '.vercel/output/config.json'
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  await writeFile(configPath, `${JSON.stringify(patchVercelCache(config), null, 2)}\n`)
}

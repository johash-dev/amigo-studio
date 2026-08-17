// Port blocks are catalog-owned. First product: 4000/4001/5433. Next: +100 web, postgres +1.

export const WEB_START = 4000;
export const WEB_STEP = 100;
export const PG_START = 5433;

export function allocatePorts(projects = {}) {
  const usedWeb = new Set();
  for (const row of Object.values(projects)) {
    const web = row?.ports?.web;
    if (Number.isInteger(web)) usedWeb.add(web);
  }
  let web = WEB_START;
  while (usedWeb.has(web)) web += WEB_STEP;
  const index = (web - WEB_START) / WEB_STEP;
  return {
    web,
    api: web + 1,
    postgres: PG_START + index,
  };
}

export function applyCatalogEnv(ports, existingEnv = {}) {
  const env = { ...existingEnv };
  env.WEB_PORT = String(ports.web);
  env.API_PORT = String(ports.api);
  env.POSTGRES_PORT = String(ports.postgres);
  if (existingEnv.DATABASE_URL) {
    try {
      const url = new URL(existingEnv.DATABASE_URL);
      url.port = String(ports.postgres);
      env.DATABASE_URL = url.toString();
    } catch {
      env.DATABASE_URL = existingEnv.DATABASE_URL;
    }
  }
  return env;
}

/**
 * robots.txt según el estándar RFC 9309: lo que un sitio pide que los robots no lean.
 *
 * - Las reglas van en grupos encabezados por una o más líneas `User-agent`. Si hay un grupo
 *   para nuestro robot, vale ese (y solo ese); si no, el de `*`; si no hay ninguno, todo
 *   está permitido.
 * - Gana la regla más específica (el patrón más largo que coincide). Ante un empate, `Allow`.
 * - `*` coincide con cualquier secuencia y `$` al final ancla el final de la dirección.
 */

export interface RobotsRule {
  allow: boolean;
  pattern: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export interface RobotsRules {
  groups: RobotsGroup[];
}

export function parseRobots(text: string): RobotsRules {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  // Varias líneas User-agent seguidas comparten el grupo; una regla cierra el encabezado.
  let collectingAgents = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === 'user-agent') {
      if (!current || !collectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
    } else if (key === 'allow' || key === 'disallow') {
      collectingAgents = false;
      // Una regla antes de cualquier User-agent no pertenece a ningún grupo.
      if (!current) continue;
      // `Disallow:` vacío no prohíbe nada.
      if (value === '') continue;
      current.rules.push({ allow: key === 'allow', pattern: value });
    } else {
      // Otras claves (Sitemap, Crawl-delay) no cierran el grupo ni cuentan como reglas.
      collectingAgents = false;
    }
  }
  return { groups };
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${regex}${anchored ? '$' : ''}`).test(path);
}

/**
 * ¿Puede nuestro robot (`botToken`) leer `path` (camino y consulta, por ejemplo
 * `/nota/123?x=1`)? El robots.txt mismo siempre se puede leer.
 */
export function isAllowed(robots: RobotsRules, botToken: string, path: string): boolean {
  if (path === '/robots.txt') return true;
  const token = botToken.toLowerCase();
  const own = robots.groups.filter((g) => g.agents.includes(token));
  const applicable = own.length > 0 ? own : robots.groups.filter((g) => g.agents.includes('*'));
  let best: RobotsRule | null = null;
  for (const rule of applicable.flatMap((g) => g.rules)) {
    if (!matches(rule.pattern, path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
    ) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}

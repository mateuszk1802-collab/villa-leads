/**
 * Minimalny parser robots.txt (RFC 9309): grupy User-agent, Allow/Disallow,
 * wzorce z * i $, wygrywa najdłuższe dopasowanie, przy remisie Allow.
 */

export const BOT_TOKEN = "VillaLeadsBot";

type Rule = { allow: boolean; pattern: string };
type Group = { agents: string[]; rules: Rule[] };

export type Robots = { groups: Group[] };

export function parseRobots(text: string): Robots {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasAgent = false;
      if (!current) continue;
      // Pusty Disallow = wszystko dozwolone (ignorujemy regułę)
      if (value === "") continue;
      current.rules.push({ allow: key === "allow", pattern: value });
    } else {
      lastWasAgent = false;
    }
  }
  return { groups };
}

function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}

function rulesFor(robots: Robots, agent: string): Rule[] {
  const a = agent.toLowerCase();
  const specific = robots.groups.filter((g) => g.agents.some((x) => x !== "*" && a.includes(x)));
  if (specific.length) return specific.flatMap((g) => g.rules);
  return robots.groups.filter((g) => g.agents.includes("*")).flatMap((g) => g.rules);
}

/** Czy ścieżka (np. "/contact?x=1") jest dozwolona dla naszego bota. */
export function isAllowed(robots: Robots, path: string, agent = BOT_TOKEN): boolean {
  let best: Rule | null = null;
  for (const rule of rulesFor(robots, agent)) {
    if (!patternToRegex(rule.pattern).test(path)) continue;
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

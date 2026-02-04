import fs from "node:fs/promises";
import path from "node:path";

const shelvesDir = path.join(process.cwd(), "data", "lists");

function stripJsonComments(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/,\s*([}\]])/g, "$1");
}

function parseShelfFile(content, slug) {
  const parsed = JSON.parse(stripJsonComments(content));
  const lists = Array.isArray(parsed.lists) ? parsed.lists : [];

  return {
    slug,
    name: parsed.name || slug,
    overview: parsed.overview || "",
    lists: lists.map((list, listIndex) => ({
      key: `${slug}-${listIndex}`,
      name: list.name || `Раздел ${listIndex + 1}`,
      overview: list.overview || "",
      items: (Array.isArray(list.items) ? list.items : []).map((ref, itemIndex) => {
        const item = parseItemRef(ref);
        return {
          key: `${slug}-${listIndex}-${itemIndex}`,
          ref,
          ...item,
          href: item ? `/title/${item.type}/${item.id}` : null
        };
      })
    }))
  };
}

function parseItemRef(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(movie|tv)\/(\d+)$/);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

export async function getAllShelves() {
  let files = [];
  try {
    files = await fs.readdir(shelvesDir);
  } catch {
    return [];
  }

  const shelfFiles = files.filter((file) => file.endsWith(".json") || file.endsWith(".jsonc"));
  const loaded = await Promise.all(
    shelfFiles.map(async (file) => {
      const slug = file.replace(/\.jsonc?$/i, "");
      const content = await fs.readFile(path.join(shelvesDir, file), "utf8");
      const shelf = parseShelfFile(content, slug);

      const listsCount = shelf.lists.length;
      const itemsCount = shelf.lists.reduce((sum, list) => sum + list.items.length, 0);
      return {
        slug: shelf.slug,
        name: shelf.name,
        overview: shelf.overview,
        listsCount,
        itemsCount
      };
    })
  );

  return loaded.sort((a, b) => a.name.localeCompare(b.name, "ru-RU"));
}

export async function getShelfBySlug(slug) {
  const candidates = [`${slug}.jsonc`, `${slug}.json`];

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(path.join(shelvesDir, candidate), "utf8");
      return parseShelfFile(content, slug);
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

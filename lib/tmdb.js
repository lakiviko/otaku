const tmdbApiBase = "https://api.themoviedb.org/3";
const tmdbImageBase = "https://image.tmdb.org/t/p";

const detailCache = new Map();
const titleCardCache = new Map();
const DETAIL_TTL_MS = 10 * 60 * 1000;
const TITLE_CARD_TTL_MS = 30 * 60 * 1000;

export function normalizeLanguage(input) {
  const language = (input || "ru-RU").trim();
  return /^[a-z]{2}-[A-Z]{2}$/.test(language) ? language : "ru-RU";
}

export function normalizePage(input) {
  const page = Number(input);
  if (Number.isNaN(page) || page < 1) return 1;
  return Math.min(page, 50);
}

export function normalizeSeasonNumber(input) {
  const seasonNumber = Number(input);
  if (Number.isNaN(seasonNumber) || seasonNumber < 0) return null;
  return Math.min(Math.trunc(seasonNumber), 100);
}

export function sanitizeQuery(query) {
  if (!query) return "";
  return String(query).trim().slice(0, 120);
}

export function proxiedImage(pathValue, size = "w780") {
  if (!pathValue) return null;
  const safePath = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
  return `/api/image/${size}${safePath}`;
}

function mapMediaItem(item) {
  const type = item.media_type;
  if (type !== "movie" && type !== "tv" && type !== "person") return null;

  if (type === "person") {
    return {
      id: item.id,
      mediaType: "person",
      title: item.name,
      originalTitle: item.original_name || item.name,
      overview: item.known_for_department || "",
      year: null,
      rating: null,
      voteCount: null,
      popularity: item.popularity,
      posterPath: item.profile_path,
      backdropPath: null,
      genreIds: [],
      originCountries: [],
      knownForDepartment: item.known_for_department || null,
      knownFor: (item.known_for || [])
        .map((credit) => (credit.media_type === "movie" ? credit.title : credit.name))
        .filter(Boolean)
        .slice(0, 3)
    };
  }

  const title = type === "movie" ? item.title : item.name;
  const originalTitle = type === "movie" ? item.original_title : item.original_name;
  const releaseDate = type === "movie" ? item.release_date : item.first_air_date;
  const year = releaseDate ? releaseDate.slice(0, 4) : null;

  return {
    id: item.id,
    mediaType: type,
    title,
    originalTitle,
    overview: item.overview,
    year,
    rating: item.vote_average,
    voteCount: item.vote_count,
    popularity: item.popularity,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    genreIds: item.genre_ids || [],
    originCountries: item.origin_country || [],
    knownForDepartment: null,
    knownFor: []
  };
}

function mapDetails(type, payload) {
  const releaseInfo =
    type === "movie"
      ? payload.release_dates?.results?.find((item) => item.iso_3166_1 === "RU") || payload.release_dates?.results?.[0]
      : payload.content_ratings?.results?.find((item) => item.iso_3166_1 === "RU") || payload.content_ratings?.results?.[0];

  const certification =
    type === "movie"
      ? releaseInfo?.release_dates?.[0]?.certification || null
      : releaseInfo?.rating || null;

  const seasons =
    type === "tv"
      ? (payload.seasons || []).map((season) => ({
          id: season.id,
          name: season.name,
          seasonNumber: season.season_number,
          episodeCount: season.episode_count,
          airDate: season.air_date,
          overview: season.overview,
          rating: season.vote_average,
          poster: proxiedImage(season.poster_path, "w342")
        }))
      : [];

  return {
    id: payload.id,
    mediaType: type,
    title: type === "movie" ? payload.title : payload.name,
    originalTitle: type === "movie" ? payload.original_title : payload.original_name,
    tagline: payload.tagline,
    overview: payload.overview,
    runtime: type === "movie" ? payload.runtime : null,
    episodeRunTime: type === "tv" ? payload.episode_run_time || [] : [],
    seasonsCount: type === "tv" ? payload.number_of_seasons : null,
    episodesCount: type === "tv" ? payload.number_of_episodes : null,
    seasons,
    status: payload.status,
    releaseDate: type === "movie" ? payload.release_date : payload.first_air_date,
    endDate: type === "tv" ? payload.last_air_date : null,
    genres: payload.genres || [],
    countries: payload.production_countries || [],
    rating: payload.vote_average,
    voteCount: payload.vote_count,
    certification,
    poster: proxiedImage(payload.poster_path, "w780"),
    backdrop: proxiedImage(payload.backdrop_path, "w1280"),
    cast: (payload.credits?.cast || []).slice(0, 8).map((person) => ({
      id: person.id,
      name: person.name,
      character: person.character,
      profile: proxiedImage(person.profile_path, "w185")
    })),
    popularMedia: {
      videos: (payload.videos?.results || [])
        .filter((video) => video.site === "YouTube")
        .sort((a, b) => Number(b.official) - Number(a.official) || Number(b.size || 0) - Number(a.size || 0))
        .slice(0, 6)
        .map((video) => ({
          id: video.id,
          name: video.name,
          type: video.type,
          youtubeUrl: `https://www.youtube.com/watch?v=${video.key}`
        })),
      backdrops: (payload.images?.backdrops || []).slice(0, 8).map((image) => ({
        image: proxiedImage(image.file_path, "w780"),
        width: image.width,
        height: image.height
      }))
    },
    recommendations: (payload.recommendations?.results || []).slice(0, 12).map((item) => ({
      id: item.id,
      mediaType: type,
      title: type === "movie" ? item.title : item.name,
      year: (type === "movie" ? item.release_date : item.first_air_date || "").slice(0, 4) || null,
      rating: item.vote_average,
      poster: proxiedImage(item.poster_path, "w342")
    }))
  };
}

function mapSeasonDetails(payload) {
  return {
    id: payload.id,
    name: payload.name,
    seasonNumber: payload.season_number,
    overview: payload.overview,
    airDate: payload.air_date,
    episodeCount: payload.episode_count,
    poster: proxiedImage(payload.poster_path, "w500"),
    episodes: (payload.episodes || []).map((episode) => ({
      id: episode.id,
      episodeNumber: episode.episode_number,
      name: episode.name,
      airDate: episode.air_date,
      runtime: typeof episode.runtime === "number" ? episode.runtime : null,
      overview: episode.overview,
      still: proxiedImage(episode.still_path, "w300")
    }))
  };
}

export async function tmdbFetch(endpoint, params = {}) {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    throw new Error("Missing TMDB_API_KEY in environment.");
  }

  const url = new URL(`${tmdbApiBase}${endpoint}`);
  url.searchParams.set("api_key", tmdbApiKey);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`TMDB request failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }
  return response.json();
}

export async function searchTitles({ query, language, page }) {
  const payload = await tmdbFetch("/search/multi", {
    query,
    include_adult: false,
    language,
    page
  });

  const mapped = (payload.results || [])
    .map(mapMediaItem)
    .filter(Boolean)
    .slice(0, 20)
    .map((item) => ({
      ...item,
      poster: proxiedImage(item.posterPath, item.mediaType === "person" ? "w300" : "w500"),
      backdrop: proxiedImage(item.backdropPath, "w780")
    }));

  return {
    page: payload.page,
    totalPages: payload.total_pages,
    totalResults: payload.total_results,
    results: mapped
  };
}

export async function getTitleDetails({ type, id, language }) {
  const cacheKey = `${type}:${id}:${language}`;
  const cached = detailCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.createdAt < DETAIL_TTL_MS) {
    return { ...cached.data, cache: "memory" };
  }

  const append = type === "movie" ? "credits,images,videos,release_dates,recommendations" : "credits,images,videos,content_ratings,recommendations";
  const payload = await tmdbFetch(`/${type}/${id}`, {
    language,
    append_to_response: append,
    include_image_language: `${language.split("-")[0]},en,null`
  });

  const data = mapDetails(type, payload);
  detailCache.set(cacheKey, { data, createdAt: now });
  return { ...data, cache: "none" };
}

export async function getSeasonDetails({ id, seasonNumber, language }) {
  const payload = await tmdbFetch(`/tv/${id}/season/${seasonNumber}`, { language });
  return mapSeasonDetails(payload);
}

function parseTitleRef(ref) {
  const text = String(ref || "").trim();
  const match = text.match(/^(movie|tv)\/(\d+)$/);
  if (!match) return null;
  return { type: match[1], id: Number(match[2]) };
}

async function getTitleCardByRef(ref, language) {
  const parsed = parseTitleRef(ref);
  if (!parsed) return null;

  const cacheKey = `${parsed.type}:${parsed.id}:${language}`;
  const cached = titleCardCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.createdAt < TITLE_CARD_TTL_MS) {
    return cached.data;
  }

  try {
    const payload = await tmdbFetch(`/${parsed.type}/${parsed.id}`, { language });
    const date = parsed.type === "movie" ? payload.release_date : payload.first_air_date;
    const title = parsed.type === "movie" ? payload.title : payload.name;

    const data = {
      ref,
      type: parsed.type,
      id: parsed.id,
      title: title || ref,
      year: (date || "").slice(0, 4) || null,
      rating: payload.vote_average || null,
      poster: proxiedImage(payload.poster_path, "w500"),
      href: `/title/${parsed.type}/${parsed.id}`
    };

    titleCardCache.set(cacheKey, { data, createdAt: now });
    return data;
  } catch {
    return null;
  }
}

export async function getTitleCardsByRefs(refs, language = "ru-RU") {
  const uniqueRefs = [...new Set((refs || []).map((ref) => String(ref || "").trim()))].filter(Boolean);
  const cards = await Promise.all(uniqueRefs.map((ref) => getTitleCardByRef(ref, language)));
  return new Map(cards.filter(Boolean).map((card) => [card.ref, card]));
}

export async function getTitleCast({ type, id, language }) {
  const titlePayload = await tmdbFetch(`/${type}/${id}`, { language });
  const creditsPayload =
    type === "tv"
      ? await tmdbFetch(`/tv/${id}/aggregate_credits`, { language })
      : await tmdbFetch(`/movie/${id}/credits`, { language });

  const cast =
    type === "tv"
      ? (creditsPayload.cast || [])
          .map((person) => ({
            id: person.id,
            name: person.name,
            character: person.roles?.[0]?.character || null,
            profile: proxiedImage(person.profile_path, "w185"),
            episodes: person.total_episode_count || 0,
            order: person.order ?? Number.MAX_SAFE_INTEGER
          }))
          .sort((a, b) => a.order - b.order || b.episodes - a.episodes)
      : (creditsPayload.cast || [])
          .map((person) => ({
            id: person.id,
            name: person.name,
            character: person.character || null,
            profile: proxiedImage(person.profile_path, "w185"),
            order: person.order ?? Number.MAX_SAFE_INTEGER
          }))
          .sort((a, b) => a.order - b.order);

  return {
    id,
    mediaType: type,
    title: type === "movie" ? titlePayload.title : titlePayload.name,
    cast: cast.slice(0, 80)
  };
}

export async function getPersonDetails({ id, language }) {
  const payload = await tmdbFetch(`/person/${id}`, {
    language,
    append_to_response: "combined_credits,images,external_ids"
  });

  // Fallback to English bio if localized biography is empty.
  let biography = payload.biography || "";
  if (!biography) {
    try {
      const englishPayload = await tmdbFetch(`/person/${id}`, { language: "en-US" });
      biography = englishPayload.biography || "";
    } catch {
      // Keep empty biography if fallback fails.
    }
  }

  const credits = (payload.combined_credits?.cast || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) => {
      const mediaType = item.media_type;
      const title = mediaType === "movie" ? item.title : item.name;
      const date = mediaType === "movie" ? item.release_date : item.first_air_date;
      return {
        id: item.id,
        mediaType,
        title,
        year: (date || "").slice(0, 4) || null,
        character: item.character || null,
        popularity: item.popularity || 0,
        poster: proxiedImage(item.poster_path, "w342")
      };
    })
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 24);

  return {
    id: payload.id,
    name: payload.name,
    originalName: payload.also_known_as?.[0] || payload.name,
    biography,
    knownForDepartment: payload.known_for_department || null,
    birthday: payload.birthday || null,
    deathday: payload.deathday || null,
    placeOfBirth: payload.place_of_birth || null,
    profile: proxiedImage(payload.profile_path, "w500"),
    profiles: (payload.images?.profiles || []).slice(0, 10).map((item) => proxiedImage(item.file_path, "w300")),
    external: {
      instagram: payload.external_ids?.instagram_id || null,
      twitter: payload.external_ids?.twitter_id || null,
      tiktok: payload.external_ids?.tiktok_id || null,
      youtube: payload.external_ids?.youtube_id || null,
      imdb: payload.external_ids?.imdb_id || null
    },
    credits
  };
}

export async function getProxiedImage(pathParts) {
  const imagePath = `/${pathParts.join("/")}`;
  if (!imagePath.match(/^\/[a-z0-9]+\/.+/i)) {
    const error = new Error("invalid image path");
    error.status = 400;
    throw error;
  }

  const [requestedSize, ...rest] = pathParts;
  let upstream = await fetchImageByPath(imagePath);

  // Some TMDB images are missing in specific sizes; fallback to original.
  if (!upstream.ok && upstream.status === 404 && requestedSize !== "original") {
    const originalPath = `/original/${rest.join("/")}`;
    upstream = await fetchImageByPath(originalPath);
  }

  if (!upstream.ok) {
    const error = new Error(`image fetch failed (${upstream.status})`);
    error.status = upstream.status;
    throw error;
  }

  const data = Buffer.from(await upstream.arrayBuffer());
  const upstreamType = upstream.headers.get("content-type");

  return {
    data,
    contentType: upstreamType || "application/octet-stream",
    cacheHeader: "bypass"
  };
}

async function fetchImageByPath(imagePath) {
  const sourceUrl = `${tmdbImageBase}${imagePath}`;
  return fetch(sourceUrl, {
    headers: {
      Accept: "image/*"
    }
  });
}

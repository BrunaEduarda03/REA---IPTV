import type { TmdbMetadata } from "@saimotv/shared";

const TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie";
const TMDB_GENRE_LIST_URL = "https://api.themoviedb.org/3/genre/movie/list";
/** Base oficial de imagens do TMDB, conforme a documentação pública do
 * endpoint `/configuration` (`secure_base_url` + tamanhos disponíveis) —
 * hardcoded de propósito: é um valor publicado e estável há anos, e buscar
 * `/configuration` a cada requisição só adicionaria uma chamada de rede
 * sem nenhum ganho real (ver ADR-027). `w780` para imagens de paisagem
 * (fundo), `w342` para pôster (retrato) — tamanhos intermediários
 * recomendados pela própria documentação para cards de listagem. */
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TmdbSearchResultItem {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  release_date: string | null;
  genre_ids: number[];
  vote_average: number | null;
}

interface TmdbSearchResponse {
  results: TmdbSearchResultItem[];
}

interface TmdbGenreListResponse {
  genres: { id: number; name: string }[];
}

/**
 * Cache em memória, por processo: o catálogo é estático (fixtures), então
 * a mesma busca (`title`+`year`) sempre devolveria o mesmo resultado — não
 * há motivo para repetir a chamada de rede a cada requisição à API própria.
 * Reinicia quando o processo reinicia (nenhuma persistência necessária).
 */
const searchCache = new Map<string, TmdbMetadata | null>();

/** Cache separado para o mapa de gêneros (id → nome): é um endpoint
 * praticamente estático do TMDB (a lista de gêneros não muda na prática),
 * então uma única busca por processo basta — nunca por `título|ano`. */
const genreMapCache = new Map<string, Record<number, string>>();

/**
 * Busca o mapa `{ id: nome }` de gêneros de filme do TMDB, no idioma
 * pedido. Nunca lança: qualquer falha devolve um mapa vazio (os filmes
 * simplesmente aparecem sem gênero, em vez de a aplicação quebrar).
 */
async function getGenreMap(apiKey: string, language: string): Promise<Record<number, string>> {
  const cached = genreMapCache.get(language);
  if (cached) return cached;

  try {
    const url = new URL(TMDB_GENRE_LIST_URL);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", language);

    const response = await fetch(url);
    if (!response.ok) return {};

    const data = (await response.json()) as TmdbGenreListResponse;
    const map = Object.fromEntries(data.genres.map((genre) => [genre.id, genre.name]));
    genreMapCache.set(language, map);
    return map;
  } catch {
    return {};
  }
}

/**
 * Busca um filme real na API pública do TMDB (themoviedb.org) por nome e
 * ano de lançamento. `apiKey` é recebido como parâmetro (nunca lido de
 * `process.env` diretamente aqui) de propósito: mantém esta função pura o
 * suficiente para ser testada sem mockar módulo nenhum, só o `fetch` global
 * — e deixa explícito, em qualquer lugar que a chama, que o comportamento
 * depende de uma chave que pode ou não existir.
 *
 * NUNCA lança: ausência de chave, erro de rede, resposta não-OK, ou busca
 * sem resultado devolvem `null` — o catálogo sempre continua funcionando
 * com os dados fictícios de fallback (ver ADR-024).
 */
export async function searchMovie(
  apiKey: string | undefined,
  title: string,
  year: number,
): Promise<TmdbMetadata | null> {
  if (!apiKey) return null;

  const cacheKey = `${title}|${year}`;
  const cached = searchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const result = await fetchFromTmdb(apiKey, title, year);
  searchCache.set(cacheKey, result);
  return result;
}

async function fetchFromTmdb(apiKey: string, title: string, year: number): Promise<TmdbMetadata | null> {
  try {
    const url = new URL(TMDB_SEARCH_URL);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", title);
    url.searchParams.set("year", String(year));
    url.searchParams.set("language", "pt-BR");

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as TmdbSearchResponse;
    const match = data.results?.[0];
    if (!match) return null;

    const genreMap = await getGenreMap(apiKey, "pt-BR");
    const genres = (match.genre_ids ?? []).map((id) => genreMap[id]).filter((name): name is string => Boolean(name));

    // Caso real encontrado em verificação manual: a tradução comunitária da
    // sinopse para pt-BR às vezes não existe, e o TMDB devolve `overview: ""`
    // em vez de omitir o campo. Uma sinopse em inglês ainda é dado real —
    // melhor que string vazia (ver ADR-025/ADR-026).
    const overview = match.overview || (await fetchEnglishOverview(apiKey, match.id));

    return {
      tmdbId: match.id,
      title: match.title,
      overview,
      backdropUrl: match.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${match.backdrop_path}` : null,
      posterUrl: match.poster_path ? `${TMDB_IMAGE_BASE}/w342${match.poster_path}` : null,
      releaseYear: match.release_date ? Number(match.release_date.slice(0, 4)) : null,
      genres,
      rating: typeof match.vote_average === "number" && match.vote_average > 0 ? match.vote_average : null,
    };
  } catch {
    // Rede indisponível, DNS, timeout, JSON inválido — qualquer falha aqui
    // é "não encontrado" do ponto de vista do catálogo, nunca um erro 500.
    return null;
  }
}

/** Busca só a sinopse em inglês (cobertura bem mais completa no TMDB do
 * que pt-BR) quando a tradução em português vier vazia. Nunca lança — uma
 * falha aqui só significa que a sinopse continua vazia, não impede o resto
 * dos metadados (pôster, ano, gênero) de aparecer. */
async function fetchEnglishOverview(apiKey: string, tmdbId: number): Promise<string> {
  try {
    const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
    url.searchParams.set("api_key", apiKey);

    const response = await fetch(url);
    if (!response.ok) return "";

    const data = (await response.json()) as { overview?: string };
    return data.overview ?? "";
  } catch {
    return "";
  }
}

export interface MovieSeed {
  /** Id interno estável, nunca o id do TMDB (ver movieSchema). */
  id: string;
  /** Stream público de demonstração que o player de fato reproduz — todas
   * produções Creative Commons da Blender Foundation (ou hospedadas pelo
   * Internet Archive sob a mesma licença), nunca IPTV ou conteúdo
   * protegido (ver AGENTS.md, item 15, e ADR-026). */
  streamUrl: string;
  /** Nome/ano exatos para a busca na API do TMDB (ver tmdbClient.ts). */
  tmdbQuery: { title: string; year: number };
}

/**
 * Todo o "catálogo real" desta aplicação — de propósito, uma lista curta e
 * 100% verificável (cada entrada é um filme Creative Commons real, que
 * qualquer pessoa pode conferir). Adicionar um filme aqui é a ÚNICA mudança
 * de código necessária para ele aparecer em `/filmes` com dados reais
 * (gênero, pôster, sinopse, ano) — o resto (busca, enriquecimento, rotas)
 * já está pronto para qualquer entrada nova.
 */
export const movieSeeds: MovieSeed[] = [
  {
    id: "big-buck-bunny",
    streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    tmdbQuery: { title: "Big Buck Bunny", year: 2008 },
  },
  {
    id: "tears-of-steel",
    streamUrl: "https://test-streams.mux.dev/tos_ismc/main.m3u8",
    tmdbQuery: { title: "Tears of Steel", year: 2012 },
  },
  {
    id: "sintel",
    streamUrl: "https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4",
    tmdbQuery: { title: "Sintel", year: 2010 },
  },
  {
    id: "elephants-dream",
    streamUrl: "https://archive.org/download/ElephantsDream/ed_1024.mp4",
    tmdbQuery: { title: "Elephants Dream", year: 2006 },
  },
];

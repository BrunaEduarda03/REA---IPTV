/**
 * Mídia de demonstração pública — nenhuma delas é conteúdo de TV/IPTV, nem
 * pertence ao Saimo TV. São streams de teste mantidos publicamente
 * especificamente para desenvolvimento de players de vídeo (amplamente
 * referenciados pela própria documentação oficial do hls.js como exemplos):
 *
 * - `x36xhzz`/`pts_shift`/`tos_ismc` são hospedados pela Mux
 *   (test-streams.mux.dev) exatamente para esse fim.
 *
 * Catálogos de IPTV, TV ao vivo real ou qualquer conteúdo protegido estão
 * permanentemente fora do escopo deste laboratório (ver AGENTS.md, item 15,
 * e `docs/implementation/backlog.md`, seção "Deliberadamente excluído") —
 * isto não é um recurso "a implementar depois", é uma fronteira ética fixa.
 */
const DEMO_STREAMS_BY_CATEGORY: Record<string, string> = {
  "cat-01": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", // Documentários
  "cat-02": "https://test-streams.mux.dev/pts_shift/master.m3u8", // Esportes
  "cat-03": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", // Infantil
  "cat-04": "https://test-streams.mux.dev/pts_shift/master.m3u8", // Notícias
  "cat-05": "https://test-streams.mux.dev/tos_ismc/main.m3u8", // Ficção & Séries
};

const FALLBACK_DEMO_STREAM_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

/**
 * Função pura: dado o id de categoria de um canal, devolve qual stream de
 * demonstração usar. Categorias diferentes apontam para streams diferentes
 * — é o que faz o catálogo parecer de fato variado ao navegar entre
 * categorias, em vez de tudo tocar exatamente o mesmo vídeo (como era até
 * a Sprint 05). Dentro de uma mesma categoria, todo canal "available"
 * ainda compartilha a mesma demonstração — o objetivo deste laboratório é
 * a MECÂNICA de reprodução (seleção de motor, troca de fonte, erro), não
 * simular um catálogo de vídeos únicos por canal.
 */
export function getDemoStreamUrl(categoryId: string): string {
  return DEMO_STREAMS_BY_CATEGORY[categoryId] ?? FALLBACK_DEMO_STREAM_URL;
}

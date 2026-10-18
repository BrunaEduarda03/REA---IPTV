import type { Category, Channel } from "@saimotv/shared";

/**
 * Dados 100% fictícios, autorais, criados para este laboratório educacional.
 * Nenhum nome, descrição ou imagem aqui vem do Saimo TV original ou de
 * qualquer lista real de canais/IPTV — ver AGENTS.md, item 14, e as regras
 * da Fase 05 sobre não reutilizar dados do alvo investigado.
 */
export const categoryFixtures: Category[] = [
  {
    id: "cat-01",
    name: "Documentários",
    slug: "documentarios",
    description: "Produções originais sobre natureza, ciência e história.",
  },
  {
    id: "cat-02",
    name: "Esportes",
    slug: "esportes",
    description: "Competições amadoras, modalidades alternativas e análises.",
  },
  {
    id: "cat-03",
    name: "Infantil",
    slug: "infantil",
    description: "Conteúdo educativo e de entretenimento para crianças.",
  },
  {
    id: "cat-04",
    name: "Notícias",
    slug: "noticias",
    description: "Cobertura diária de atualidades locais e internacionais.",
  },
  {
    id: "cat-05",
    name: "Ficção & Séries",
    slug: "ficcao-series",
    description: "Dramas, comédias e suspenses originais em capítulos.",
  },
];

const thumbnailByCategory: Record<string, string> = {
  "cat-01": "/thumbnails/documentarios.svg",
  "cat-02": "/thumbnails/esportes.svg",
  "cat-03": "/thumbnails/infantil.svg",
  "cat-04": "/thumbnails/noticias.svg",
  "cat-05": "/thumbnails/ficcao-series.svg",
};

interface ChannelSeed {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  isFeatured?: boolean;
  status?: Channel["status"];
}

const channelSeeds: ChannelSeed[] = [
  // Documentários
  {
    id: "ch-01",
    name: "Horizonte Azul",
    description: "Expedições e vida selvagem ao redor do mundo, em produções originais sobre biodiversidade.",
    categoryId: "cat-01",
    isFeatured: true,
  },
  {
    id: "ch-02",
    name: "Raízes",
    description: "Histórias de comunidades e tradições culturais pouco contadas.",
    categoryId: "cat-01",
  },
  {
    id: "ch-03",
    name: "Ciência Viva",
    description: "Descobertas científicas explicadas de forma acessível, com especialistas convidados.",
    categoryId: "cat-01",
  },
  {
    id: "ch-04",
    name: "Arquivo Histórico",
    description: "Revisitas a grandes eventos do século XX através de registros e relatos.",
    categoryId: "cat-01",
    status: "coming_soon",
  },

  // Esportes
  {
    id: "ch-05",
    name: "Pulso Esportivo",
    description: "Cobertura de competições amadoras e eventos locais de diversas modalidades.",
    categoryId: "cat-02",
    isFeatured: true,
  },
  {
    id: "ch-06",
    name: "Arena Livre",
    description: "Transmissões de esportes de aventura e modalidades alternativas.",
    categoryId: "cat-02",
  },
  {
    id: "ch-07",
    name: "Replay Total",
    description: "Melhores momentos e análises táticas das partidas da semana.",
    categoryId: "cat-02",
  },
  {
    id: "ch-08",
    name: "Corrida Nacional",
    description: "Acompanhamento de campeonatos de atletismo e corridas de rua.",
    categoryId: "cat-02",
  },

  // Infantil
  {
    id: "ch-09",
    name: "Mundo Pequeno",
    description: "Desenhos educativos originais pensados para a primeira infância.",
    categoryId: "cat-03",
    isFeatured: true,
  },
  {
    id: "ch-10",
    name: "Fábrica de Histórias",
    description: "Contos ilustrados narrados para estimular o gosto pela leitura.",
    categoryId: "cat-03",
  },
  {
    id: "ch-11",
    name: "Aventura Kids",
    description: "Série de aventuras com personagens que ensinam sobre o meio ambiente.",
    categoryId: "cat-03",
  },
  {
    id: "ch-12",
    name: "Risadinha",
    description: "Programa de humor e brincadeiras para crianças em idade escolar.",
    categoryId: "cat-03",
    status: "unavailable",
  },

  // Notícias
  {
    id: "ch-13",
    name: "Jornal Agora",
    description: "Resumo diário dos principais acontecimentos, direto e objetivo.",
    categoryId: "cat-04",
    isFeatured: true,
  },
  {
    id: "ch-14",
    name: "Economia Clara",
    description: "Análises de economia explicadas em linguagem simples.",
    categoryId: "cat-04",
  },
  {
    id: "ch-15",
    name: "Mundo em Foco",
    description: "Cobertura de eventos internacionais sob múltiplas perspectivas.",
    categoryId: "cat-04",
  },
  {
    id: "ch-16",
    name: "Cidade Ativa",
    description: "Notícias locais e serviços de utilidade pública.",
    categoryId: "cat-04",
    status: "coming_soon",
  },

  // Ficção & Séries
  {
    id: "ch-17",
    name: "Estação Nova",
    description: "Drama original sobre reencontros em uma pequena cidade litorânea.",
    categoryId: "cat-05",
    isFeatured: true,
  },
  {
    id: "ch-18",
    name: "Código Aberto",
    description: "Ficção científica sobre uma equipe que descobre algo inesperado em seu próprio sistema.",
    categoryId: "cat-05",
  },
  {
    id: "ch-19",
    name: "Noites de Verão",
    description: "Comédia romântica contada em capítulos curtos.",
    categoryId: "cat-05",
  },
  {
    id: "ch-20",
    name: "Fronteira Silenciosa",
    description: "Suspense original ambientado em uma estação de pesquisa isolada.",
    categoryId: "cat-05",
  },
];

export const channelFixtures: Channel[] = channelSeeds.map((seed) => ({
  id: seed.id,
  name: seed.name,
  description: seed.description,
  categoryId: seed.categoryId,
  thumbnail: thumbnailByCategory[seed.categoryId] ?? "/thumbnails/documentarios.svg",
  isFeatured: seed.isFeatured ?? false,
  status: seed.status ?? "available",
}));

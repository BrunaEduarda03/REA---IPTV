import type { Category, Channel } from "@saimotv/shared";
import { categoryFixtures, channelFixtures } from "./catalog.fixtures";

/**
 * Abstração de acesso a dados do catálogo. Hoje é só um array em memória;
 * a interface (as três funções abaixo) é desenhada para já ser o contrato
 * que uma versão futura com Drizzle + PostgreSQL implementaria igual —
 * ver docs/implementation/decisions.md (ADR sobre a troca futura) para o
 * raciocínio completo.
 *
 * Por isso `findAllChannels`/`findAllCategories` devolvem CÓPIAS (spread),
 * não a referência ao array original: um "repositório" real nunca devolveria
 * a mesma instância de objeto que o service poderia mutar sem querer.
 */
export const catalogRepository = {
  findAllCategories(): Category[] {
    return [...categoryFixtures];
  },

  findAllChannels(): Channel[] {
    return [...channelFixtures];
  },

  findChannelById(id: string): Channel | undefined {
    return channelFixtures.find((channel) => channel.id === id);
  },
};

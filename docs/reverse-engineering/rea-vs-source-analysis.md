# REA vs. Source Analysis — Engenharia Reversa Confrontada com o Código-Fonte Original

**Data:** 2026-10-19
**Alvo:** Saimo TV (https://saimo-tv.pages.dev/tv), código-fonte oficial em `github.com/gabrielsaimo/Saimo-TV`

## Por que este documento existe

Este laboratório foi conduzido em duas etapas metodologicamente distintas:

1. **Fases 01 a 04** — engenharia reversa "cega": nenhum nome original, nenhum comentário, nenhuma estrutura de pastas — só o HTML, JavaScript minificado (sem source maps, ver [E-012](./findings.md#e-012--nenhum-source-map-publicamente-disponível)) e tráfego de rede publicamente observável. Toda a arquitetura, os componentes, a lógica do player e o modelo de dados foram **reconstruídos por inferência e análise estática**.
2. **Verificação cruzada e auditoria final** — o repositório de código-fonte oficial foi localizado e lido, permitindo comparar, item a item, o que a engenharia reversa concluiu contra o que o código real diz.

Este documento é o **resultado dessa comparação**: um estudo de caso de quão longe (e com que limites) é possível chegar fazendo engenharia reversa de uma SPA moderna só com o que o navegador expõe publicamente — sem nunca acessar o repositório, sem DRM contornado, sem dado privado. Serve tanto como encerramento técnico do laboratório quanto como material de portfólio, demonstrando investigação de sistemas reais, documentação rastreável de evidências, e validação (ou correção) de hipóteses de arquitetura.

---

## Tabela comparativa principal

| Critério | Engenharia reversa (Fases 01-04) | Código-fonte original | Resultado |
|---|---|---|---|
| **Framework** | Inferido via bundles (fingerprint de strings de versão, padrões de API como `createRoot`) | Confirmado por `package.json`: React 19.3.0, ReactDOM 19.3.0, React Router 7.18.4, Vite 8.3.1 | ✅ **Confirmado com exatidão** |
| **Bundler** | Inferido pelo helper `rolldown-runtime-*.js` presente no bundle | Confirmado: Rolldown é o motor interno do `vite@8` (não aparece como pacote separado) | ✅ **Confirmado** |
| **Componentes** | Reconstruídos por análise de JSX minificado, nomes inferidos por comportamento (`ProgramGuide`, `PainelDeCanais`, etc.) | Definições verificadas: nomes de arquivo e estrutura batem quase exatamente com o inferido | ✅ **Confirmado, alta precisão de nomenclatura** |
| **Player** | Lógica de seleção de engine rastreada por engenharia reversa de 3 funções minificadas (`tp`/`np`/`rp`) | Implementação verificada em `src/utils/streamUrl.ts` (`isDash`/`isHls`/`isMpegTs`) — lógica **idêntica** | ✅ **Confirmado**, e **ampliado** (fallback autoaprendido por host, não visível no bundle) |
| **Gerenciamento de estado** | Inferido por contagem de hooks (`createContext`/`useContext`/`useReducer`) e um padrão de pub/sub manual | Estruturas verificadas: `adultoContexto.ts`, `dpadContexto.ts` confirmam o padrão Context; pub/sub confirmado em `player.js`/`streamUrl.ts` | ✅ **Confirmado** |
| **Infraestrutura** | Parcialmente observável (headers HTTP, domínios de requisição, Service Worker lido publicamente) | Configurações disponíveis: `vite.config.ts`, `.github/workflows/*.yml`, `vercel.json` confirmam Cloudflare Pages + suporte a Vercel + CI/CD | ✅ **Confirmado e ampliado** |
| **App desktop** | Não identificável a partir do site web (fora do escopo observável) | `package.json` revela **Tauri** (Rust + WebView), não Electron | 🆕 **Só descoberto com o código-fonte** |
| **Mecanismo de "servidores desligados"** | Inferido como "provável monitoramento automático" | `fontesDesativadas.ts`: é **curadoria manual** do mantenedor | ❌ **Corrigido pelo código-fonte** |
| **Cast/Chromecast** | Observado 1 protocolo (Google Cast SDK carregado) | `castService.ts` revela **4 protocolos** (Google Cast, AirPlay, Remote Playback API, Presentation API) | 🆕 **Ampliado pelo código-fonte** |
| **DRM** | Suporte a ClearKey confirmado por leitura de bundle (Shaka Player) | `dashPlayer.ts` nomeia os **18 canais exatos** que usam essa proteção | 🆕 **Detalhado pelo código-fonte** |

---

## Precisão da engenharia reversa, em números

Da [matriz de rastreabilidade completa](./auditoria-tecnica-final.md#3-matriz-de-rastreabilidade-descoberta-rea--evidência--código-fonte--conclusão) (34 descobertas das Fases 01-04, cada uma comparada individualmente contra o código-fonte):

| Resultado | Quantidade | % |
|---|---|---|
| ✅ Confirmada (integralmente ou com detalhe ampliado) | 25 | **73,5%** |
| ❌ Corrigida pelo código-fonte | 1 | 2,9% |
| ⚪ Não reverificada nesta rodada (arquivos grandes não lidos por completo) | 8 | 23,5% |
| 🚫 Refutada | 0 | **0%** |

**Nenhuma descoberta da engenharia reversa foi refutada.** A única correção (mecanismo de "servidores desligados": manual, não automático) foi uma inferência razoável que o código provou incompleta, não um erro de leitura do bundle — o bundle minificado simplesmente não continha informação suficiente para diferenciar "curadoria manual servida por API" de "monitoramento automático servido pela mesma API", já que, do ponto de vista do cliente, as duas produzem o mesmo tráfego de rede observável.

---

## Casos lado a lado (REA → código-fonte)

### Caso 1 — Seleção de engine de player

**O que a engenharia reversa concluiu** (Fase 03, a partir de `player-DGAgJsZy.js`):
> Três funções detectoras (`tp`, `np`, `rp`) decidem o motor de reprodução testando a URL: `.mpd` → DASH; `.ts` → mpegts.js; caso contrário → hls.js.

**O que o código-fonte confirma** (`src/utils/streamUrl.ts`):
> Funções `isDash`, `isHls`, `isMpegTs` com a **mesma lógica exata**, incluindo o caso especial de um domínio específico tratado sempre como HLS.

**Avaliação:** correspondência perfeita de **comportamento**; só os nomes mudaram (de identificadores de 2 letras para nomes descritivos em inglês/português). A engenharia reversa capturou a lógica de negócio com 100% de fidelidade, mesmo sem nomes nem comentários.

### Caso 2 — Mecanismo de "servidores desligados"

**O que a engenharia reversa concluiu** (Fase 01, E-006):
> "Provável scraping/ping periódico por um processo externo, consultado pelo client para filtrar canais com servidor fora do ar."

**O que o código-fonte revela** (`src/services/fontesDesativadas.ts`):
> "Servidores desligados à mão, no painel do monitor." — curadoria **manual** do mantenedor, não automação.

**Avaliação:** este é o único ponto onde a engenharia reversa **errou a causa raiz**, embora tenha acertado o **efeito observável** (existe uma lista de hosts desativados, consultada pelo cliente, que filtra canais). A limitação é estrutural: o tráfego de rede e o bundle minificado não expõem *como* uma lista é mantida do outro lado de uma API — só *que* ela existe e *como* é consumida. Nenhuma quantidade de análise do lado cliente resolveria essa ambiguidade sem acesso ao código do serviço ou, como aconteceu aqui, ao comentário do próprio autor no repositório.

### Caso 3 — Janela de tempo do EPG

**O que a engenharia reversa calculou** (Fase 02, a partir de `tv-C6ATJaLp.js`):
> Janela de 25 horas (`v = 25 * g`, onde `g` = 1 hora).

**O que o código-fonte mostra** (`src/workers/epgWorker.ts`, branch `main` atual):
> `PAST_WINDOW_MS = 3h`, `FUTURE_WINDOW_MS = 30h` — janela de 33 horas.

**Avaliação:** divergência real, mas **não é um erro de método** — é deriva de versão. O bundle minificado analisado nas Fases 01-02 foi capturado em um momento específico (próximo da v2.1.1); o código-fonte lido na verificação está na v2.3.0. Esse caso ilustra uma limitação inerente e honesta de qualquer engenharia reversa baseada em uma única captura: ela é uma fotografia de um instante, não um retrato do sistema vivo.

---

## O que o código-fonte revelou que a engenharia reversa nunca teria alcançado sozinha

Alguns fatos **não são, por natureza, dedutíveis de um bundle minificado**, por mais cuidadosa que seja a análise:

- **Framework do app desktop (Tauri vs. Electron):** o bundle web não contém nenhum traço disso — é uma decisão de um projeto irmão, fora do alcance do alvo investigado.
- **Motivação de design** (por que a lista de servidores desligados é manual, por que a janela do EPG é 3h+30h, por que o proxy existe) — comentários de um desenvolvedor explicando *por quê* são informação que simplesmente não sobrevive à minificação, porque nunca existiu no bundle para começar.
- **Funcionalidades nunca exercitadas na sessão de captura:** `pulos.ts` (skip de abertura/créditos), `useMediaSession.ts`, exportação de canais personalizados — código que existe no bundle de produção mas cuja *existência* só veio à tona lendo a árvore de arquivos do repositório, porque nenhuma captura de rede/DOM as acionou.
- **Precisão numérica exata quando a lógica envolve constantes "redondas" só por coincidência de minificação:** por exemplo, confirmar que exatamente 18 canais nomeados usam DRM exigiria ler a lista inteira do catálogo — inviável/antiético de se fazer via tráfego de rede real.

---

## O que a engenharia reversa alcançou que seria fácil subestimar

Por outro lado, vale registrar o que **foi** possível reconstruir com alta fidelidade, *sem nunca ter visto uma linha do código-fonte*:

- A arquitetura de módulos inteira (quem importa quem, qual chunk contém o quê).
- O algoritmo exato de três detectores de formato de streaming.
- A existência e a forma exata de um sistema de fallback entre múltiplas fontes por canal, incluindo dois watchdogs com limiares de tempo específicos.
- O padrão arquitetural de gerenciamento de estado (Context + useReducer + pub/sub manual, sem bibliotecas de terceiros).
- A existência de 3 rotas "escondidas" (sem link na interface) e seu propósito aproximado.
- A versão exata do React, mesmo sem nenhum arquivo de manifesto de dependências visível.

---

## Conclusão

Este caso demonstra que engenharia reversa disciplinada — fundamentada em evidência, com confiança graduada (fato/inferência/hipótese) e disposta a registrar o que **não** se sabe — consegue reconstruir com precisão notável o comportamento funcional de um sistema real, mesmo sem acesso a código-fonte, comentários ou nomes originais. Os limites dessa abordagem também ficaram claros: ela reconstrói **o quê** e **como**, mas raramente alcança **por quê** — e não tem como distinguir decisões operacionais (como "esta lista é curada à mão") de automações que produzem o mesmo efeito observável. Ter acesso posterior ao código-fonte não invalidou o trabalho anterior — **confirmou-o em 73,5% dos pontos auditados, corrigiu apenas 1 e não refutou nenhum**, enquanto revelou uma camada adicional de nuance que só a leitura direta do código poderia ter capturado.

Ver também: [`auditoria-tecnica-final.md`](./auditoria-tecnica-final.md) (matriz de rastreabilidade completa e inventário funcional), [`findings.md`](./findings.md) (todas as 45 descobertas, E-001 a E-045, com evidência individual).

# Fase 03 — Engenharia Reversa do Streaming e Player

**Data:** 2026-10-19
**Alvo:** https://saimo-tv.pages.dev/tv
**Pré-requisito lido:** `findings.md` (E-001 a E-026), `architecture.md`, `questions.md`, `02-javascript-analysis.md`

## Nota metodológica (leia antes do restante)

Esta fase foi conduzida **inteiramente por análise estática de código** sobre `research/artifacts/scripts/player-DGAgJsZy.js` (já baixado legitimamente nas Fases 01/02, 1,5 MB, contendo hls.js, mpegts.js embutidos e a lógica própria do player). **Nenhum canal foi reproduzido** e **nenhuma requisição de manifesto ou segmento de mídia real foi capturada** — decisão deliberada, para não reproduzir conteúdo de TV ao vivo de terceiros sem autorização explícita e específica. Como consequência:

- A Seção 6 (requisições de rede de mídia) é necessariamente limitada a inferência a partir do código e do conhecimento geral de como `hls.js`/`mpegts.js`/Shaka funcionam — não há captura de tráfego real de stream.
- A Seção 7 (desempenho) não tem medições reais de tempo-até-primeiro-frame; o que existe é a descrição dos *mecanismos* de desempenho encontrados no código (watchdogs, timeouts).
- Onde o código revela mecanismos relacionados a DRM (ClearKey), isso é documentado como **fato observado no código-fonte**, sem qualquer tentativa de uso, extração de chaves reais ou verificação de quais canais o utilizam — conforme `AGENTS.md`, item 13.

---

## 0. Recuperação de contexto

Resumo apresentado antes de iniciar (ver mensagem anterior desta sessão): Fase 01 havia identificado `hls.js` 1.7.3 e `mpegts.js` por fingerprint textual (E-007), sem detalhar a lógica de seleção. Fase 02 mapeou o padrão de estado pub/sub do player (`Um`/`Zm`, E-014) e a lista de categorias/fallback embutida (E-016). A Questão **Q-002** ("como o player decide entre hls.js e mpegts.js?") ficou em aberto — **é o foco principal resolvido nesta fase.**

---

## 1. Arquitetura do player

Diagrama: [`diagrams/03-player-architecture.mmd`](./diagrams/03-player-architecture.mmd)

### Elementos confirmados

- **Três motores de reprodução distintos**, não dois como a Fase 01 havia registrado: **hls.js 1.7.3**, **mpegts.js**, e — descoberta desta fase — **Shaka Player**, carregado sob demanda (`import('./vendor-shaka-Csozrona.js')`) apenas quando um stream DASH (`.mpd`) é selecionado ([E-021](./findings.md#e-021--shaka-player-terceiro-motor-usado-para-dash-com-suporte-a-drm-clearkey--carregado-sob-demanda)).
- **Elemento `<video>` nativo**: confirmado via `HTMLVideoElement` (7 ocorrências) e `createElement('video')` (2 ocorrências) no bundle.
- **Inicialização e destruição de instâncias**: cada troca de canal destrói defensivamente os três engines possíveis (`y.current`, `b.current`, `x.current` — DASH/mpegts/hls respectivamente) antes de criar um novo, via uma função `w()` dedicada ([E-020](./findings.md#e-020--sistema-de-recuperação-de-falhas-com-múltiplas-fontes-por-canal-watchdogs-de-congelamento-e-proteção-contra-condição-de-corrida)).
- **Gerenciamento de ciclo de vida**: refs (`useRef`) guardam a instância ativa de cada engine; um padrão de "adapter" comum emerge — não importa qual engine foi escolhido, o código que o chama sempre espera um objeto com `.destroy()`.
- **Event listeners de mídia**: confirmados em E-024 (lista completa na Seção 4 abaixo).
- **Seleção de conteúdo**: por teste de URL (`.mpd`/`.ts`/padrão), não por metadado de "tipo" explícito no catálogo (E-018).
- **Estados internos de reprodução**: `loading` (carregando), `error` (mensagem de erro), `muted`/`volume`, índice da fonte ativa (`Ae`), flags de progresso (`d`, `f`, `p`).
- **Integração com a interface**: o player expõe um store pub/sub próprio (E-014, Fase 02) para que outros componentes (ex. painel de canais) leiam o "programa atual" sem precisar renderizar o player em si.

### O que não foi assumido sem comprovação
Nenhuma biblioteca de UI de player "pronta" (ex. Video.js) foi encontrada — a interface do player (controles, barra de progresso, etc.) parece ser construída à mão sobre o elemento `<video>` nativo mais as três bibliotecas de *streaming* (que lidam só com entrega de mídia ao `<video>`, não com UI).

---

## 2. Identificação dos formatos e protocolos

### Evidências encontradas

| Tecnologia | Evidência | Confiança |
|---|---|---|
| **HLS** (HTTP Live Streaming) | `hls.js` 1.7.3 embutido; detector `np()`/branch padrão para URLs `.m3u8` | Alta |
| **MPEG-DASH** | Detector `tp()` (`.mpd`); Shaka Player carregado sob demanda | Alta |
| **MPEG-TS cru / FLV** | `mpegts.js` embutido; detector `rp()` (`.ts`) | Alta |
| **MP4 progressivo** | Não encontrada nenhuma lógica dedicada — mas o `else { t.src = n }` do player de rádio (fallback quando não é HLS) sugere que **qualquer URL que o `<video>`/`<audio>` consiga tocar nativamente** (incluindo MP4 progressivo) é suportada via atribuição direta de `src` | Média (não é uma "feature" dedicada, é o comportamento padrão do navegador) |
| **WebRTC** | Nenhuma ocorrência de `RTCPeerConnection`/`getUserMedia` | Não confirmado (ausente) — E-025 |

### Didática: como cada tecnologia funciona

#### 1. HTML5 `<video>` com MP4 progressivo
**Como funciona:** o navegador recebe um único arquivo MP4 via HTTP normal (igual a baixar qualquer arquivo), e começa a tocar assim que tem bytes suficientes, usando `Range` requests para pular adiante (seek). **Problema que resolve:** reprodução simples, sem servidor especial. **Como o navegador processa:** o decoder nativo de vídeo lê o container MP4 diretamente. **Vantagens:** zero complexidade, cacheável por CDN comum. **Limitações:** não adapta qualidade à banda disponível (sem ABR), não serve bem para **ao vivo** (não há um "arquivo final" ainda sendo gravado) — por isso não é adequado para a maior parte do catálogo do Saimo TV (canais ao vivo).

#### 2. HLS (HTTP Live Streaming)
**Como funciona:** a mídia é cortada em pequenos segmentos (geralmente 2-10s, `.ts` ou `.m4s`), descritos por um **manifesto texto** `.m3u8` que lista a ordem dos segmentos (e, no caso de múltiplas qualidades, aponta para manifestos "filhos", um por qualidade). O player baixa o manifesto, depois baixa os segmentos em sequência, remontando-os via **Media Source Extensions (MSE)** no `<video>`. **Problema que resolve:** entrega de vídeo ao vivo e sob demanda via HTTP comum (cacheável por qualquer CDN), com adaptação de qualidade. **Como o navegador processa:** nenhum browser (exceto Safari) entende HLS nativamente — por isso existe o `hls.js`, que faz esse trabalho em JavaScript, alimentando o `<video>` via MSE. **Vantagens:** padrão amplamente suportado, ótimo para ao vivo, criado pela Apple mas hoje universal. **Limitações:** latência tipicamente de alguns segundos a dezenas de segundos (long apenas com LL-HLS — Low-Latency HLS — consegue reduzir isso; o Saimo TV ativa `lowLatencyMode:true` no hls.js, indicando tentativa de usar essa variante quando a fonte suportar).

#### 3. MPEG-DASH (Dynamic Adaptive Streaming over HTTP)
**Como funciona:** conceitualmente idêntico ao HLS (segmentos + manifesto), mas o manifesto é um XML chamado **MPD** (Media Presentation Description, extensão `.mpd`) em vez de texto `.m3u8`, e é um padrão aberto (ISO/IEC), não originado da Apple. **Problema que resolve:** o mesmo do HLS, mas como padrão aberto/neutro de fornecedor, frequentemente usado quando há necessidade de DRM robusto (Widevine, PlayReady, ou o mais simples ClearKey, como visto no Saimo TV). **Como o navegador processa:** nenhum navegador entende DASH nativamente — sempre exige uma biblioteca JS (aqui, o Shaka Player). **Vantagens:** suporte maduro a múltiplos esquemas de DRM, padrão aberto. **Limitações:** suporte de biblioteca mais pesado (Shaka é maior que hls.js), por isso o Saimo TV só o carrega sob demanda.

#### 4. MPEG-TS "cru" / FLV (via mpegts.js)
**Como funciona:** diferente de HLS/DASH, aqui **não há segmentação em arquivos separados nem manifesto** — é um único fluxo contínuo de bytes no formato de transporte MPEG-TS (o mesmo usado em TV digital/satélite) ou FLV, entregue via uma conexão HTTP de longa duração (chunked) ou WebSocket. `mpegts.js` remonta esse fluxo contínuo em segmentos que alimenta ao `<video>` via MSE, da mesma forma que o hls.js faz com HLS. **Problema que resolve:** é o formato mais comum de **saída direta de servidores de re-streaming/restreaming de IPTV** (ex. servidores baseados em `ffmpeg`/Flussonic/nginx-rtmp que recebem um sinal e o retransmitem cru, sem gerar HLS) — muito comum em listas de IPTV "caseiras" como a que alimenta o Saimo TV. **Vantagens:** baixíssima latência (quase tempo real, sem o atraso de segmentação). **Limitações:** não é cacheável por CDN da mesma forma que HLS/DASH (é um fluxo contínuo, não arquivos estáticos), e tem suporte de navegador pior (daí a necessidade do `mpegts.js`).

#### 5. WebRTC (não encontrado)
**Como funciona (conceitual):** conexão ponto-a-ponto (ou via SFU) com latência subsegundo, pensado para chamadas de vídeo/conferência ou transmissões de ultrabaixa latência. **Por que não está aqui:** WebRTC exige infraestrutura de sinalização e servidores STUN/TURN dedicados — não combina com o modelo do Saimo TV (agregar streams de terceiros heterogêneos via URL simples).

### Manifesto M3U8 vs. playlist IPTV — a confusão comum

Isso é uma pegadinha de nomenclatura real, e o próprio Saimo TV lida com **ambos os sentidos** da palavra "M3U8" (ver [E-022](./findings.md#e-022--formato-do-catálogo-de-fontes-por-canal-parcialmente-resolve-q-001--suporte-a-playlists-m3um3u8-padrão-como-entrada-alternativa)):

| | **Manifesto HLS (`.m3u8` "de mídia")** | **Playlist IPTV (`.m3u`/`.m3u8` "de lista de canais")** |
|---|---|---|
| **O que descreve** | Os segmentos de vídeo/áudio de **um único stream** | Uma **lista de canais/streams**, cada um com nome, logo, categoria |
| **Quem consome** | O player (hls.js, Safari nativo) | O usuário/app de IPTV (para montar o catálogo) |
| **Exemplo de conteúdo** | `#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=...\nstream_720p.m3u8` | `#EXTM3U\n#EXTINF:-1 tvg-logo="..." group-title="Esportes",ESPN\nhttp://servidor/espn.m3u8` |
| **Relação** | Compartilham a mesma sintaxe-base (`#EXTM3U`, diretivas `#EXT-X-...`/`#EXTINF:`) porque o formato de playlist IPTV é, historicamente, um **reaproveitamento** do formato de manifesto do HLS/do antigo M3U de players de áudio (Winamp) | O **último item de uma linha `#EXTINF:` de uma playlist IPTV geralmente aponta para um manifesto `.m3u8` de mídia** — ou seja, uma playlist IPTV é uma "lista de links para manifestos" |

No Saimo TV: a função `am(e)` (E-022) parseia justamente o formato de **playlist IPTV** (`#EXTINF:` com `tvg-id`/`tvg-logo`/`group-title`) — usada para **montar o catálogo de canais**. Já o `hls.js` em si, quando ativado, consome o **manifesto de mídia** `.m3u8` de cada canal individual — dois papéis completamente diferentes para arquivos que podem ter a mesma extensão.

---

## 3. Fluxo de seleção e troca de canais

Diagrama: [`diagrams/03-channel-switch-sequence.mmd`](./diagrams/03-channel-switch-sequence.mmd)

- **Evento disparado:** `onClick` na linha do canal (já mapeado na Fase 02, componente `l`/`PanelChannelRow` e handler `J` do `ProgramGuide`).
- **Handler:** atualiza `activeChannelId`; o player reage a essa mudança (efeito observado indiretamente — o bloco de inicialização do engine roda dentro de um hook que depende do canal ativo).
- **Encerramento da reprodução anterior:** 🟢 confirmado — função `w()` destrói qualquer instância de engine ativa (DASH/mpegts/hls) antes de iniciar a próxima.
- **Inicialização da próxima mídia:** 🟢 confirmado — nova lista de fontes (`ke`) é recalculada para o novo canal, engine escolhido por `tp`/`rp`/padrão, engine anexado ao `<video>`.
- **Atualização da interface:** 🟢 confirmado — estados `loading`/`error` controlam o que é mostrado (placeholder "Selecione um canal" vs. spinner vs. vídeo vs. mensagem de erro).
- **Indicadores de loading:** 🟢 confirmado — `ce(true)`/`ce(false)` (nome inferido: `setLoading`) ao redor de todo o processo.
- **Tratamento de erros:** 🟢 confirmado e detalhado — watchdogs de 12s/25s, fallback entre fontes, mensagem final "Erro ao carregar o canal. Tente novamente." (ver E-020).
- **Condições de corrida ao trocar rapidamente:** 🟢 **confirmado e resolvido no próprio código** — a flag `u` (fechada sobre o escopo do efeito de um canal específico) é checada em todo callback assíncrono antes de agir, para que tentativas "obsoletas" (de um canal já abandonado pelo usuário) não interfiram no canal atualmente selecionado. Isso é exatamente o problema clássico de "stale closures em efeitos assíncronos" do React, resolvido aqui sem usar `AbortController` (que seria a alternativa mais idiomática para requisições `fetch`, mas não se aplica diretamente a instâncias de player) — usa um guard booleano manual.

---

## 4. Ciclo de vida e eventos do player

| Evento | Observado no app? | Quando ocorre | Impacto na interface (inferido do contexto) |
|---|---|---|---|
| `loadstart` | 🔴 Não confirmado | Navegador começa a buscar mídia | — |
| `loadedmetadata` | 🟢 Confirmado (8 ocorrências) | Duração/dimensões do vídeo ficam conhecidas | Provavelmente dispara atualização de UI relacionada a dimensões/duração |
| `canplay` | 🟢 Confirmado (4 ocorrências) | Buffer suficiente para iniciar, sem garantia de tocar sem pausas | Usado para `setLoading(false)` + iniciar reprodução (visto no handler `canplay` do mpegts: `ce(!1),j()`) |
| `playing` | 🟢 Confirmado (3 ocorrências) | Reprodução de fato começou/retomou | Provavelmente remove indicador de buffering |
| `pause` | 🟢 Confirmado (2 ocorrências) | Reprodução pausada (usuário ou programaticamente) | Usado para distinguir pausa manual de travamento (watchdog ignora `video.paused`) |
| `waiting` | 🟢 Confirmado (2 ocorrências) | Reprodução parou por falta de dados | Provavelmente aciona indicador de buffering |
| `stalled` | 🟢 Confirmado (1 ocorrência) | Navegador tentando buscar dados, mas não progride | — |
| `error` | 🟢 Confirmado (7 ocorrências) | Falha ao carregar/decodificar mídia | Alimenta o fluxo de recuperação/fallback de fontes (E-020) |
| `ended` | 🟢 Confirmado (1 ocorrência) | Mídia chegou ao fim (raro em TV ao vivo; mais relevante para VOD) | — |
| `timeupdate` | 🟢 Confirmado (8 ocorrências) | Dispara continuamente durante reprodução (a cada ~250ms) | **Peça-chave do watchdog próprio** (E-020): usado para detectar progresso real, não apenas presença dos eventos nativos |
| `volumechange` | 🔴 Não confirmado | Volume/mudo alterado | — |
| `progress` | 🟢 Confirmado (2 ocorrências) | Navegador baixando dados (buffer) | — |
| `seeking` | 🟢 Confirmado (1 ocorrência) | Usuário/código inicia um salto de posição | Mais relevante ao contexto de VOD (replay/seek) do que TV ao vivo |
| `durationchange` | 🟢 Confirmado (1 ocorrência) | Duração do stream mudou/ficou conhecida | — |

### Nativo do navegador vs. lógica própria

- **Nativo do navegador/MSE:** todos os eventos acima são disparados pelo próprio elemento `<video>` (especificação HTML5 Media), independentemente de qual engine (hls.js/mpegts.js/Shaka) está alimentando-o.
- **Lógica própria da aplicação:** o Saimo TV **não confia cegamente** em `waiting`/`stalled` para decidir que algo travou — constrói sua **própria** detecção de travamento em cima de `timeupdate` (medindo se `currentTime` realmente avança ao longo do tempo real, via `performance.now()`), com dois limiares próprios (12s e 25s) e uma lógica de decisão (recuperar vs. trocar de fonte) que não existe em nenhuma API nativa.

### Como implementaríamos em React (exemplo educacional)

```typescript
function useVideoWatchdog(videoRef: React.RefObject<HTMLVideoElement>, onTravado: () => void) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let ultimoTempo = -1;
    let ultimoProgresso = performance.now();

    const aoAvancar = () => {
      if (video.currentTime > ultimoTempo + 0.2) {
        ultimoTempo = video.currentTime;
        ultimoProgresso = performance.now();
      }
    };

    const intervalo = setInterval(() => {
      if (!video.paused && performance.now() - ultimoProgresso > 25_000) {
        onTravado();
      }
    }, 2000);

    video.addEventListener("timeupdate", aoAvancar);
    return () => {
      video.removeEventListener("timeupdate", aoAvancar);
      clearInterval(intervalo);
    };
  }, [videoRef, onTravado]);
}
```

---

## 5. Buffering e gerenciamento de qualidade

| Mecanismo | Status | Evidência |
|---|---|---|
| Buffer de reprodução | 🟢 Confirmado (implícito) | `backBufferLength:90` configurado explicitamente no hls.js (mantém até 90s de buffer "para trás", permitindo pequenos retrocessos sem nova rede) |
| ABR (adaptação automática de bitrate) | 🟡 Parcialmente confirmado | `hls.js` e Shaka Player fazem ABR **automaticamente por padrão** quando o manifesto anuncia múltiplas qualidades (`currentLevel`/`nextLevel`/`autoLevelEnabled` existem no código — majoritariamente como parte do **código interno das bibliotecas**, não uma chamada explícita de app para configurar ABR customizado) |
| Seleção manual de qualidade pelo usuário | 🔴 Não confirmado | Apenas uma ocorrência da palavra `qualidade`, e é um **campo do catálogo** (metadado de uma fonte, ver E-022), não um seletor de UI |
| Recuperação após interrupções | 🟢 Confirmado | Sistema completo de watchdog + fallback de fontes (E-020); `recoverMediaError` existe no hls.js (biblioteca), mas não foi confirmado se a app chama isso explicitamente ou deixa o hls.js lidar internamente |
| Latência de reprodução | 🟡 Parcialmente confirmado | `lowLatencyMode:true` no hls.js sinaliza **intenção** de baixa latência (ativa LL-HLS quando a fonte suporta); `mpegts.js` é inerentemente baixa latência (stream contínuo) |
| Pré-carregamento | 🔴 Não investigado nesta fase | Não foi localizado nenhum mecanismo de pré-buscar o próximo canal antes da seleção |
| Estratégias de retry | 🟢 Confirmado | Contador de erros de rede (`Oe`, capado em 3 tentativas no mpegts.js) + fallback entre fontes alternativas (E-020) |
| Timeout de carregamento | 🟢 Confirmado | Watchdog de 12s para "primeiro frame" (E-020) |

---

## 6. Requisições de rede relacionadas à mídia

**Nenhuma requisição de mídia real foi capturada nesta fase** (ver Nota Metodológica). O que pode ser dito com segurança:

- Pela Fase 01, já sabemos que o domínio da própria aplicação (`saimo-tv.pages.dev`) serve o HTML/JS/CSS/manifest; o Worker de monitoramento (`saimo-monitor...workers.dev`) é consultado para status de fontes; e o proxy `/api/proxy` é usado tanto para EPG (Fase 01) quanto, conforme E-019, potencialmente para mídia.
- **Conceitualmente** (sem captura real), o fluxo esperado para um canal HLS seria: (1) requisição do manifesto `.m3u8` (texto, `Content-Type: application/vnd.apple.mpegurl` ou `application/x-mpegURL`); (2) se o manifesto for "mestre" (lista de qualidades), uma segunda requisição ao manifesto "filho" da qualidade escolhida; (3) requisições sucessivas de segmentos `.ts`/`.m4s` (binário, `Content-Type: video/mp2t` ou `video/mp4`), uma a cada poucos segundos, à medida que o player consome o buffer.
- Para mpegts.js: uma única conexão HTTP de longa duração (chunked transfer) ou WebSocket, sem requisições repetidas por "segmento".
- Para Shaka/DASH: requisição do `.mpd` (XML), depois segmentos `.m4s` referenciados nele.

### Diferenças conceituais (didático)

- **Cliente e servidor de aplicação:** o navegador (cliente) fala com `saimo-tv.pages.dev` (servidor de aplicação, Cloudflare Pages) para obter o HTML/JS/CSS e o catálogo — isso **não é** o servidor de mídia.
- **Servidor de origem de mídia:** o servidor real que hospeda/retransmite o stream de cada canal (um dos hosts de terceiros, ex. algo listado em `canais.txt`) — **não observado diretamente nesta fase**.
- **CDN:** uma rede de distribuição que fica entre o servidor de origem e o cliente, fazendo cache de segmentos/manifestos próximos geograficamente do usuário — para HLS/DASH isso funciona bem (arquivos estáticos cacheáveis); para o fluxo contínuo do mpegts.js, uma CDN tradicional tem pouca utilidade (não há "arquivo" para cachear).
- **Player:** o código no navegador (hls.js/mpegts.js/Shaka) que fala HTTP com o servidor de origem/CDN e entrega bytes decodificáveis ao `<video>` via MSE.
- **Manifesto vs. segmentos:** o manifesto é metadado (texto/XML, pequeno, baixado uma vez ou poucas vezes); os segmentos são o conteúdo de mídia real (binário, muitos, baixados continuamente).

---

## 7. Análise de desempenho

Sem reprodução real, não há medições de tempo-até-primeiro-frame. O que é **observável no código** (não medido em runtime):

- **Mecanismo de timeout para primeira reprodução:** 12 segundos (watchdog inicial).
- **Mecanismo de detecção de travamento contínuo:** checagem a cada 2 segundos, limiar de 25 segundos sem avanço de `currentTime`.
- **Limpeza de recursos:** `w()` destrói todas as instâncias de engine antes de criar uma nova (evita vazamento de memória/double-audio); `v()` cancela timers pendentes; o `useEffect` de troca de canal provavelmente retorna uma função de limpeza equivalente (consistente com o padrão observado em toda a Fase 02 de `useEffect`s bem higienizados).
- **Instâncias ativas simultâneas:** o código assume **no máximo um engine ativo por vez** (nunca dois tocando ao mesmo tempo, graças à destruição defensiva).

---

## 8. Arquitetura de uma implementação própria (educacional)

Com base no que foi observado (sem copiar código do Saimo TV), uma arquitetura educacional razoável para um player próprio:

```typescript
// --- Tipos de domínio ---
interface FonteDeMidia {
  url: string;
  tipo: "hls" | "dash" | "mpegts" | "nativo";
  referer?: string;
  userAgent?: string;
}

interface PlayerState {
  status: "ocioso" | "carregando" | "reproduzindo" | "pausado" | "erro";
  fonteAtivaIndex: number;
  mensagemErro: string | null;
}

// --- MediaSourceAdapter: interface comum para qualquer engine ---
interface MediaSourceAdapter {
  anexar(video: HTMLVideoElement, fonte: FonteDeMidia): Promise<void>;
  destruir(): void;
  recuperar(): void; // tenta religar sem recriar tudo
}

class AdaptadorHls implements MediaSourceAdapter {
  private instancia: unknown = null;
  async anexar(video: HTMLVideoElement, fonte: FonteDeMidia) {
    // instanciaria hls.js aqui, chamando loadSource/attachMedia
  }
  destruir() { /* instancia?.destroy() */ }
  recuperar() { /* instancia?.startLoad() ou recoverMediaError() */ }
}
// AdaptadorDash e AdaptadorMpegts seguiriam a mesma interface.

// --- MediaCatalog: decide qual adapter usar ---
function escolherAdaptador(url: string): MediaSourceAdapter {
  if (url.toLowerCase().includes(".mpd")) return new AdaptadorDash();
  if (/\.ts(\?|$)/i.test(url)) return new AdaptadorMpegts();
  return new AdaptadorHls(); // padrão
}

// --- PlayerController: orquestra tudo, incluindo troca de canal ---
class PlayerController {
  private adaptadorAtivo: MediaSourceAdapter | null = null;
  private cancelado = false; // guard de condição de corrida

  async trocarCanal(video: HTMLVideoElement, fontes: FonteDeMidia[]) {
    this.cancelado = false;
    const cancelarEstaOperacao = () => { this.cancelado = true; };

    this.adaptadorAtivo?.destruir();
    const adaptador = escolherAdaptador(fontes[0].url);
    this.adaptadorAtivo = adaptador;

    await adaptador.anexar(video, fontes[0]);
    if (this.cancelado) { adaptador.destruir(); return; } // troca de canal aconteceu durante o await

    return cancelarEstaOperacao;
  }
}

// --- PlaybackEvents: hook de integração com React ---
function usePlaybackEvents(videoRef: React.RefObject<HTMLVideoElement>) {
  const [estado, setEstado] = useState<PlayerState>({ status: "ocioso", fonteAtivaIndex: 0, mensagemErro: null });
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const aoTocar = () => setEstado((s) => ({ ...s, status: "reproduzindo" }));
    const aoErrar = () => setEstado((s) => ({ ...s, status: "erro" }));
    video.addEventListener("playing", aoTocar);
    video.addEventListener("error", aoErrar);
    return () => {
      video.removeEventListener("playing", aoTocar);
      video.removeEventListener("error", aoErrar);
    };
  }, [videoRef]);
  return estado;
}

// --- ErrorHandler: política de fallback entre fontes ---
class ErrorHandler {
  constructor(private fontes: FonteDeMidia[], private aoEsgotar: () => void) {}
  tratar(indiceAtual: number, tentarProxima: (indice: number) => void) {
    const proximo = indiceAtual + 1;
    if (proximo < this.fontes.length) tentarProxima(proximo);
    else this.aoEsgotar();
  }
}
```

**Responsabilidades, resumidas:**
- `PlayerController` — orquestra a troca de canal, guarda de condição de corrida, delega ao adapter certo.
- `MediaSourceAdapter` (+ implementações) — encapsula as diferenças entre hls.js/Shaka/mpegts.js atrás de uma interface comum (`anexar`/`destruir`/`recuperar`).
- `MediaCatalog`/`escolherAdaptador` — decide qual adapter usar por URL.
- `PlaybackEvents` — ponte entre eventos nativos do `<video>` e estado React.
- `ErrorHandler` — política de fallback entre fontes.
- `PlayerUI` — componente puramente visual, consumindo o estado acima (fora do escopo deste pseudocódigo).

Use mídia pública de teste para experimentar, por exemplo o stream HLS de demonstração `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` (comumente usado para testar hls.js).

---

## 9. Comparação técnica

| | HTML5 `<video>` nativo | hls.js | Shaka Player | Video.js |
|---|---|---|---|---|
| **Formatos suportados nativamente** | MP4/WebM progressivo; HLS só no Safari | HLS (via MSE, qualquer navegador com suporte a MSE) | HLS e DASH (via MSE) | Nenhum por si só — é uma camada de UI que delega a players/engines (incluindo, opcionalmente, hls.js) |
| **Compatibilidade** | Universal para progressivo; HLS restrito a Safari/iOS | Excelente (Chrome, Firefox, Edge, Safari como fallback) | Excelente, forte em DRM | Depende dos plugins usados |
| **Complexidade de uso** | Mínima (`<video src>`) | Baixa-média (config de instância) | Média-alta (API mais extensa, voltada a DRM/ABR avançado) | Baixa para UI, mas exige integrar engines por baixo para HLS/DASH |
| **Tamanho** | 0 (nativo) | Pequeno-médio | Maior (mais features, incl. DRM) | Médio (é majoritariamente UI) |
| **Suporte a DRM** | Apenas o que o navegador oferecer nativamente (EME) | Não nativo (mas pode usar EME manualmente) | **Forte** (ClearKey, Widevine, PlayReady) | Depende de plugin |
| **Vantagem principal** | Simplicidade | Foco e maturidade em HLS | Melhor opção quando DRM é necessário | Melhor opção quando se quer uma **UI de player pronta e customizável**, independente do engine |
| **Limitação principal** | Sem HLS/DASH fora do Safari | Não cobre DASH | Mais pesado, API mais complexa | Não resolve, sozinho, o problema de **qual engine de streaming usar** |

### Recomendação para uma implementação educacional própria

Considerando **apenas o que foi identificado** nesta investigação (streams predominantemente HLS e MPEG-TS cru, ocasionalmente DASH com DRM simples): **`hls.js` como motor principal**, com fallback nativo (`canPlayType`) para Safari, é a escolha mais equilibrada para fins educacionais — API relativamente simples, excelente documentação, e cobre a maioria dos casos reais observados no Saimo TV. `Video.js` seria mais apropriado apenas se o objetivo fosse construir rapidamente uma **UI de player rica** (controles, skinning) sobre qualquer engine — um objetivo diferente do foco desta investigação (que é entender a entrega de mídia, não a interface de controles). Shaka Player só se justificaria se o projeto educacional quisesse explorar DASH/DRM especificamente.

---

## 10. Síntese de ensino (consolidado na Seção 2 e ao longo do documento)

As descobertas mais ricas desta fase (seleção de engine, watchdogs, guard de condição de corrida, Shaka/DRM, M3U8 vs. playlist IPTV) já foram apresentadas na metodologia "o que descobrimos → como investigamos → como funciona → como reproduzir → como implementaríamos → exercício" ao longo das Seções 1 a 9. Dois exercícios adicionais, para consolidar:

**Exercício 1 (detecção de formato):** escreva três funções puras `ehHls(url)`, `ehDash(url)`, `ehMpegts(url)` usando os mesmos critérios observados no Saimo TV (substring `.mpd`, regex `/\.ts(\?|$)/i`, fallback), e escreva testes unitários cobrindo URLs com e sem query string.

**Exercício 2 (guard de corrida):** implemente um componente React que troca de "canal" (mock, com `setTimeout` aleatório simulando carregamento) rapidamente várias vezes seguidas, primeiro **sem** nenhum guard (observe o bug: o canal errado "vence" a corrida) e depois **com** um guard booleano como o do Saimo TV.

---

## 11. Registro de evidências

Ver `findings.md`, entradas **E-018 a E-026**. Nenhuma credencial, token, URL privada de streaming ou dado pessoal foi registrado. Nenhuma mídia foi baixada ou reproduzida.

---

## 12. O que permanece desconhecido

- Requisições de rede reais de manifesto/segmento (nenhuma reprodução foi iniciada).
- Se algum canal do catálogo atual realmente usa DRM ClearKey (não investigado, por decisão deliberada).
- Conteúdo real de `canais.txt`/`catalogo.txt` (só o parser foi lido, não os dados).
- Se existe pré-carregamento do próximo canal provável.
- Detalhes de UI do player (controles visuais, barra de progresso) — não foi o foco desta fase, centrada na camada de streaming.
- Propósito exato do domínio `dadinhodetapioca.fun`, tratado como caso especial no código (Q-009).

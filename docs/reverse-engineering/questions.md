# Questions — Dúvidas Técnicas e Hipóteses

Dúvidas técnicas abertas e hipóteses que exigem investigação adicional, levantadas na Fase 01.

---

## Q-001 — Qual é o formato exato de `canais.txt` e `catalogo.txt`? 🟡 Parcialmente resolvida (Fase 03)

- **Origem:** [E-004](./findings.md#e-004--catálogo-de-canais-hospedado-em-repositório-público-do-github)
- **Dúvida original:** os arquivos de texto do repositório `gabrielsaimo/SaimoPlayer` não foram lidos nesta fase. Qual o schema e como ele mapeia nome, URL de stream, categoria e logo?
- **Resolução parcial (Fase 03):** [E-022](./findings.md#e-022--formato-do-catálogo-de-fontes-por-canal-parcialmente-resolve-q-001--suporte-a-playlists-m3um3u8-padrão-como-entrada-alternativa) mostra, pelo **parser** (não pelo conteúdo real do arquivo), que o formato é chave-valor por linha em português (`fonte`, `referer`, `nome`, `qualidade`, `agente`, `chave`), com suporte alternativo a playlists M3U/M3U8 padrão.
- **O que ainda falta:** ler o conteúdo real de `canais.txt`/`catalogo.txt` no GitHub para confirmar o formato completo (campos de nome do canal, categoria, logo — não só da lista de fontes de stream).

## Q-002 — Como o player decide entre hls.js e mpegts.js para cada canal? ✅ Resolvida (Fase 03)

- **Origem:** [E-007](./findings.md#e-007--player-de-vídeo-com-hlsjs-173-e-mpegtsjs-embutidos)
- **Resolução:** [E-018](./findings.md#e-018--seleção-de-engine-de-reprodução-três-motores-distintos-escolhidos-por-teste-de-url) — a escolha é por teste da URL (contém `.mpd` → DASH/Shaka; termina em `.ts` → mpegts.js; caso contrário → hls.js como padrão), não por metadado explícito nem tentativa-e-erro entre engines (embora exista fallback entre **fontes alternativas** do mesmo canal, ver [E-020](./findings.md#e-020--sistema-de-recuperação-de-falhas-com-múltiplas-fontes-por-canal-watchdogs-de-congelamento-e-proteção-contra-condição-de-corrida)).

## Q-003 — O proxy `/api/proxy` tem alguma allowlist de domínios?

- **Origem:** [`learning.md` §3](./learning.md#3-proxy-server-side-para-contornar-cors-origem-e-005)
- **Dúvida:** o endpoint aceita qualquer `url=`? Isso é relevante para entender o desenho do sistema (não para explorar uma falha), já que proxies abertos são um padrão arquitetural conhecido com implicações de segurança.
- **Como investigar:** observar, em uso normal, se o endpoint é chamado apenas com domínios esperados (`guiadetv.com`); **não** tentar chamá-lo manualmente com outros domínios sem autorização explícita do usuário, por ser uma ação que poderia ser vista como teste de segurança contra um sistema de terceiros.

## Q-004 — O que as abas Eventos, On Demand, Favoritos, Rádios e Buscar mostram?

- **Origem:** [E-003](./findings.md#e-003--estrutura-de-interface-e-navegação-por-abas)
- **Dúvida:** apenas a aba "Ao vivo" (padrão de `/tv`) foi observada nesta fase.
- **Como investigar:** capturar cada aba separadamente com `capture_browser_scenario` (ações de clique), de forma não invasiva, em uma fase futura.

## Q-005 — Qual o conteúdo das respostas de `/v1/fontes` e `/v1/hello` do Worker de monitoramento?

- **Origem:** [E-006](./findings.md#e-006--backend-próprio-de-monitoramento-de-fontes-cloudflare-worker)
- **Dúvida:** só observamos a URL chamada, não o corpo da resposta.
- **Como investigar:** capturar `response_body: true` nos eventos de rede em uma próxima sessão (dado público, sem autenticação).

## Q-006 — Qual estratégia de cache o Service Worker implementa?

- **Origem:** [E-009](./findings.md#e-009--progressive-web-app-pwa-com-manifest-e-service-worker)
- **Dúvida:** o registro foi bloqueado pelo ambiente de automação (Playwright) nesta captura.
- **Como investigar:** usar uma ferramenta que permita registro real de Service Worker (ex.: `claude-in-chrome` em uma aba real) e inspecionar via DevTools → Application → Service Workers / Cache Storage.

## Q-007 — Quais requisições de rede reais ocorrem durante a reprodução de um canal (manifesto, segmentos)?

- **Origem:** Fase 03, Seção 6 (não executada por decisão deliberada)
- **Dúvida:** a Fase 03 documentou a lógica de seleção de engine e de fontes por **leitura estática de código**, sem iniciar reprodução real de nenhum canal — para não reproduzir conteúdo de TV ao vivo de terceiros sem autorização clara. Não há, portanto, evidência de rede real de manifesto (`.m3u8`/`.mpd`) nem de segmentos.
- **Como investigar:** **somente mediante autorização explícita do usuário**, com escopo limitado (ex.: um único canal, poucos segundos, sem gravar/armazenar o conteúdo de mídia em si — apenas metadados de requisição como método, status, content-type).

## Q-008 — O mecanismo de "chave" (DRM ClearKey) é usado por algum canal atualmente ativo no catálogo?

- **Origem:** [E-021](./findings.md#e-021--shaka-player-terceiro-motor-usado-para-dash-com-suporte-a-drm-clearkey--carregado-sob-demanda), [E-022](./findings.md#e-022--formato-do-catálogo-de-fontes-por-canal-parcialmente-resolve-q-001--suporte-a-playlists-m3um3u8-padrão-como-entrada-alternativa)
- **Dúvida:** o código suporta configurar DRM ClearKey via o campo `chave` do catálogo, mas não foi investigado se isso é usado na prática.
- **Como investigar:** **não recomendado investigar ativamente** — envolveria ler conteúdo de catálogo associado a proteção de conteúdo, o que se aproxima da linha de "contornar/analisar DRM" vedada pelas regras do laboratório (`AGENTS.md`, item 13). Registrado aqui apenas como curiosidade documentada, não como próximo passo.

## Q-009 — Qual é a origem/propósito exato do domínio `dadinhodetapioca.fun`, tratado como caso especial no código?

- **Origem:** [E-018](./findings.md#e-018--seleção-de-engine-de-reprodução-três-motores-distintos-escolhidos-por-teste-de-url), [E-019](./findings.md#e-019--proxy-de-mídia-reutiliza-o-mesmo-endpoint-apiproxy-do-epg-com-encaminhamento-opcional-de-refereruser-agent)
- **Dúvida:** esse domínio é tratado como HLS e como "precisa de proxy" incondicionalmente — sugere ser uma fonte específica e peculiar usada pelo mantenedor, mas não investigamos o próprio domínio (não visitado, por ser potencialmente uma fonte de stream de terceiros fora do escopo do alvo original).
- **Como investigar:** não é uma prioridade; se investigado, deve ficar restrito a observar que o domínio existe e é referenciado no código, sem acessá-lo.

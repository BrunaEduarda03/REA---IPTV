# Questions — Dúvidas Técnicas e Hipóteses

Dúvidas técnicas abertas e hipóteses que exigem investigação adicional, levantadas na Fase 01.

> **Nota (2026-10-19):** o repositório de código-fonte oficial do Saimo TV (`github.com/gabrielsaimo/Saimo-TV`) foi identificado e usado para uma passagem de verificação cruzada (ver `findings.md`, seção "Verificação cruzada com o código-fonte público", E-035 a E-045). Várias questões abaixo foram resolvidas ou refinadas por essa verificação, marcadas com ✅/🟡 e um link para a entrada correspondente.

---

## Q-001 — Qual é o formato exato de `canais.txt` e `catalogo.txt`? ✅ Resolvida (verificação de código-fonte)

- **Origem:** [E-004](./findings.md#e-004--catálogo-de-canais-hospedado-em-repositório-público-do-github)
- **Resolução:** `src/services/catalogService.ts` do repositório `gabrielsaimo/Saimo-TV` confirma por completo: formato chave-valor por linha (`canal:` abre um canal, `logo:`, `categoria:`, e os campos de fonte já conhecidos por [E-022](./findings.md#e-022--formato-do-catálogo-de-fontes-por-canal-parcialmente-resolve-q-001--suporte-a-playlists-m3um3u8-padrão-como-entrada-alternativa): `fonte`/`referer`/`nome`/`qualidade`/`agente`/`chave`). `catalogo.txt` é a fonte primária (carrega ClearKey/Referer/UA); `canais.txt` entra como reserva, casando por nome. Cache local: `saimo-catalogo-v2`, TTL de 6 horas (valor exato, antes desconhecido).

## Q-002 — Como o player decide entre hls.js e mpegts.js para cada canal? ✅ Resolvida (Fase 03)

- **Origem:** [E-007](./findings.md#e-007--player-de-vídeo-com-hlsjs-173-e-mpegtsjs-embutidos)
- **Resolução:** [E-018](./findings.md#e-018--seleção-de-engine-de-reprodução-três-motores-distintos-escolhidos-por-teste-de-url) — a escolha é por teste da URL (contém `.mpd` → DASH/Shaka; termina em `.ts` → mpegts.js; caso contrário → hls.js como padrão), não por metadado explícito nem tentativa-e-erro entre engines (embora exista fallback entre **fontes alternativas** do mesmo canal, ver [E-020](./findings.md#e-020--sistema-de-recuperação-de-falhas-com-múltiplas-fontes-por-canal-watchdogs-de-congelamento-e-proteção-contra-condição-de-corrida)).

## Q-003 — O proxy `/api/proxy` tem alguma allowlist de domínios?

- **Origem:** [`learning.md` §3](./learning.md#3-proxy-server-side-para-contornar-cors-origem-e-005)
- **Dúvida:** o endpoint aceita qualquer `url=`? Isso é relevante para entender o desenho do sistema (não para explorar uma falha), já que proxies abertos são um padrão arquitetural conhecido com implicações de segurança.
- **Como investigar:** observar, em uso normal, se o endpoint é chamado apenas com domínios esperados (`guiadetv.com`); **não** tentar chamá-lo manualmente com outros domínios sem autorização explícita do usuário, por ser uma ação que poderia ser vista como teste de segurança contra um sistema de terceiros.

## Q-004 — O que as abas Eventos, On Demand, Favoritos, Rádios e Buscar mostram? 🟡 Parcialmente resolvida (Fase 04)

- **Origem:** [E-003](./findings.md#e-003--estrutura-de-interface-e-navegação-por-abas)
- **Dúvida original:** apenas a aba "Ao vivo" (padrão de `/tv`) foi observada.
- **Resolução parcial (Fase 04):** [E-030](./findings.md#e-030--integração-com-a-api-pública-da-espn-para-a-aba-eventos-esportes)/[E-032](./findings.md#e-032--dois-endpoints-de-backend-adicionais-descobertos-apievents-próprio-e-v1eventos-worker-de-monitoramento) confirmam, por código (não visualmente), que "Eventos" mostra eventos esportivos (majoritariamente futebol) agregados de ESPN + `/api/events` + `/v1/eventos`.
- **O que ainda falta:** confirmação visual (nenhuma aba foi efetivamente aberta/capturada); On Demand, Favoritos, Rádios e Buscar continuam sem investigação direta de UI (embora On Demand/VOD tenha evidência de dados via E-029/E-031).
- **Como investigar o restante:** capturar cada aba separadamente com `capture_browser_scenario` (ações de clique), de forma não invasiva, em uma fase futura.

## Q-005 — Qual o conteúdo das respostas de `/v1/fontes`, `/v1/eventos`, `/v1/hello` e `/api/events`? 🟡 Parcialmente resolvida (verificação de código-fonte)

- **Origem:** [E-006](./findings.md#e-006--backend-próprio-de-monitoramento-de-fontes-cloudflare-worker), ampliada por [E-032](./findings.md#e-032--dois-endpoints-de-backend-adicionais-descobertos-apievents-próprio-e-v1eventos-worker-de-monitoramento)
- **Resolvido parcialmente:** `/v1/fontes` → `{ desativados: string[] }` (hostnames), confirmado em [E-039](./findings.md#e-039--mecanismo-de-servidores-desligados-é-curadoria-manual-não-monitoramento-automático-corrige-e-006). `/v1/hello` → corpo `text/plain` via `sendBeacon`, conteúdo é telemetria de sessão (ver [E-040](./findings.md#e-040--telemetria-exata-sendbeacon-textplain-sem-ip-limiar-de-20s-resolve-q-010), formato exato do texto não lido, só os dados que o alimentam). `/api/events` → repassa o corpo de `embedtv.cc/api/events` ou de `/v1/eventos` (ver [E-041](./findings.md#e-041--apievents-exato-fonte-embedtvcc-identificada-estratégia-de-fallback-precisa-refina-e-030e-032)), mas o **schema JSON exato** desses dois não foi lido (o código do lado consumidor não foi aprofundado a esse nível).
- **O que ainda falta:** schema exato do JSON de eventos (`embedtv.cc`/`/v1/eventos`).

## Q-006 — Qual estratégia de cache o Service Worker implementa? ✅ Resolvida (Fase 04)

- **Origem:** [E-009](./findings.md#e-009--progressive-web-app-pwa-com-manifest-e-service-worker)
- **Resolução:** [E-027](./findings.md#e-027--service-worker-público-lido-por-completo-estratégia-de-cache-app-shell-resolve-q-006) — o `sw.js` público foi lido por completo (não minificado): app shell com cache-first para assets com hash, network-first com fallback para navegação, e exclusão explícita de `/api/*` de qualquer cache.

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

## Q-010 — O conteúdo de `/v1/hello` (POST) inclui o `saimo-telemetria-id`? ✅ Resolvida (verificação de código-fonte)

- **Origem:** [E-033](./findings.md#e-033--correçãodetalhamento-de-e-006-v1hello-é-chamado-via-post-com-corpo-não-get), [E-008](./findings.md#e-008--persistência-exclusivamente-em-localstorage-sem-cookies)
- **Resolução:** [E-040](./findings.md#e-040--telemetria-exata-sendbeacon-textplain-sem-ip-limiar-de-20s-resolve-q-010) — sim, `src/services/telemetria.ts` lê/gera exatamente essa chave e a inclui no payload (`text/plain`, via `sendBeacon`), junto com dados de sessão de reprodução. IP não é registrado (só geolocalização de borda da Cloudflare, por nível de cidade).

## Q-011 — A rota `/api/proxy` tem alguma relação de allowlist com as 2 Pages Functions vs. o Worker `saimo-monitor`?

- **Origem:** [`04-data-api-infrastructure.md`](./04-data-api-infrastructure.md#6-investigação-de-backend-e-serviços)
- **Dúvida:** são dois sistemas de hospedagem Cloudflare distintos (Pages Functions vs. Workers) — não está claro se compartilham alguma configuração/lista de permissões, ou são totalmente independentes.
- **Como investigar:** não é prioritário; não há como investigar isso de forma pública sem acesso à configuração interna da Cloudflare do mantenedor.

## Q-012 — Existe alguma forma de autenticação/conta de usuário na aplicação? ✅ Resolvida (verificação de código-fonte)

- **Origem:** Observação consolidada de todas as fases.
- **Resolução:** a árvore completa de arquivos do repositório fonte (188 arquivos) não contém nenhum componente, serviço ou tela relacionado a login/conta/autenticação — apenas `src/services/telemetria.ts` (ID anônimo por dispositivo, sem conta). Confirma que a hipótese estava correta: não há sistema de contas de usuário.

## Q-013 — Qual é o schema JSON exato de `embedtv.cc/api/events` e de `/v1/eventos`? ✅ Resolvida

- **Origem:** [E-041](./findings.md#e-041--apievents-exato-fonte-embedtvcc-identificada-estratégia-de-fallback-precisa-refina-e-030e-032)
- **Resolução:** ver `auditoria-tecnica-final.md`, Seção 1 — interfaces `EventoAgenda`/`PlacarEspn`/`Jogo` lidas de `src/services/eventos.ts`. Lista de ligas ESPN e canais de streaming cobertos também documentada ali.

## Q-014 — O que é exatamente o "api-saimo-tv" / pipeline com Supabase mencionado em `tmdbService.ts`? 🔴 Não resolvida (deliberadamente fora de escopo)

- **Origem:** Comentário de cabeçalho de `src/services/tmdbService.ts`.
- **Resultado da tentativa de resolução:** busca na API pública do GitHub não encontrou um repositório público `api-saimo-tv` sob a conta `gabrielsaimo`. Provavelmente privado ou não publicado — componente de geração/manutenção de catálogo (build-time), fora do escopo deste laboratório (que foca no site em produção). Ver `auditoria-tecnica-final.md`, Seção 1, para o detalhamento.

## Q-003 — O proxy `/api/proxy` tem alguma allowlist de domínios? 🟡 Parcialmente resolvida

- **Origem:** `learning.md` §3 (Fase 01)
- **Resolução parcial:** a leitura do código-fonte de `functions/api/proxy.ts` (Fase de auditoria final) **não encontrou nenhuma lógica de allowlist/validação de domínio** no arquivo — o proxy parece aceitar qualquer `url=`. Isto é uma **observação de leitura de código**, não um teste ativo contra o serviço em produção (que continua não sendo feito, por princípio). Note-se que `functions/api/resolve-vod.ts` é diferente: seu comentário afirma explicitamente "resolve apenas as origens conhecidas; nunca funciona como proxy arbitrário" — ou seja, o endpoint de VOD tem essa proteção, mas o `/api/proxy` genérico (usado por EPG e mídia) aparentemente não.
- **Observação de responsabilidade:** este é um padrão de design conhecido (proxy aberto) com implicações de segurança já discutidas na Fase 04 (Seção 8.8, "nunca incorporar... validar e restringir o endpoint de proxy a uma allowlist" como recomendação para uma implementação própria). Não há recomendação de teste adicional contra o serviço do Saimo TV.

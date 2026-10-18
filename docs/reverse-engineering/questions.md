# Questions — Dúvidas Técnicas e Hipóteses

Dúvidas técnicas abertas e hipóteses que exigem investigação adicional, levantadas na Fase 01.

---

## Q-001 — Qual é o formato exato de `canais.txt` e `catalogo.txt`?

- **Origem:** [E-004](./findings.md#e-004--catálogo-de-canais-hospedado-em-repositório-público-do-github)
- **Dúvida:** os arquivos de texto do repositório `gabrielsaimo/SaimoPlayer` não foram lidos nesta fase. Qual o schema (CSV? um canal por linha com campos separados? JSON em `.txt`?) e como ele mapeia nome, URL de stream, categoria e logo?
- **Como investigar:** leitura direta do conteúdo público do repositório GitHub (dado público, sem necessidade de autenticação).

## Q-002 — Como o player decide entre hls.js e mpegts.js para cada canal?

- **Origem:** [E-007](./findings.md#e-007--player-de-vídeo-com-hlsjs-173-e-mpegtsjs-embutidos)
- **Dúvida:** existe lógica de detecção por extensão de URL (`.m3u8` vs. outro), por metadado no catálogo, ou tentativa-e-erro (fallback)?
- **Como investigar:** leitura mais aprofundada do bundle `player-DGAgJsZy.js` (desminificação parcial) ou observação de rede ao reproduzir canais de fontes diferentes — fica para fase dedicada ao player, conforme instrução do usuário.

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

# Backlog — MVP e Plano de Sprints

## Critério de inclusão no MVP

Uma funcionalidade só entra no MVP se resolver um requisito de aprendizado ou de usabilidade mínima — **nunca** só porque existe no Saimo TV original. Onde isso elimina algo visto na investigação (ex.: multi-protocolo de cast, DRM, EPG real), está anotado explicitamente.

---

## MVP detalhado

### 1. Layout principal — **Obrigatório**
- **Descrição:** casca visual da aplicação (barra superior, área de conteúdo, rodapé opcional).
- **Responsabilidade:** `components/layout/PageShell`, `components/layout/TopBar`.
- **Componentes envolvidos:** `PageShell`, `TopBar`, `components/ui/*` básicos.
- **Dados necessários:** nenhum (estrutural).
- **Dependências:** Tailwind configurado, React Router (para destacar a rota ativa).
- **Critérios de aceitação:** layout renderiza em mobile e desktop sem overflow horizontal; navegação visível e com estado "ativo" destacado.
- **Testes esperados:** teste de render (RTL) garantindo que `TopBar` exibe os links esperados; teste de snapshot não é prioridade (muda muito ainda).

### 2. Navegação entre seções — **Obrigatório**
- **Descrição:** React Router conectando Catálogo, Player (rota de detalhe) e Favoritos.
- **Responsabilidade:** `app/router`.
- **Componentes envolvidos:** `TopBar` (links), páginas de cada feature.
- **Dados necessários:** nenhum.
- **Dependências:** React Router.
- **Critérios de aceitação:** URL muda ao navegar; botão voltar do navegador funciona; rota inexistente mostra 404 própria.
- **Testes esperados:** teste de integração (RTL + `MemoryRouter`) navegando entre 2 rotas e verificando o conteúdo renderizado.

### 3. Catálogo fictício — **Obrigatório**
- **Descrição:** lista de "canais" fictícios carregada de um JSON mock local.
- **Responsabilidade:** `features/catalog/services/loadCatalog`, `features/catalog/hooks/useCatalog`.
- **Componentes envolvidos:** `ChannelGrid`, `ChannelCard`.
- **Dados necessários:** `mocks/catalog.json` (nomes, categoria, thumbnail — tudo fictício/gerado).
- **Dependências:** Zod (validação do shape do mock).
- **Critérios de aceitação:** lista renderiza; estado de carregamento visível brevemente (mesmo que o mock resolva rápido, simular latência mínima para exercitar o estado); card exibe nome/categoria/imagem.
- **Testes esperados:** teste unitário do parser Zod (shape válido passa, shape inválido rejeita com mensagem clara); teste de render do `ChannelGrid` com dado mock.

### 4. Categorias e filtros — **Obrigatório**
- **Descrição:** pílulas/abas de categoria filtrando o catálogo.
- **Responsabilidade:** `features/categories`.
- **Componentes envolvidos:** `CategoryFilter`, reaproveita `ChannelGrid`.
- **Dados necessários:** lista de categorias derivada do próprio catálogo (sem hardcode duplicado).
- **Dependências:** feature `catalog` (lê os dados, não os duplica).
- **Critérios de aceitação:** selecionar uma categoria filtra a grade instantaneamente (sem nova "requisição"); opção "Todos" sempre disponível.
- **Testes esperados:** teste unitário da função pura de filtro; teste de interação (clique na pílula → grade atualizada).

### 5. Busca — **Obrigatório**
- **Descrição:** campo de busca client-side sobre o catálogo já carregado (nome, insensível a maiúsculas/acentos).
- **Responsabilidade:** `features/search`.
- **Componentes envolvidos:** `SearchInput`, reaproveita `ChannelGrid`.
- **Dados necessários:** nenhum além do catálogo já em memória.
- **Dependências:** feature `catalog`.
- **Critérios de aceitação:** digitar filtra em tempo real; busca vazia mostra tudo; busca sem resultado mostra estado vazio claro (não uma grade em branco sem explicação).
- **Testes esperados:** teste unitário da função de normalização/match de texto; teste de interação (digitar → resultado filtrado).

### 6. Seleção de conteúdo — **Obrigatório**
- **Descrição:** clicar em um card leva à tela/estado de reprodução daquele item.
- **Responsabilidade:** integração `catalog` → `player` via rota (`/assistir/:id`) e estado global (Zustand: item ativo).
- **Componentes envolvidos:** `ChannelCard` (onClick), rota do player.
- **Dados necessários:** item selecionado (por id, resolvido contra o catálogo).
- **Dependências:** React Router, Zustand.
- **Critérios de aceitação:** navegar para um id inexistente mostra erro tratado, não tela em branco.
- **Testes esperados:** teste de integração (clicar no card → URL muda → player recebe o item certo).

### 7. Player de vídeo — **Obrigatório**
- **Descrição:** reprodução de uma mídia de demonstração HLS pública (ver ADR-005), com controles básicos nativos.
- **Responsabilidade:** `features/player`.
- **Componentes envolvidos:** `VideoPlayer`, `adapters/HlsAdapter`, `adapters/NativeAdapter`, hook `usePlayer`.
- **Dados necessários:** URL da mídia de demonstração (constante, documentada).
- **Dependências:** `hls.js` (lazy-loaded), elemento `<video>` nativo.
- **Critérios de aceitação:** reproduz; falha de rede simulada mostra erro tratado; trocar de item destrói a instância anterior do engine antes de criar a nova (lição direta da Fase 03 — sem isso, dois áudios tocam juntos).
- **Testes esperados:** teste unitário do adapter (mock de `hls.js`, verificando que `destroy()` é chamado na troca); teste manual documentado em `testing.md` para reprodução real (Vitest não substitui ver o vídeo tocando).

### 8. Loading e tratamento de erros — **Obrigatório (transversal)**
- **Descrição:** não é uma tela isolada — é o padrão `AsyncState<T>` (ver `architecture.md`) aplicado a catálogo e player.
- **Responsabilidade:** `lib/` (tipo compartilhado), cada feature implementa sua própria instância.
- **Componentes envolvidos:** `ui/Spinner`, `ui/ErrorMessage`, `ui/EmptyState`.
- **Dados necessários:** nenhum.
- **Dependências:** nenhuma externa.
- **Critérios de aceitação:** nenhuma tela fica "travada" sem feedback visual em loading/erro/vazio.
- **Testes esperados:** teste unitário garantindo que cada estado do `AsyncState` renderiza o componente visual correto.

### 9. Favoritos locais — **Obrigatório**
- **Descrição:** marcar/desmarcar um item como favorito, persistido em `localStorage`.
- **Responsabilidade:** `features/favorites`.
- **Componentes envolvidos:** botão de favorito no `ChannelCard`, página `/favoritos`.
- **Dados necessários:** lista de ids favoritados.
- **Dependências:** Zod (validar o que vem de `localStorage` — pode estar corrompido/de uma versão antiga, lição direta da auditoria).
- **Critérios de aceitação:** persiste entre recarregamentos de página; `localStorage` corrompido não quebra a aplicação (cai para lista vazia).
- **Testes esperados:** teste unitário do serviço de favoritos (toggle, leitura com dado corrompido); teste de integração (favoritar → recarregar estado → aparece em `/favoritos`).

### 10. Responsividade — **Obrigatório (transversal)**
- **Descrição:** toda tela utilizável de 360px (mobile pequeno) a desktop largo.
- **Responsabilidade:** Tailwind (`sm:`/`md:`/`lg:`) em cada componente, não uma feature separada.
- **Critérios de aceitação:** sem scroll horizontal em nenhuma largura testada; grade de catálogo reflui (1 coluna no mobile, N no desktop).
- **Testes esperados:** verificação manual documentada em `testing.md` (RTL não testa viewport real de forma significativa; Playwright futuro poderia, mas não é prioridade do MVP).

---

## Fora do MVP

### Opcional (candidatos ao Sprint 05, só se o MVP estiver sólido)
- Picture-in-Picture
- Theater Mode
- Espelhamento de tela
- Atalhos de teclado
- Navegação por D-pad/controle remoto
- EPG sintético (dados fictícios de programação)
- Layout dedicado para telas grandes (TV)

### Evolução futura (fora do escopo de qualquer sprint atual)
- App desktop via Tauri
- Backend próprio (NestJS/PostgreSQL) para favoritos compartilhados entre dispositivos
- Suporte a DASH/Shaka Player
- Múltiplos protocolos de cast (Chromecast/AirPlay)
- Catálogo real com metadados de terceiros (TMDB ou similar) — exigiria conta/chave própria e está fora do escopo educacional atual
- EPG multi-fonte real

### Deliberadamente excluído (não é "fora do escopo por enquanto" — é uma decisão definitiva)
- Qualquer fonte de IPTV, TV ao vivo real ou conteúdo protegido
- DRM de qualquer tipo
- Autenticação/contas de usuário (o próprio Saimo TV não tem; não há requisito que justifique)

---

## Plano de sprints

| Sprint | Entrega funcional verificável | Funcionalidades do MVP cobertas |
|---|---|---|
| **01 — Fundação** | App builda e roda localmente, layout principal visível, uma rota funcionando, testes configurados e passando (mesmo que triviais) | 1, 2 (parcial) |
| **02 — Catálogo** | Catálogo fictício navegável, com categorias e busca funcionando de ponta a ponta | 2 (completo), 3, 4, 5 |
| **03 — Player** | Selecionar um item reproduz a mídia de demonstração, com loading/erro tratados | 6, 7, 8 |
| **04 — Estado e preferências** | Favoritos persistem entre sessões; controles do player (volume, play/pause) funcionam e são testados | 9, controles de player |
| **05 — Experiência avançada** | Conforme aprovado após o MVP — não iniciado sem decisão explícita sobre quais itens "Opcionais" entram | (opcional, ver acima) |
| **06 — Qualidade e entrega** | Suite de testes completa rodando em CI local, acessibilidade revisada, build de produção gerado e documentado | 8, 10 (verificação final) |

Cada sprint só começa após relatório de entrega da anterior (Etapa 10) e autorização explícita para avançar (Etapa 5, item 10).

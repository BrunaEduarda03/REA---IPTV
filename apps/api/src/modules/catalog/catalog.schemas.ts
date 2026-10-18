/**
 * Contratos de validação usados pelas rotas do catálogo. Reexporta de
 * `@saimotv/shared` em vez de redefinir — o mesmo schema que valida aqui é
 * o que o frontend usa para tipar as respostas (ver ADR-009 em
 * docs/implementation/decisions.md). Este arquivo existe como o único
 * ponto que `catalog.routes.ts` precisa importar, mesmo que hoje seja
 * só um reexport.
 */
export { channelListQuerySchema, idParamSchema } from "@saimotv/shared";

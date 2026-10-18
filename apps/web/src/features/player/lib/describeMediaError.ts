/**
 * `MediaError.message` não é padronizado entre navegadores (alguns nem o
 * preenchem) — `.code` é a parte confiável da API nativa. Traduz esse
 * código para uma mensagem útil em português, em vez de expor o erro
 * técnico cru ao usuário final.
 */
export function describeMediaError(error: MediaError | null): string {
  if (!error) return "Não foi possível reproduzir este vídeo.";

  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "A reprodução foi interrompida.";
    case MediaError.MEDIA_ERR_NETWORK:
      return "Falha de rede ao carregar o vídeo.";
    case MediaError.MEDIA_ERR_DECODE:
      return "Não foi possível decodificar este vídeo.";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "Formato de vídeo não suportado por este navegador.";
    default:
      return "Não foi possível reproduzir este vídeo.";
  }
}

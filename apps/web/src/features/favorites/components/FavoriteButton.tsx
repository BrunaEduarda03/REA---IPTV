import { useFavoritesStore, useIsFavorite } from "../store/favoritesStore";

interface FavoriteButtonProps {
  channelId: string;
  channelName: string;
}

/**
 * Pensado para ser usado DENTRO de um `<Link>` clicável (o card do
 * catálogo inteiro navega para o detalhe) — por isso `stopPropagation` e
 * `preventDefault`: sem eles, clicar na estrela também navegaria para a
 * página de detalhes, um efeito colateral indesejado.
 */
export function FavoriteButton({ channelId, channelName }: FavoriteButtonProps) {
  const isFavorite = useIsFavorite(channelId);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(channelId);
      }}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remover ${channelName} dos favoritos` : `Favoritar ${channelName}`}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors ${
        isFavorite
          ? "bg-accent-muted text-accent"
          : "bg-surface-overlay text-text-muted hover:text-text-primary"
      }`}
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
    </button>
  );
}

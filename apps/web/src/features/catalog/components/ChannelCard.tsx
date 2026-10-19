import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Channel } from "@saimotv/shared";
import type { ViewMode } from "../store/catalogUiStore";
import { channelStatusLabel } from "../lib/statusLabels";

interface ChannelCardProps {
  channel: Channel;
  viewMode?: ViewMode;
  /**
   * Slot de composição (ex.: `FavoriteButton`) — o catálogo NUNCA importa a
   * feature `favorites` diretamente; quem usa `ChannelCard` (uma página em
   * `app/pages/`) é quem decide se/qual ação extra aparece no card. Mantém
   * `features/catalog` e `features/favorites` desacopladas uma da outra
   * (ver docs/implementation/architecture.md, "Princípios arquiteturais").
   */
  actions?: ReactNode;
}

/**
 * Um único componente para os dois modos de visualização (em vez de
 * `ChannelCardGrid`/`ChannelCardList` separados): a diferença é só layout
 * (coluna vs. linha), o conteúdo e o comportamento são idênticos — manter
 * um componente evita duplicar a lógica de status/destaque em dois lugares.
 */
export function ChannelCard({ channel, viewMode = "grid", actions }: ChannelCardProps) {
  const isList = viewMode === "list";

  return (
    <Link
      to={`/catalogo/${channel.id}`}
      className={`group flex gap-3 rounded-token border border-transparent p-2 transition-colors hover:border-border hover:bg-surface-raised ${
        isList ? "flex-row items-center" : "flex-col"
      }`}
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-token bg-surface-overlay ${
          isList ? "aspect-video w-32" : "aspect-video w-full"
        }`}
      >
        <img
          src={channel.tmdb?.backdropUrl ?? channel.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {actions && <div className="absolute right-1.5 top-1.5">{actions}</div>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-text-primary">{channel.name}</h3>
          {channel.isFeatured && (
            <span className="shrink-0 rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              Destaque
            </span>
          )}
        </div>
        <p className={`text-xs text-text-secondary ${isList ? "line-clamp-2" : "mt-1 line-clamp-2"}`}>
          {channel.description}
        </p>
        {channel.status !== "available" && (
          <span className="mt-1 inline-block text-[10px] font-medium text-text-muted">
            {channelStatusLabel[channel.status]}
          </span>
        )}
      </div>
    </Link>
  );
}

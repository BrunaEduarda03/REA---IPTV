import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { Channel } from "@saimotv/shared";
import { ChannelCard } from "./ChannelCard";
import { mockFeaturedChannel, mockComingSoonChannel } from "@/tests/catalogFixtures";

function renderCard(channel: Channel = mockFeaturedChannel) {
  return render(
    <MemoryRouter>
      <ChannelCard channel={channel} />
    </MemoryRouter>,
  );
}

describe("ChannelCard", () => {
  test("renderiza nome e descrição do conteúdo", () => {
    renderCard();
    expect(screen.getByText("Horizonte Azul")).toBeInTheDocument();
    expect(screen.getByText(/expedições pelo mundo/i)).toBeInTheDocument();
  });

  test("mostra o selo de destaque quando isFeatured é verdadeiro", () => {
    renderCard(mockFeaturedChannel);
    expect(screen.getByText(/destaque/i)).toBeInTheDocument();
  });

  test("não mostra o selo de destaque quando isFeatured é falso", () => {
    renderCard(mockComingSoonChannel);
    expect(screen.queryByText(/destaque/i)).not.toBeInTheDocument();
  });

  test("mostra o rótulo de status quando diferente de 'available'", () => {
    renderCard(mockComingSoonChannel);
    expect(screen.getByText(/em breve/i)).toBeInTheDocument();
  });

  test("aponta para a rota de detalhes do conteúdo", () => {
    renderCard(mockFeaturedChannel);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/catalogo/ch-01");
  });
});

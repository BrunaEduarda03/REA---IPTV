import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MoviePosterCard } from "./MoviePosterCard";
import { mockMovieA, mockMovieB } from "@/tests/moviesFixtures";

function renderCard(movie = mockMovieA) {
  return render(
    <MemoryRouter>
      <MoviePosterCard movie={movie} />
    </MemoryRouter>,
  );
}

describe("MoviePosterCard", () => {
  test("renderiza título e metadados (ano · primeiro gênero)", () => {
    renderCard();
    expect(screen.getByText("Um Filme de Teste")).toBeInTheDocument();
    expect(screen.getByText("2012 · Animação")).toBeInTheDocument();
  });

  test("usa o pôster real (posterUrl, retrato) como imagem, não o backdrop", () => {
    const { container } = renderCard(mockMovieA);
    expect(container.querySelector("img")).toHaveAttribute("src", mockMovieA.posterUrl);
  });

  test("mostra a nota real quando presente", () => {
    renderCard(mockMovieA);
    expect(screen.getByText("★ 7.8")).toBeInTheDocument();
  });

  test("sem pôster, mostra um placeholder (nunca uma imagem quebrada); sem nota, não mostra o selo", () => {
    const { container } = renderCard(mockMovieB);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText(/sem pôster/i)).toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  test("aponta para a rota de detalhes do filme", () => {
    renderCard(mockMovieA);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/filmes/movie-a");
  });
});

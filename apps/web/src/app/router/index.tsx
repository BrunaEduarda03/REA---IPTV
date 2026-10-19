import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/app/pages/HomePage";
import { CatalogPage } from "@/app/pages/CatalogPage";
import { ChannelDetailPage } from "@/app/pages/ChannelDetailPage";
import { MoviesPage } from "@/app/pages/MoviesPage";
import { MovieDetailPage } from "@/app/pages/MovieDetailPage";
import { FavoritesPage } from "@/app/pages/FavoritesPage";
import { NotFoundPage } from "@/app/pages/NotFoundPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AppShell>
        <HomePage />
      </AppShell>
    ),
  },
  {
    path: "/catalogo",
    element: (
      <AppShell>
        <CatalogPage />
      </AppShell>
    ),
  },
  {
    path: "/catalogo/:id",
    element: (
      <AppShell>
        <ChannelDetailPage />
      </AppShell>
    ),
  },
  {
    path: "/filmes",
    element: (
      <AppShell>
        <MoviesPage />
      </AppShell>
    ),
  },
  {
    path: "/filmes/:id",
    element: (
      <AppShell>
        <MovieDetailPage />
      </AppShell>
    ),
  },
  {
    path: "/favoritos",
    element: (
      <AppShell>
        <FavoritesPage />
      </AppShell>
    ),
  },
  {
    path: "*",
    element: (
      <AppShell>
        <NotFoundPage />
      </AppShell>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

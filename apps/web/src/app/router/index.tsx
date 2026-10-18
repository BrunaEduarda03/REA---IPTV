import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { HomePage } from "@/app/pages/HomePage";
import { CatalogPage } from "@/app/pages/CatalogPage";
import { ChannelDetailPage } from "@/app/pages/ChannelDetailPage";
import { FavoritesPage } from "@/app/pages/FavoritesPage";
import { NotFoundPage } from "@/app/pages/NotFoundPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PageShell>
        <HomePage />
      </PageShell>
    ),
  },
  {
    path: "/catalogo",
    element: (
      <PageShell>
        <CatalogPage />
      </PageShell>
    ),
  },
  {
    path: "/catalogo/:id",
    element: (
      <PageShell>
        <ChannelDetailPage />
      </PageShell>
    ),
  },
  {
    path: "/favoritos",
    element: (
      <PageShell>
        <FavoritesPage />
      </PageShell>
    ),
  },
  {
    path: "*",
    element: (
      <PageShell>
        <NotFoundPage />
      </PageShell>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

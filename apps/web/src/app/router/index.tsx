import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { HomePage } from "@/app/pages/HomePage";
import { CatalogPage } from "@/app/pages/CatalogPage";
import { ChannelDetailPage } from "@/app/pages/ChannelDetailPage";
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

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { HomePage } from "@/app/pages/HomePage";
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

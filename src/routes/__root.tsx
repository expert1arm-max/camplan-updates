import { useEffect, type ReactNode } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { bootstrapStore, useStore } from "@/data/store";

const csp = import.meta.env.DEV
  ? [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self' ws://127.0.0.1:5173 http://127.0.0.1:5173",
      "object-src 'none'",
    ].join("; ")
  : [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "object-src 'none'",
    ].join("; ");

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Запрошенная страница не существует или была перемещена.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { httpEquiv: "Content-Security-Policy", content: csp },
      { title: "CCTV Manager" },
      {
        name: "description",
        content: "Desktop-приложение для объектов, планов и камер видеонаблюдения.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "CCTV Manager" },
      {
        property: "og:description",
        content: "Desktop-приложение для объектов, планов и камер видеонаблюдения.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const isEditMode = useStore((state) => state.isEditMode);
  const isHydrated = useStore((state) => state.isHydrated);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const copySelected = useStore((state) => state.copySelected);
  const pasteClipboard = useStore((state) => state.pasteClipboard);

  useEffect(() => {
    void bootstrapStore();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isEditable) return;

      const shortcutKey = event.key.toLowerCase();
      if (!(event.ctrlKey || event.metaKey)) return;
      if (!isEditMode) return;

      if (shortcutKey === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (shortcutKey === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (shortcutKey === "c") {
        event.preventDefault();
        copySelected();
        return;
      }

      if (shortcutKey === "v") {
        event.preventDefault();
        pasteClipboard();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelected, isEditMode, pasteClipboard, redo, undo]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Загрузка проекта...
      </div>
    );
  }

  return <Outlet />;
}

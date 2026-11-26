import "./lib/error-capture";

import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function resolveExePath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "ProChess.exe"),
    path.resolve(process.cwd(), "release", "ProChess Portable 1.0.0.exe"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Hosting compresses every response at the edge. Never compress a body (gzip, brotli,
// CompressionStream) or set content-encoding here or in a server route: the body gets encoded
// twice and renders garbled.
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (
        url.pathname === "/download/ProChess.exe" &&
        (request.method === "GET" || request.method === "HEAD")
      ) {
        const exePath = resolveExePath();
        if (!exePath) {
          return new Response("ProChess.exe не найден на сервере.", {
            status: 404,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        const stat = fs.statSync(exePath);
        const headers = {
          "content-type": "application/vnd.microsoft.portable-executable",
          "content-disposition": 'attachment; filename="ProChess.exe"',
          "content-length": String(stat.size),
          "cache-control": "no-cache",
        };
        if (request.method === "HEAD") {
          return new Response(null, { status: 200, headers });
        }
        const stream = Readable.toWeb(fs.createReadStream(exePath)) as ReadableStream<Uint8Array>;
        return new Response(stream, { status: 200, headers });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

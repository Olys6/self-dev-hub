import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/mcp/server";

export const runtime = "nodejs";

function isAuthorized(req: Request): boolean {
  const token = process.env.MCP_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

async function handle(req: Request): Promise<Response> {
  if (!isAuthorized(req)) return unauthorized();

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: one server+transport per request
    // Plain JSON responses instead of a lingering SSE stream — these tools
    // never push server-initiated notifications, and an SSE response that
    // never explicitly completes was blocking connection reuse for
    // subsequent requests once proxied through Caddy (fine direct/on
    // localhost, hung for ~60s in production behind the reverse proxy).
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function POST(req: Request) {
  return handle(req);
}

// No GET support: the transport's GET handler opens a long-lived SSE stream
// for server-initiated push notifications, which none of these tools use —
// it just sits open forever. Real client (MCP client, claude.ai connector)
// falls back to request/response-only fine without it; letting it open was
// tying up a connection that follow-up POSTs then queued behind once
// proxied through Caddy.
export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}

export async function DELETE(req: Request) {
  return handle(req);
}

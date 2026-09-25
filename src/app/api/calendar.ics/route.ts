import { getAllData } from "@/lib/data";
import { buildICS } from "@/lib/ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = process.env.CALENDAR_FEED_TOKEN;
  const provided = new URL(req.url).searchParams.get("token");
  if (!token || provided !== token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { items } = await getAllData();
  const upcoming = items.filter((i) => !i.done);
  const ics = buildICS(upcoming);

  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}

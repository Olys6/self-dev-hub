import { getAllData } from "@/lib/data";
import { Dashboard } from "@/components/Dashboard";

// Reads the live SQLite db directly (not via fetch), which Next's automatic
// static/dynamic detection doesn't see — without this, production builds
// would prerender the dashboard once and freeze it at build-time data.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { items, projects } = await getAllData();
  return <Dashboard items={items} projects={projects} nowISO={new Date().toISOString()} />;
}

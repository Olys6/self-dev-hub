import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAllData } from "@/lib/data";
import { deriveDashboard } from "@/lib/derive";
import { todayISO } from "@/lib/dates";
import {
  toggleItemDone,
  moveTaskColumn,
  updateItemSchedule,
  dropItem,
  renameItem,
  addProjectTask,
  createProject,
  deleteProject,
  createItem,
} from "@/lib/actions";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function createMcpServer() {
  const server = new McpServer({ name: "self-dev-hub", version: "0.1.0" });

  // --- read tools ---

  server.registerTool(
    "get_dashboard",
    {
      title: "Get dashboard",
      description:
        "Today's hero task, up-next queue, carried-over/slipped items, the full day thread, and completion counts.",
    },
    async () => {
      const { items: allItems, projects: allProjects } = await getAllData();
      const data = deriveDashboard(allItems, allProjects, new Date());
      return textResult({
        dateLabel: data.dateLabel,
        hero: data.hero,
        nextUp: data.nextUp,
        slipped: data.slipped,
        thread: data.thread,
        doneCounts: data.doneCounts,
      });
    }
  );

  server.registerTool(
    "list_projects",
    { title: "List projects", description: "All active projects with task progress counts." },
    async () => {
      const { items: allItems, projects: allProjects } = await getAllData();
      const result = allProjects.map((p) => {
        const tasks = allItems.filter((i) => i.kind === "project" && i.projectId === p.id);
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          targetDate: p.targetDate,
          total: tasks.length,
          done: tasks.filter((t) => t.column === "done").length,
          doing: tasks.filter((t) => t.column === "doing").length,
        };
      });
      return textResult(result);
    }
  );

  server.registerTool(
    "get_project_board",
    {
      title: "Get project board",
      description: "Kanban columns (next/doing/done) and cards for one project.",
      inputSchema: { projectId: z.number().describe("Project id, from list_projects") },
    },
    async ({ projectId }) => {
      const { items: allItems, projects: allProjects } = await getAllData();
      const project = allProjects.find((p) => p.id === projectId);
      if (!project) return textResult({ error: `No project with id ${projectId}` });
      const tasks = allItems.filter((i) => i.kind === "project" && i.projectId === projectId);
      return textResult({
        project,
        next: tasks.filter((t) => t.column === "next"),
        doing: tasks.filter((t) => t.column === "doing"),
        done: tasks.filter((t) => t.column === "done"),
      });
    }
  );

  server.registerTool(
    "list_items",
    {
      title: "List items",
      description: "Query items (tasks/events) by kind, date range, or done status.",
      inputSchema: {
        kind: z.enum(["gym", "cook", "project", "misc"]).optional(),
        dateFrom: z.string().optional().describe("ISO date, inclusive"),
        dateTo: z.string().optional().describe("ISO date, inclusive"),
        done: z.boolean().optional(),
      },
    },
    async ({ kind, dateFrom, dateTo, done }) => {
      const { items: allItems } = await getAllData();
      const result = allItems.filter((i) => {
        if (kind && i.kind !== kind) return false;
        if (dateFrom && i.date < dateFrom) return false;
        if (dateTo && i.date > dateTo) return false;
        if (done !== undefined && i.done !== done) return false;
        return true;
      });
      return textResult(result);
    }
  );

  server.registerTool(
    "get_meal_plan",
    {
      title: "Get meal plan",
      description: "Upcoming Mealie-synced meals for the next N days (default 7).",
      inputSchema: { days: z.number().int().positive().optional() },
    },
    async ({ days }) => {
      const { items: allItems } = await getAllData();
      const today = todayISO();
      const meals = allItems
        .filter((i) => i.kind === "cook" && i.date >= today)
        .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
        .slice(0, (days ?? 7) * 3);
      return textResult(meals);
    }
  );

  // --- write tools ---

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description: "Create a new finite project (a kanban board with a name, colour, and optional target date).",
      inputSchema: {
        name: z.string(),
        color: z.enum(["accent", "accent2", "neutral"]).optional(),
        targetDate: z.string().nullable().optional().describe("ISO date"),
      },
    },
    async ({ name, color, targetDate }) => {
      await createProject({ name, color: color ?? "accent", targetDate: targetDate ?? null });
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "delete_project",
    {
      title: "Delete project",
      description: "Permanently delete a project and all of its tasks.",
      inputSchema: { projectId: z.number() },
    },
    async ({ projectId }) => {
      await deleteProject(projectId);
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "add_project_task",
    {
      title: "Add project task",
      description: "Add a kanban card to a project's board.",
      inputSchema: {
        projectId: z.number(),
        title: z.string(),
        column: z.enum(["next", "doing", "done"]).optional(),
      },
    },
    async ({ projectId, title, column }) => {
      await addProjectTask({ projectId, title, column: column ?? "next" });
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "move_task",
    {
      title: "Move task",
      description: "Move a project task to a different kanban column.",
      inputSchema: { id: z.number(), column: z.enum(["next", "doing", "done"]) },
    },
    async ({ id, column }) => {
      await moveTaskColumn(id, column);
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "toggle_item_done",
    {
      title: "Toggle item done",
      description: "Flip an item's done state.",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => {
      await toggleItemDone(id);
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "reschedule_item",
    {
      title: "Reschedule item",
      description: "Move an item to a different date and/or time.",
      inputSchema: {
        id: z.number(),
        date: z.string().describe("ISO date"),
        time: z.string().nullable().optional().describe("HH:MM, or null for all-day"),
      },
    },
    async ({ id, date, time }) => {
      await updateItemSchedule(id, date, time ?? null);
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "rename_item",
    {
      title: "Rename item",
      description: "Change an item's title.",
      inputSchema: { id: z.number(), title: z.string() },
    },
    async ({ id, title }) => {
      await renameItem(id, title);
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "delete_item",
    {
      title: "Delete item",
      description: "Permanently remove an item.",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => {
      await dropItem(id);
      return textResult({ ok: true });
    }
  );

  server.registerTool(
    "create_item",
    {
      title: "Create item",
      description:
        "Create a new task/event (gym, cook, or misc). For project tasks use add_project_task instead so it lands on the kanban board.",
      inputSchema: {
        title: z.string(),
        kind: z.enum(["gym", "cook", "misc"]),
        date: z.string().describe("ISO date"),
        time: z.string().nullable().optional().describe("HH:MM, or null for all-day"),
        meta: z.string().nullable().optional().describe("subtitle, e.g. 'OpenGym · 48 min'"),
      },
    },
    async ({ title, kind, date, time, meta }) => {
      await createItem({ title, kind, date, time: time ?? null, meta: meta ?? null });
      return textResult({ ok: true });
    }
  );

  return server;
}

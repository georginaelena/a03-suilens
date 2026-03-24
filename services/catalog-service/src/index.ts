import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { db } from "./db";
import { lenses } from "./db/schema";
import { eq } from "drizzle-orm";

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: "Suilens Catalog Service API",
          version: "1.0.0",
          description: "Catalog endpoints for camera lens listings.",
        },
        tags: [{ name: "Lenses" }, { name: "Health" }],
      },
      path: "/docs",
    }),
  )
  .get(
    "/api/lenses",
    async () => {
      return db.select().from(lenses);
    },
    {
      detail: {
        tags: ["Lenses"],
        summary: "List all lenses",
      },
    },
  )
  .get(
    "/api/lenses/:id",
    async ({ params }) => {
      const results = await db
        .select()
        .from(lenses)
        .where(eq(lenses.id, params.id));
      if (!results[0]) {
        return new Response(JSON.stringify({ error: "Lens not found" }), {
          status: 404,
        });
      }
      return results[0];
    },
    {
      detail: {
        tags: ["Lenses"],
        summary: "Get lens by id",
      },
    },
  )
  .get(
    "/health",
    () => ({ status: "ok", service: "catalog-service" }),
    {
      detail: {
        tags: ["Health"],
        summary: "Catalog service health check",
      },
    },
  )
  .listen(3001);

console.log(`Catalog Service running on port ${app.server?.port}`);

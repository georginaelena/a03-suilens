import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { desc } from "drizzle-orm";
import { startConsumer, type OrderPlacedEvent } from "./consumer";
import { db } from "./db";
import { notifications } from "./db/schema";

const connectedClients = new Set<any>();

function broadcastOrderPlaced(event: OrderPlacedEvent) {
  const payload = JSON.stringify(event);
  for (const client of connectedClients) {
    client.send(payload);
  }
}

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: "Suilens Notification Service API",
          version: "1.0.0",
          description:
            "Notification endpoints with WebSocket stream for live updates.",
        },
        tags: [
          { name: "Notifications" },
          { name: "Realtime" },
          { name: "Health" },
        ],
      },
      path: "/docs",
    }),
  )
  .get(
    "/api/notifications",
    async () => {
      return db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.sentAt))
        .limit(50);
    },
    {
      detail: {
        tags: ["Notifications"],
        summary: "List recent notifications",
      },
    },
  )
  .ws("/ws", {
    open(ws) {
      connectedClients.add(ws);
    },
    close(ws) {
      connectedClients.delete(ws);
    },
  })
  .get(
    "/health",
    () => ({ status: "ok", service: "notification-service" }),
    {
      detail: {
        tags: ["Health"],
        summary: "Notification service health check",
      },
    },
  )
  .listen(3003);

startConsumer(broadcastOrderPlaced).catch(console.error);

console.log(`Notification Service running on port ${app.server?.port}`);

import amqplib from "amqplib";
import { db } from "./db";
import { notifications } from "./db/schema";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = "suilens.events";
const QUEUE_NAME = "notification-service.order-events";

export interface OrderPlacedEvent {
  event: "order.placed";
  timestamp: string;
  data: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    lensName: string;
  };
}

export async function startConsumer(
  onOrderPlaced?: (event: OrderPlacedEvent) => void,
) {
  let retries = 0;
  const maxRetries = 10;
  const retryDelay = 2000;

  while (retries < maxRetries) {
    try {
      const connection = await amqplib.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "order.*");

      console.log(`Notification Service listening on queue: ${QUEUE_NAME}`);

      channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString());
          console.log(`Received event: ${event.event}`, event.data);

          if (event.event === "order.placed") {
            const { orderId, customerName, customerEmail, lensName } =
              event.data;

            await db.insert(notifications).values({
              orderId,
              type: "order_placed",
              recipient: customerEmail,
              message: `Hi ${customerName}, your rental order for ${lensName} has been placed successfully. Order ID: ${orderId}`,
            });

            console.log(`Notification recorded for order ${orderId}`);
            onOrderPlaced?.(event as OrderPlacedEvent);
          }

          channel.ack(msg);
        } catch (error) {
          console.error("Error processing message:", error);
          channel.nack(msg, false, true);
        }
      });

      return;
    } catch (error) {
      retries++;
      console.warn(
        `Failed to connect to RabbitMQ (attempt ${retries}/${maxRetries}):`,
        (error as Error).message,
      );
      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error(
    "Failed to connect to RabbitMQ after maximum retries. Continuing without consumer.",
  );
}

<template>
  <v-container class="py-8" max-width="800">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Live Order Notifications</span>
        <v-chip size="small" :color="isConnected ? 'success' : 'warning'">
          {{ isConnected ? "Connected" : "Disconnected" }}
        </v-chip>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text class="py-6" style="min-height: 500px">
        <div
          v-if="notifications.length === 0"
          class="text-center text-grey py-8"
        >
          <p class="text-sm">No notifications yet</p>
        </div>

        <div v-else>
          <div
            v-for="(notification, index) in notifications"
            :key="index"
            class="mb-4 pb-4"
            :style="
              index < notifications.length - 1
                ? 'border-bottom: 1px solid #eee;'
                : ''
            "
          >
            <p class="text-sm ma-0">
              Order placed for {{ notification.data.lensName }} by
              {{ notification.data.customerName }}
            </p>
            <p class="text-xs text-grey-darken-1 mt-1">
              {{ formatTime(notification.timestamp) }}
            </p>
          </div>
        </div>
      </v-card-text>

      <v-divider v-if="notifications.length > 0"></v-divider>
      <v-card-actions v-if="notifications.length > 0">
        <v-spacer></v-spacer>
        <v-btn size="small" variant="text" @click="clearNotifications">
          Clear
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const notifications = ref([]);
const isConnected = ref(false);

const WS_URL = import.meta.env.VITE_NOTIFICATION_WS || "ws://localhost:3003/ws";

let ws = null;
let reconnectTimer = null;
let isUnmounted = false;

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    isConnected.value = true;
  };

  ws.onclose = () => {
    isConnected.value = false;
    if (!isUnmounted) {
      reconnectTimer = setTimeout(connectWebSocket, 1500);
    }
  };

  ws.onerror = () => {
    isConnected.value = false;
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.event === "order.placed") {
        notifications.value.unshift(payload);
        notifications.value = notifications.value.slice(0, 20);
      }
    } catch (error) {
      console.error("Invalid websocket payload", error);
    }
  };
}

onMounted(() => {
  connectWebSocket();
});

onBeforeUnmount(() => {
  isUnmounted = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
});

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function clearNotifications() {
  notifications.value = [];
}
</script>

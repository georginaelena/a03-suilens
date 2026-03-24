# A03 Suilens - API Documentation & Kubernetes Deployment

## Author

*Georgina Elena Shinta Dewi Achti*  
NPM: 2206810995  

**Deskripsi:**

Repository ini berisi aplikasi Suilens berbasis microservices dengan implementasi OpenAPI documentation, WebSocket real-time notifications, dan Kubernetes deployment.

**Stack Teknologi:**
- Backend: Bun runtime, Elysia framework, TypeScript
- Frontend: Vue 3, Vite, Vuetify
- Database: PostgreSQL (3 instance)
- Event Bus: RabbitMQ
- Container: Docker, Kubernetes (kind)

**Microservices:**
- `catalog-service` (port `3001`) - Inventaris lensa
- `order-service` (port `3002`) - Manajemen pesanan
- `notification-service` (port `3003`) - Notifikasi real-time
- `frontend` (port `5173`) - UI Vue.js

---

## Checklist Requirement

- ✅ Dokumentasi OpenAPI diimplementasikan di semua endpoint
- ✅ Notifikasi WebSocket real-time saat pemesanan dibuat
- ✅ Local Kubernetes cluster (1 control-plane + 2 worker nodes)
- ✅ Format namespace deployment: `suilens-2206810995`
- ✅ Screenshot bukti disertakan di bawah

---

## STEP 1: Setup Pengembangan Lokal

### 1.1 Jalankan dengan Docker Compose

```bash
docker compose up --build -d
```

### 1.2 Migrasi Database & Seed

```bash
(cd services/catalog-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/order-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/notification-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/catalog-service && bun run src/db/seed.ts)
```

---

## STEP 2: Bukti Dokumentasi OpenAPI

Semua service menampilkan dokumentasi OpenAPI/Swagger di endpoint `/docs`. Akses via:
- Catalog Service: `http://localhost:3001/docs`
- Order Service: `http://localhost:3002/docs`
- Notification Service: `http://localhost:3003/docs`

**Endpoint yang Terdokumentasi:**
- **Catalog Service**: `GET /api/lenses`, `GET /api/lenses/:id`, `GET /health`
- **Order Service**: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `GET /health`
- **Notification Service**: `GET /api/notifications`, `GET /health`, `WS /ws`

### Link Bukti (URL/Path Screenshot)

**Dokumentasi OpenAPI Catalog Service:**
![](https://i.imgur.com/VHObMXv.png)

**Dokumentasi OpenAPI Order Service:**
![](https://i.imgur.com/FjaLCBR.png)

**Dokumentasi OpenAPI Notification Service:**
![](https://i.imgur.com/PAH5m61.png)

---

## STEP 3: WebSocket Notifikasi Real-Time

### 3.1 Smoke Test WebSocket

1. Buka frontend di `http://localhost:5173`
2. Verifikasi panel **Live Order Notifications** kosong di awal
3. Jalankan command smoke test:

```bash
curl http://localhost:3001/api/lenses | jq
LENS_ID=$(curl -s http://localhost:3001/api/lenses | jq -r '.[0].id')

curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Georgina Elena Shinta Dewi Achti",
    "customerEmail": "2206810995@gmail.com",
    "lensId": '"'"'"$LENS_ID"'"'"',
    "startDate": "2026-03-24",
    "endDate": "2026-03-27"
  }' | jq
```

Bukti Run Command:
![](https://i.imgur.com/pZo6DfW.png)

4. Observasi: Setelah POST berhasil, notifikasi muncul **langsung** di frontend via WebSocket (`ws://localhost:3003/ws`)

### 3.2 Screenshot Bukti WebSocket

**Frontend SEBELUM POST /api/orders (notifikasi kosong):**
![](https://i.imgur.com/aANHxXV.png)

**Frontend SESUDAH POST /api/orders (notifikasi muncul via WebSocket):**
![](https://i.imgur.com/1TpeyRo.png)

---

## STEP 4: Deployment Kubernetes

Deployment dilakukan menggunakan cluster Kubernetes lokal di UTM dengan:

* 1 control-plane
* 2 worker
* Namespace: `suilens-2206810995`

---

### 4.1 Clone Repository

```bash
git clone https://github.com/georginaelena/a03-suilens
cd a03-suilens
```

---

### 4.2 Verifikasi Cluster

```bash
kubectl get nodes -o wide
kubectl cluster-info
```

Pastikan semua node `Ready`.

---

### 4.3 Buat Namespace

```bash
kubectl create namespace suilens-2206810995
```

Cek:

```bash
kubectl get ns
```

Bukti:

![](https://i.imgur.com/IpYSJtG.png)

---

### 4.4 Deploy Aplikasi

```bash
kubectl apply -f suilens.yaml
```

Bukti:

![](https://i.imgur.com/tlA78Xd.png)

---

### 4.5 Cek Pod

```bash
kubectl get pods -n suilens-2206810995 -o wide
```

Tunggu sampai semua `Running`:

```bash
kubectl get pods -n suilens-2206810995 -w
```

---

### 4.6 Cek Service

```bash
kubectl get svc -n suilens-2206810995
```

---

### 4.7 Port Forward

Buka beberapa terminal:

```bash
# Frontend
kubectl port-forward svc/frontend 5173:5173 -n suilens-2206810995

# Catalog
kubectl port-forward svc/catalog-service 3001:3001 -n suilens-2206810995

# Order
kubectl port-forward svc/order-service 3002:3002 -n suilens-2206810995

# Notification
kubectl port-forward svc/notification-service 3003:3003 -n suilens-2206810995
```

---

### 4.8 Akses Aplikasi

* Frontend:
  [http://localhost:5173](http://localhost:5173)

* Swagger Docs:

  * [http://localhost:3001/docs](http://localhost:3001/docs)
  * [http://localhost:3002/docs](http://localhost:3002/docs)
  * [http://localhost:3003/docs](http://localhost:3003/docs)

---

## STEP 5: Bukti Kubernetes

### 5.1 Output Status Pod

Jalankan dan screenshot output-nya:

```bash
kubectl get pods -n suilens-2206810995 -o wide
```

Ini memverifikasi semua service berhasil di-deploy (control-plane + 2 node worker).

**Screenshot: kubectl get pods -n suilens-2206810995 -o wide**
![](https://i.imgur.com/HIqQ9PV.png)
# A03 Suilens - API, WebSocket, and Kubernetes

Repository ini berisi aplikasi Suilens berbasis microservices:

- `catalog-service` (port `3001`)
- `order-service` (port `3002`)
- `notification-service` (port `3003`)
- `frontend` (port `5173`)

## 1) Menjalankan Dengan Docker Compose

```bash
docker compose up --build -d
```

## 2) Migrasi Database + Seed

```bash
(cd services/catalog-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/order-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/notification-service && bun install --frozen-lockfile && bunx drizzle-kit push)
(cd services/catalog-service && bun run src/db/seed.ts)
```

## 3) OpenAPI Documentation

OpenAPI docs tersedia untuk setiap service:

- Catalog Service: `http://localhost:3001/docs`
- Order Service: `http://localhost:3002/docs`
- Notification Service: `http://localhost:3003/docs`

Endpoint utama yang terdokumentasi:

- Catalog: `GET /api/lenses`, `GET /api/lenses/:id`, `GET /health`
- Order: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `GET /health`
- Notification: `GET /api/notifications`, `GET /health`, `WS /ws`

### Bukti yang harus disertakan di laporan

Ambil screenshot layar OpenAPI docs untuk masing-masing service.

## 4) WebSocket Smoke Test

1. Buka frontend di `http://localhost:5173`.
2. Pastikan panel **Live Order Notifications** awalnya kosong.
3. Jalankan smoke test di bawah (ganti nama dan email sesuai instruksi tugas):

```bash
curl http://localhost:3001/api/lenses | jq
LENS_ID=$(curl -s http://localhost:3001/api/lenses | jq -r '.[0].id')

curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "<NAMA_KAMU>",
    "customerEmail": "<NPM>@gmail.com",
    "lensId": '"'"'"$LENS_ID"'"'"',
    "startDate": "2026-03-24",
    "endDate": "2026-03-27"
  }' | jq
```

Setelah `POST /api/orders` sukses, notifikasi baru akan langsung muncul di frontend lewat WebSocket (`ws://localhost:3003/ws`).

## 5) Deployment ke Kubernetes Lokal

Manifest Kubernetes tersedia di `k8s/suilens.yaml`.

### 5.0 Khusus jika pakai UTM bekas tutorial

Kamu bisa lanjut dari VM UTM yang lama, tidak perlu install ulang semua dari nol.

Yang penting di VM tersebut sudah ada:

- Docker aktif
- `kubectl` aktif
- `kind` aktif

Cek cepat:

```bash
docker --version
kubectl version --client
kind version
```

Kalau command di atas keluar versi, lanjut ke langkah berikut.

### 5.1 Buat cluster (contoh pakai kind: 1 control-plane + 2 worker)

```bash
kind create cluster --name suilens-a03 --config k8s/kind-3nodes.yaml
kubectl cluster-info --context kind-suilens-a03
kubectl get nodes -o wide
```

### 5.2 Build image lokal

```bash
docker build -t suilens/catalog-service:latest ./services/catalog-service
docker build -t suilens/order-service:latest ./services/order-service
docker build -t suilens/notification-service:latest ./services/notification-service
docker build -t suilens/frontend:latest ./frontend/suilens-frontend
```

### 5.3 Load image ke kind

```bash
kind load docker-image suilens/catalog-service:latest --name suilens-a03
kind load docker-image suilens/order-service:latest --name suilens-a03
kind load docker-image suilens/notification-service:latest --name suilens-a03
kind load docker-image suilens/frontend:latest --name suilens-a03
```

### 5.4 Deploy manifest

Ganti namespace `suilens-yournpm` di `k8s/suilens.yaml` menjadi `suilens-<NPM>`.

```bash
kubectl apply -f k8s/suilens.yaml
kubectl get pods -n suilens-<NPM> -o wide
```

Jika pertama kali deploy, tunggu sampai semua pod status `Running` atau `Completed`:

```bash
kubectl get pods -n suilens-<NPM> -w
```

### 5.4.1 Migrasi database di dalam cluster

Setelah pod service jalan, jalankan migrasi schema dan seed data dari pod masing-masing service:

```bash
kubectl exec -n suilens-<NPM> deploy/catalog-service -- bunx drizzle-kit push
kubectl exec -n suilens-<NPM> deploy/order-service -- bunx drizzle-kit push
kubectl exec -n suilens-<NPM> deploy/notification-service -- bunx drizzle-kit push
kubectl exec -n suilens-<NPM> deploy/catalog-service -- bun run src/db/seed.ts
```

### 5.5 Port-forward (opsional untuk testing dari host)

```bash
kubectl port-forward -n suilens-<NPM> svc/catalog-service 3001:3001
kubectl port-forward -n suilens-<NPM> svc/order-service 3002:3002
kubectl port-forward -n suilens-<NPM> svc/notification-service 3003:3003
kubectl port-forward -n suilens-<NPM> svc/frontend 5173:5173
```

Lalu akses:

- Frontend: `http://localhost:5173`
- OpenAPI Catalog: `http://localhost:3001/docs`
- OpenAPI Order: `http://localhost:3002/docs`
- OpenAPI Notification: `http://localhost:3003/docs`

### 5.6 Troubleshooting cepat di UTM

Kalau ada pod `CrashLoopBackOff` atau `Error`, cek ini:

```bash
kubectl get pods -n suilens-<NPM>
kubectl describe pod -n suilens-<NPM> <POD_NAME>
kubectl logs -n suilens-<NPM> <POD_NAME> --tail=100
```

Kalau image tidak ketemu, biasanya lupa langkah `kind load docker-image ...`.

## 6) Evidence Checklist untuk Pengumpulan

- Screenshot OpenAPI docs `catalog-service`.
- Screenshot OpenAPI docs `order-service`.
- Screenshot OpenAPI docs `notification-service`.
- Screenshot frontend sebelum `POST /api/orders`.
- Screenshot frontend setelah `POST /api/orders` (notifikasi muncul).
- Screenshot output `kubectl get pods -o wide` pada namespace `suilens-<NPM>`.

## 7) Stop Environment

```bash
docker compose down
```

# UTM Setup Handoff (A03 Suilens)

Dokumen ini dibuat untuk bantu deploy project ini di UTM dengan langkah yang jelas.

## 1) Apa yang sudah diimplementasikan di project ini

Perubahan fitur:

- OpenAPI docs sudah aktif di semua service:
  - Catalog: `/docs`
  - Order: `/docs`
  - Notification: `/docs`
- WebSocket sudah aktif di notification-service pada endpoint `/ws`.
- Frontend sudah terhubung ke WebSocket dan akan menampilkan notifikasi live setelah `POST /api/orders`.
- README utama sudah diperbarui dengan langkah assignment (OpenAPI + WebSocket + Kubernetes).
- Manifest Kubernetes sudah dibuat di `k8s/suilens.yaml`.
- File config kind 3 node sudah dibuat di `k8s/kind-3nodes.yaml`.

Perubahan dependency:

- `@elysiajs/swagger` sudah ditambahkan di semua backend service.
- `@elysiajs/cors` ditambahkan di notification-service.
- lockfile Bun (`bun.lock`) untuk service sudah terbentuk.

Perubahan stabilitas:

- `jsconfig.json` frontend sudah diperbaiki untuk warning TypeScript deprecation.

## 2) Di UTM perlu clone lagi atau tidak?

Jawaban singkat:

- Kalau folder project ini SUDAH ADA di UTM dan isinya terbaru -> TIDAK perlu clone ulang.
- Kalau folder project ini BELUM ADA di UTM -> clone/fork repo dulu.

Cara cek cepat di UTM:

```bash
cd /path/ke/project/a03-suilens
ls
```

Kalau terlihat file berikut, berarti project sudah ada:

- `docker-compose.yml`
- `k8s/suilens.yaml`
- `k8s/kind-3nodes.yaml`
- `UTM-SETUP-HANDOFF.md`

Kalau belum ada, lakukan clone:

```bash
git clone <url-repo-kamu> a03-suilens
cd a03-suilens
```

## 3) Prasyarat di UTM

Pastikan command ini jalan:

```bash
docker --version
kubectl version --client
kind version
bun --version
```

Jika ada yang tidak ada, install dulu tools tersebut di UTM.

## 4) Jalankan versi Docker Compose (validasi fitur dulu)

Langkah ini untuk memastikan app terbaru berjalan sebelum ke Kubernetes:

```bash
cd /path/ke/a03-suilens
docker compose up --build -d
```

Lalu migrasi + seed:

```bash
(cd services/catalog-service && bunx drizzle-kit push)
(cd services/order-service && bunx drizzle-kit push)
(cd services/notification-service && bunx drizzle-kit push)
(cd services/catalog-service && bun run src/db/seed.ts)
```

Cek health:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/health
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/health
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3003/health
```

Semua harus `200`.

## 5) Deploy ke Kubernetes (yang diminta assignment)

### 5.1 Buat cluster kind (1 control-plane + 2 worker)

```bash
kind create cluster --name suilens-a03 --config k8s/kind-3nodes.yaml
kubectl cluster-info --context kind-suilens-a03
kubectl get nodes -o wide
```

### 5.2 Build image

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

### 5.4 Edit namespace tugas

Edit file `k8s/suilens.yaml`:

- ganti `suilens-2206810995` menjadi `suilens-<NPM_KAMU>`

### 5.5 Apply manifest

```bash
kubectl apply -f k8s/suilens.yaml
kubectl get pods -n suilens-<NPM_KAMU> -o wide
```

### 5.6 Migrasi + seed di dalam pod Kubernetes

```bash
kubectl exec -n suilens-<NPM_KAMU> deploy/catalog-service -- bunx drizzle-kit push
kubectl exec -n suilens-<NPM_KAMU> deploy/order-service -- bunx drizzle-kit push
kubectl exec -n suilens-<NPM_KAMU> deploy/notification-service -- bunx drizzle-kit push
kubectl exec -n suilens-<NPM_KAMU> deploy/catalog-service -- bun run src/db/seed.ts
```

### 5.7 Port-forward untuk test dari browser

Jalankan di terminal berbeda:

```bash
kubectl port-forward -n suilens-<NPM_KAMU> svc/catalog-service 3001:3001
kubectl port-forward -n suilens-<NPM_KAMU> svc/order-service 3002:3002
kubectl port-forward -n suilens-<NPM_KAMU> svc/notification-service 3003:3003
kubectl port-forward -n suilens-<NPM_KAMU> svc/frontend 5173:5173
```

Akses:

- Frontend: `http://localhost:5173`
- OpenAPI Catalog: `http://localhost:3001/docs`
- OpenAPI Order: `http://localhost:3002/docs`
- OpenAPI Notification: `http://localhost:3003/docs`

## 6) Smoke test untuk bukti websocket

```bash
curl http://localhost:3001/api/lenses | jq
LENS_ID=$(curl -s http://localhost:3001/api/lenses | jq -r '.[0].id')

curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "<NAMA_KAMU>",
    "customerEmail": "<NPM>@gmail.com",
    "lensId": "'"$LENS_ID"'",
    "startDate": "2026-03-24",
    "endDate": "2026-03-27"
  }'
```

Setelah POST sukses, notifikasi harus muncul di frontend (live via websocket).

## 7) Checklist bukti screenshot assignment

- OpenAPI Catalog (`/docs`)
- OpenAPI Order (`/docs`)
- OpenAPI Notification (`/docs`)
- Frontend sebelum POST (notif kosong)
- Frontend sesudah POST (notif muncul)
- Output `kubectl get pods -n suilens-<NPM_KAMU> -o wide`

## 8) Troubleshooting cepat

Jika pod error:

```bash
kubectl get pods -n suilens-<NPM_KAMU>
kubectl describe pod -n suilens-<NPM_KAMU> <POD_NAME>
kubectl logs -n suilens-<NPM_KAMU> <POD_NAME> --tail=100
```

Jika image tidak ketemu, ulang langkah `kind load docker-image ...`.

Jika API `500`, biasanya migrasi/seed belum dijalankan.

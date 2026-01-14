## Load Testing (Step 2)

### Tool choice (k6)
This repo uses k6 scripts under `tools/loadtests`.

### Catalog test (`GET /products`)
From repo root:
```powershell
k6 run .\tools\loadtests\catalog-products.k6.js
```

### Catalog test from inside Docker network (avoids localhost port-mapping bottlenecks)
```powershell
docker pull grafana/k6:latest
.\tools\loadtests\run-k6-in-docker.ps1 -BaseUrl http://catalog-lb:8080 -Mode constant -Rps 1000 -Duration 60s -P95ms 100
```

### Order test (`POST /orders`)
From repo root:
```powershell
k6 run .\tools\loadtests\order-create.k6.js
```

### Order test from inside Docker network (avoids localhost port-mapping bottlenecks)
```powershell
docker pull grafana/k6:latest
.\tools\loadtests\run-k6-in-docker.ps1 -BaseUrl http://order-lb:8081 -Script order-create.k6.js -Mode constant -Rps 100 -Duration 60s -P95ms 1000
```

### Scale services
```powershell
docker compose -f docker-compose.local.yml up -d --scale catalog-service=3
docker compose -f docker-compose.local.yml up -d --scale order-service=3
```

### Capture host metrics
```powershell
.\tools\loadtests\collect-docker-stats.ps1 -Seconds 600 -OutputPath .\tools\loadtests\docker-stats.csv
```

### Summarize docker stats
```powershell
.\tools\loadtests\summarize-docker-stats.ps1 -InputPath .\tools\loadtests\docker-stats.csv
```

### Postgres slow-query logs
Slow query logging is enabled in `docker-compose.local.yml` with:
- `log_min_duration_statement=200` (ms)

View logs:
```powershell
docker logs novamart-catalog-postgres
docker logs novamart-order-postgres
```

### Notes
- Adjust `stages` in k6 scripts to match your target RPS.
- Use `BASE_URL` env var to point at a different host/port.

### Inventory test (LocalStack Lambda invoke)
Inventory is serverless in local dev (LocalStack Lambda + DynamoDB).

```powershell
.\tools\loadtests\step2-inventory.ps1 -RpsList @(100,200,400,800) -Duration 60s -P95ms 500
```

### Inventory test (HTTP handler + DynamoDB Local) — recommended
Run the inventory handler as a real HTTP service (no LocalStack Lambda invoke bottleneck).

```powershell
.\tools\loadtests\step2-inventory-http.ps1 -RpsList @(100,200,400,800) -Duration 60s -P95ms 500
```

### Inventory scaling test (multiple inventory-service replicas)
Scales `inventory-service` replicas behind an Nginx LB and runs k6 from inside the Docker network.

```powershell
.\tools\loadtests\step2-inventory-http-scale.ps1 -Replicas 3 -RpsList @(200,400,600,800) -Duration 60s -P95ms 500
```

### Step 3 note: avoid LocalStack Lambda bottleneck for inventory
`docker-compose.local.yml` disables the LocalStack inventory Lambda and routes `order.placed` events to an SQS queue instead.
`inventory-worker` (a real Node process) consumes that SQS queue and runs the inventory handler code, then publishes `inventory.reserved` / `inventory.reservation_failed` back to EventBridge.
This preserves the event-driven architecture while avoiding the LocalStack Lambda invoke bottleneck for inventory.

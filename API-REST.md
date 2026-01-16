# FastBot REST API

API REST para controle externo do FastBot via HTTP.

## Configuração

### Iniciar o servidor API

```javascript
const FastBotAPIServer = require('./src/main/api-server');

const apiServer = new FastBotAPIServer({
  port: 3737,
  host: 'localhost',
  apiKey: 'your-secret-api-key' // Opcional, para autenticação
});

apiServer.start();
```

### Autenticação

Se você configurou uma API Key, inclua no header:

```
Authorization: Bearer your-secret-api-key
```

## Endpoints Disponíveis

### Health Check

```
GET /health
```

Resposta:
```json
{
  "status": "ok",
  "uptime": 12345.67,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### Informações do Sistema

```
GET /info
```

Resposta:
```json
{
  "name": "FastBot",
  "version": "1.0.5",
  "api_version": "1.0",
  "endpoints": [
    "GET:/health",
    "GET:/info",
    "POST:/macros/execute",
    ...
  ]
}
```

---

### Executar Macro

```
POST /macros/execute
Content-Type: application/json
```

Body:
```json
{
  "macroId": "uuid-do-macro",
  "instances": 3,
  "referralLinkId": "uuid-do-link",
  "proxyId": "uuid-do-proxy"
}
```

Resposta:
```json
{
  "success": true,
  "executionId": "exec_1705318200000",
  "macroId": "uuid-do-macro",
  "instances": 3,
  "status": "queued"
}
```

---

### Listar Macros

```
GET /macros
```

Resposta:
```json
{
  "macros": [
    {
      "id": "uuid",
      "name": "Macro Exemplo",
      "site_label": "Betano",
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### Status de Execução

```
GET /executions/:id
```

Resposta:
```json
{
  "id": "exec_1705318200000",
  "status": "running",
  "progress": 45,
  "startedAt": "2025-01-15T10:30:00.000Z",
  "currentStep": "Preenchendo formulário"
}
```

---

### Parar Execução

```
POST /executions/:id/stop
```

Resposta:
```json
{
  "success": true,
  "id": "exec_1705318200000",
  "status": "stopped"
}
```

---

### Estatísticas

```
GET /stats
```

Resposta:
```json
{
  "executions": {
    "total": 150,
    "success": 120,
    "failed": 30,
    "running": 0
  },
  "accounts": {
    "total": 450,
    "active": 380,
    "blocked": 70
  },
  "proxies": {
    "total": 100,
    "active": 95
  }
}
```

---

### Estatísticas do Cache

```
GET /cache/stats
```

Resposta:
```json
{
  "hits": 1245,
  "misses": 234,
  "sets": 1100,
  "evictions": 45,
  "hitRate": "84.16%",
  "namespaces": {
    "proxies": 50,
    "pix_keys": 30,
    "macros": 20
  },
  "totalItems": 100
}
```

---

### Limpar Cache

```
POST /cache/clear
```

Resposta:
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

---

## Exemplos de Uso

### cURL

```bash
# Health check
curl http://localhost:3737/health

# Executar macro (com autenticação)
curl -X POST http://localhost:3737/macros/execute \
  -H "Authorization: Bearer your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{"macroId": "abc-123", "instances": 3}'

# Ver estatísticas
curl http://localhost:3737/stats
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3737';
const API_KEY = 'your-secret-api-key';

// Executar macro
async function executeMacro(macroId, instances = 1) {
  try {
    const response = await axios.post(
      `${API_URL}/macros/execute`,
      {
        macroId,
        instances
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Execução iniciada:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

// Verificar status
async function checkExecution(executionId) {
  try {
    const response = await axios.get(
      `${API_URL}/executions/${executionId}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    console.log('Status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
  }
}

// Uso
(async () => {
  const result = await executeMacro('my-macro-id', 3);
  if (result) {
    const status = await checkExecution(result.executionId);
    console.log('Status da execução:', status);
  }
})();
```

### Python

```python
import requests
import json

API_URL = "http://localhost:3737"
API_KEY = "your-secret-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Executar macro
def execute_macro(macro_id, instances=1):
    response = requests.post(
        f"{API_URL}/macros/execute",
        headers=headers,
        json={
            "macroId": macro_id,
            "instances": instances
        }
    )
    return response.json()

# Verificar status
def check_execution(execution_id):
    response = requests.get(
        f"{API_URL}/executions/{execution_id}",
        headers=headers
    )
    return response.json()

# Uso
if __name__ == "__main__":
    result = execute_macro("my-macro-id", 3)
    print("Execução iniciada:", result)

    if result.get("success"):
        status = check_execution(result["executionId"])
        print("Status:", status)
```

---

## Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `204` - Sem conteúdo (operação bem-sucedida)
- `400` - Requisição inválida
- `401` - Não autorizado (API key inválida)
- `404` - Recurso não encontrado
- `500` - Erro interno do servidor
- `503` - Serviço indisponível

---

## Segurança

1. **API Key**: Sempre configure uma API key para ambientes de produção
2. **HTTPS**: Use HTTPS em produção (configure um proxy reverso como nginx)
3. **Rate Limiting**: Implemente rate limiting para prevenir abuso
4. **Firewall**: Restrinja acesso à API apenas para IPs confiáveis

### Exemplo com nginx (proxy reverso + HTTPS)

```nginx
server {
    listen 443 ssl;
    server_name api.fastbot.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3737;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Rate limiting
        limit_req zone=api burst=10 nodelay;
    }
}

# Rate limit zone
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
```

---

## Webhooks (Planejado)

Sistema de webhooks para notificações de eventos:

- Execução iniciada
- Execução concluída
- Execução falhou
- Conta criada
- Saque realizado

Configuração (futuro):
```json
{
  "webhookUrl": "https://seu-servidor.com/webhook",
  "events": ["execution.completed", "account.created"],
  "secret": "webhook-secret-key"
}
```

---

## Suporte

Para dúvidas ou problemas, consulte a documentação completa em `TODAS-FUNCIONALIDADES.md`.

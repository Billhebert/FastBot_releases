/**
 * FastBot REST API Server
 * API para controle externo via HTTP
 */

const http = require('http');
const { URL } = require('url');

class FastBotAPIServer {
  constructor(options = {}) {
    this.port = options.port || 3737;
    this.host = options.host || 'localhost';
    this.apiKey = options.apiKey || null;
    this.server = null;
    this.routes = new Map();
    this.middlewares = [];

    // Registrar rotas padrão
    this.registerDefaultRoutes();
  }

  /**
   * Middleware de autenticação
   */
  authMiddleware(req, res, next) {
    if (!this.apiKey) {
      return next(); // Sem autenticação configurada
    }

    const authHeader = req.headers['authorization'];
    const providedKey = authHeader?.replace('Bearer ', '');

    if (providedKey !== this.apiKey) {
      this.sendError(res, 401, 'Unauthorized: Invalid API key');
      return;
    }

    next();
  }

  /**
   * Middleware de CORS
   */
  corsMiddleware(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    next();
  }

  /**
   * Registrar rota
   */
  route(method, path, handler) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, handler);
  }

  /**
   * Adicionar middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * Registrar rotas padrão
   */
  registerDefaultRoutes() {
    // Health check
    this.route('GET', '/health', (req, res) => {
      this.sendJSON(res, 200, {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    // Informações do sistema
    this.route('GET', '/info', (req, res) => {
      this.sendJSON(res, 200, {
        name: 'FastBot',
        version: require('../../../package.json').version || '1.0.0',
        api_version: '1.0',
        endpoints: Array.from(this.routes.keys())
      });
    });

    // Executar macro
    this.route('POST', '/macros/execute', async (req, res) => {
      try {
        const body = await this.parseBody(req);

        if (!body.macroId) {
          return this.sendError(res, 400, 'macroId is required');
        }

        // Aqui você integraria com o sistema de execução de macros
        // Por enquanto, retorna sucesso simulado
        this.sendJSON(res, 200, {
          success: true,
          executionId: `exec_${Date.now()}`,
          macroId: body.macroId,
          instances: body.instances || 1,
          status: 'queued'
        });
      } catch (error) {
        this.sendError(res, 500, error.message);
      }
    });

    // Listar macros
    this.route('GET', '/macros', async (req, res) => {
      try {
        // Aqui você buscaria do banco de dados
        this.sendJSON(res, 200, {
          macros: [],
          total: 0
        });
      } catch (error) {
        this.sendError(res, 500, error.message);
      }
    });

    // Status de execução
    this.route('GET', '/executions/:id', (req, res) => {
      const executionId = req.params.id;

      this.sendJSON(res, 200, {
        id: executionId,
        status: 'running',
        progress: 0,
        startedAt: new Date().toISOString()
      });
    });

    // Parar execução
    this.route('POST', '/executions/:id/stop', (req, res) => {
      const executionId = req.params.id;

      this.sendJSON(res, 200, {
        success: true,
        id: executionId,
        status: 'stopped'
      });
    });

    // Estatísticas
    this.route('GET', '/stats', (req, res) => {
      this.sendJSON(res, 200, {
        executions: {
          total: 0,
          success: 0,
          failed: 0,
          running: 0
        },
        accounts: {
          total: 0,
          active: 0,
          blocked: 0
        },
        proxies: {
          total: 0,
          active: 0
        }
      });
    });

    // Cache stats
    this.route('GET', '/cache/stats', (req, res) => {
      if (global.cacheManager) {
        this.sendJSON(res, 200, global.cacheManager.getStats());
      } else {
        this.sendError(res, 503, 'Cache manager not available');
      }
    });

    // Limpar cache
    this.route('POST', '/cache/clear', (req, res) => {
      if (global.cacheManager) {
        global.cacheManager.clear();
        this.sendJSON(res, 200, { success: true, message: 'Cache cleared' });
      } else {
        this.sendError(res, 503, 'Cache manager not available');
      }
    });
  }

  /**
   * Parsear corpo da requisição
   */
  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Enviar resposta JSON
   */
  sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Enviar erro
   */
  sendError(res, status, message) {
    this.sendJSON(res, status, {
      error: true,
      status,
      message
    });
  }

  /**
   * Handler de requisições
   */
  async handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const path = parsedUrl.pathname;
    const method = req.method;

    // Executar middlewares
    let middlewareIndex = 0;
    const next = () => {
      if (middlewareIndex < this.middlewares.length) {
        const middleware = this.middlewares[middlewareIndex++];
        middleware(req, res, next);
      } else {
        this.routeRequest(req, res, method, path);
      }
    };

    next();
  }

  /**
   * Rotear requisição
   */
  async routeRequest(req, res, method, path) {
    // Tentar rota exata
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      try {
        await this.routes.get(exactKey)(req, res);
        return;
      } catch (error) {
        console.error('Route handler error:', error);
        this.sendError(res, 500, error.message);
        return;
      }
    }

    // Tentar rotas com parâmetros
    for (const [routeKey, handler] of this.routes) {
      const [routeMethod, routePath] = routeKey.split(':');

      if (routeMethod !== method) continue;

      const routeRegex = new RegExp('^' + routePath.replace(/:[^/]+/g, '([^/]+)') + '$');
      const match = path.match(routeRegex);

      if (match) {
        // Extrair parâmetros
        const paramNames = (routePath.match(/:[^/]+/g) || []).map(p => p.slice(1));
        req.params = {};
        paramNames.forEach((name, index) => {
          req.params[name] = match[index + 1];
        });

        try {
          await handler(req, res);
          return;
        } catch (error) {
          console.error('Route handler error:', error);
          this.sendError(res, 500, error.message);
          return;
        }
      }
    }

    // Rota não encontrada
    this.sendError(res, 404, 'Endpoint not found');
  }

  /**
   * Iniciar servidor
   */
  start() {
    if (this.server) {
      console.warn('[API] Servidor já está rodando');
      return;
    }

    // Adicionar middlewares padrão
    this.use(this.corsMiddleware.bind(this));
    this.use(this.authMiddleware.bind(this));

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(this.port, this.host, () => {
      console.log(`[API] FastBot API Server rodando em http://${this.host}:${this.port}`);
      console.log(`[API] Endpoints disponíveis: ${this.routes.size}`);
      if (this.apiKey) {
        console.log('[API] Autenticação habilitada (API Key)');
      }
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[API] Porta ${this.port} já está em uso`);
      } else {
        console.error('[API] Erro no servidor:', error);
      }
    });
  }

  /**
   * Parar servidor
   */
  stop() {
    if (!this.server) {
      console.warn('[API] Servidor não está rodando');
      return;
    }

    this.server.close(() => {
      console.log('[API] Servidor parado');
      this.server = null;
    });
  }
}

module.exports = FastBotAPIServer;

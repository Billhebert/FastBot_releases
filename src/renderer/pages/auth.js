// AUTH SIMPLES - SEM USAR AUTH DO SUPABASE
// Usa apenas tabela users normal

const PERMISSIONS = {
  dev: ["macros", "pix", "proxies", "passwords", "execute", "warmup", "registrations"],
  creator: ["macros", "pix"],
  consumer: ["proxies", "passwords", "pix", "execute", "registrations"],
};

window.APP_PERMISSIONS = PERMISSIONS;

async function signup(email, password) {
  try {
    // Hash da senha no cliente (básico)
    const passwordHash = btoa(password); // Trocar por bcrypt no servidor ideal

    const { data, error } = await supabaseClient
      .from("users")
      .insert({
        email: email,
        password_hash: passwordHash,
        role: "consumer",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(error.message || "Erro ao cadastrar");
  }
}

async function login(email, password) {
  try {
    const passwordHash = btoa(password);

    const { data, error } = await supabaseClient
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password_hash", passwordHash)
      .single();

    if (error || !data) {
      throw new Error("Email ou senha incorretos");
    }

    // Verificar acesso
    const now = new Date();
    const expiresAt = new Date(data.access_expires_at);

    if (now >= expiresAt) {
      throw new Error("Acesso expirado. Entre em contato com o administrador.");
    }

    const hasActive = await hasActiveSession(data.id);
    if (hasActive) {
      throw new Error("Este usuário já possui uma sessão ativa em outro dispositivo.");
    }

    const sessionToken = generateSessionToken();

    const { error: sessionError } = await supabaseClient
      .from("user_sessions")
      .insert({
        user_id: data.id,
        session_token: sessionToken,
      });

    if (sessionError) {
      throw sessionError;
    }

    persistUser({
      id: data.id,
      email: data.email,
      role: data.role,
      sessionToken,
    });

    return data;
  } catch (error) {
    throw new Error(error.message || "Erro ao fazer login");
  }
}

async function logout() {
  const stored = getCurrentUser();
  const token = stored?.sessionToken;

  if (token) {
    try {
      await supabaseClient
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("session_token", token)
        .is("revoked_at", null);
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
    }
  }

  localStorage.removeItem("user");
  window.location.href = "auth.html";
}

function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

async function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "auth.html";
    return null;
  }

  if (!(await isSessionActive(user.sessionToken))) {
    await logout();
    return null;
  }

  // Verificar se ainda tem acesso
  try {
    const { data } = await supabaseClient
      .from("users")
      .select("access_expires_at")
      .eq("id", user.id)
      .single();

    if (data) {
      const now = new Date();
      const expiresAt = new Date(data.access_expires_at);

      if (now >= expiresAt) {
        await logout();
        return null;
      }
    }
  } catch (error) {
    console.error("Erro ao verificar acesso:", error);
  }

  return user;
}

function hasPermission(page) {
  const user = getCurrentUser();
  if (!user) return false;

  return PERMISSIONS[user.role]?.includes(page);
}

function getDefaultPageForRole(role) {
  const allowed = PERMISSIONS[role] || [];
  if (!allowed.length) return "auth.html";
  return `${allowed[0]}.html`;
}

async function requirePagePermission(page) {
  const user = await requireAuth();
  if (!user) return null;

  if (!hasPermission(page)) {
    alert("Você não tem permissão para acessar esta página.");
    window.location.href = getDefaultPageForRole(user.role);
    return null;
  }

  return user;
}

function persistUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

function generateSessionToken() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

async function hasActiveSession(userId) {
  try {
    const { data } = await supabaseClient
      .from("user_sessions")
      .select("id")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error("Erro ao verificar sessões ativas:", error);
    return false;
  }
}

async function isSessionActive(sessionToken) {
  if (!sessionToken) {
    return false;
  }

  try {
    const { data } = await supabaseClient
      .from("user_sessions")
      .select("revoked_at")
      .eq("session_token", sessionToken)
      .single();

    if (!data || data.revoked_at) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

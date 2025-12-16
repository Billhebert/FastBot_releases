// AUTH SIMPLES - SEM USAR AUTH DO SUPABASE
// Usa apenas tabela users normal

const PERMISSIONS = {
  dev: ["macros", "pix", "proxies", "passwords", "execute", "warmup", "registrations"],
  creator: ["macros", "pix"],
  consumer: ["proxies", "passwords", "pix", "execute"],
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

    localStorage.setItem(
      "user",
      JSON.stringify({
        id: data.id,
        email: data.email,
        role: data.role,
      })
    );

    return data;
  } catch (error) {
    throw new Error(error.message || "Erro ao fazer login");
  }
}

async function logout() {
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

const fs = require('fs');
const path = require('path');
const os = require('os');

const PROFILES_DIR = path.join(os.homedir(), '.chrome-macro-profiles');

/**
 * Copia cookies e dados de sessão do profile-0 (gravação) para perfil de execução
 * Isso evita CAPTCHA pois reutiliza a sessão autenticada
 */
function syncCookiesFromRecording(targetProfileIndex) {
  const sourceProfile = path.join(PROFILES_DIR, 'profile-0');
  const targetProfile = path.join(PROFILES_DIR, `profile-${targetProfileIndex}`);
  
  console.log(`🍪 Sincronizando cookies: profile-0 → profile-${targetProfileIndex}`);
  
  if (!fs.existsSync(sourceProfile)) {
    console.log('⚠️  Profile de gravação não encontrado - primeiro grave um macro');
    return false;
  }
  
  // Criar perfil target se não existir
  if (!fs.existsSync(targetProfile)) {
    fs.mkdirSync(targetProfile, { recursive: true });
  }
  
  try {
    const sourceDefault = path.join(sourceProfile, 'Default');
    const targetDefault = path.join(targetProfile, 'Default');
    
    if (!fs.existsSync(targetDefault)) {
      fs.mkdirSync(targetDefault, { recursive: true });
    }
    
    // Arquivos críticos para copiar (cookies, sessão, cache)
    const filesToCopy = [
      'Cookies',
      'Cookies-journal',
      'Network/Cookies',
      'Local Storage',
      'Session Storage',
      'Web Data',
      'Web Data-journal'
    ];
    
    let copied = 0;
    
    filesToCopy.forEach(file => {
      const sourcePath = path.join(sourceDefault, file);
      const targetPath = path.join(targetDefault, file);
      
      if (fs.existsSync(sourcePath)) {
        try {
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          const stats = fs.lstatSync(sourcePath);
          
          if (stats.isDirectory()) {
            copyDirRecursive(sourcePath, targetPath);
          } else if (stats.isFile()) {
            fs.copyFileSync(sourcePath, targetPath);
          }
          
          copied++;
          console.log(`   ✅ ${file}`);
        } catch (err) {
          console.log(`   ⚠️  ${file}: ${err.message}`);
        }
      }
    });
    
    if (copied > 0) {
      console.log(`✅ ${copied} arquivos copiados - CAPTCHA evitado!`);
      return true;
    } else {
      console.log('⚠️  Nenhum arquivo copiado');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao copiar cookies:', error.message);
    return false;
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    try {
      if (entry.isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (err) {
      // Ignorar erros de arquivos em uso
    }
  }
}

module.exports = { syncCookiesFromRecording };
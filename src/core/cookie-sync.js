const fs = require('fs');
const path = require('path');
const os = require('os');

const PROFILES_DIR = path.join(os.homedir(), '.chrome-macro-profiles');
const FILES_TO_COPY = [
  'Cookies',
  'Cookies-journal',
  'Network/Cookies',
  'Local Storage',
  'Session Storage',
  'Web Data',
  'Web Data-journal'
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getProfileDefaultPath(index) {
  return path.join(PROFILES_DIR, `profile-${index}`, 'Default');
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    try {
      if (entry.isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        ensureDir(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (error) {
      // Ignorar arquivos bloqueados
    }
  }
}

function copyProfileArtifacts(sourceRoot, targetRoot, label) {
  if (!fs.existsSync(sourceRoot)) {
    console.log('  Perfil origem nao encontrado:', sourceRoot);
    return false;
  }

  ensureDir(targetRoot);

  let copied = 0;

  FILES_TO_COPY.forEach((relativePath) => {
    const sourcePath = path.join(sourceRoot, relativePath);
    const targetPath = path.join(targetRoot, relativePath);

    if (!fs.existsSync(sourcePath)) {
      return;
    }

    try {
      const stats = fs.lstatSync(sourcePath);
      ensureDir(path.dirname(targetPath));

      if (stats.isDirectory()) {
        copyDirRecursive(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }

      copied++;
      console.log(`    ${relativePath}`);
    } catch (error) {
      console.log(`     ${relativePath}: ${error.message}`);
    }
  });

  if (copied > 0) {
    console.log(` ${copied} artefatos copiados (${label})`);
    return true;
  }

  console.log('  Nenhum artefato copiado');
  return false;
}

function clearProfileData(targetRoot) {
  if (!targetRoot) return;

  try {
    if (fs.existsSync(targetRoot)) {
      fs.rmSync(targetRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(targetRoot, { recursive: true });
    console.log(` Sessao limpa em: ${targetRoot}`);
  } catch (error) {
    console.log(`  Nao foi possivel limpar ${targetRoot}: ${error.message}`);
  }
}

function syncCookiesFromRecording(targetProfileIndex) {
  console.log(` Sincronizando cookies: profile-0 -> profile-${targetProfileIndex}`);
  const sourceDefault = getProfileDefaultPath(0);
  const targetDefault = getProfileDefaultPath(targetProfileIndex);
  return copyProfileArtifacts(sourceDefault, targetDefault, `profile-${targetProfileIndex}`);
}

function syncPartitionFromRecording(partitionPath) {
  console.log(` Sincronizando cookies do profile-0 -> ${partitionPath}`);
  const sourceDefault = getProfileDefaultPath(0);
  return copyProfileArtifacts(sourceDefault, partitionPath, `partition ${path.basename(partitionPath)}`);
}

function syncRecordingFromPartition(partitionPath) {
  console.log(` Copiando cookies da particao -> profile-0`);
  const targetDefault = getProfileDefaultPath(0);
  return copyProfileArtifacts(partitionPath, targetDefault, 'profile-0');
}

module.exports = {
  syncCookiesFromRecording,
  syncPartitionFromRecording,
  syncRecordingFromPartition,
  clearProfileData,
  PROFILES_DIR
};

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

const binaryPath = path.join(__dirname, '..', 'cloudflared');
const downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';

function downloadBinary(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        downloadBinary(response.headers.location, destination).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Descarga de cloudflared falló con HTTP ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function ensureBinary() {
  if (fs.existsSync(binaryPath)) return;
  await downloadBinary(downloadUrl, binaryPath);
  fs.chmodSync(binaryPath, 0o755);
}

async function startCloudflareTunnel() {
  const token = process.env.CLOUDFLARE_TUNNEL_TOKEN;
  if (!token) return;
  if (process.platform !== 'linux') {
    console.warn('[CLOUDFLARE] El tunnel automático solo se inicia en Linux.');
    return;
  }

  try {
    await ensureBinary();
    const tunnel = spawn(binaryPath, ['tunnel', 'run', '--no-autoupdate', '--token', token], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    tunnel.stdout.on('data', (data) => console.log(`[CLOUDFLARE] ${data.toString().trim()}`));
    tunnel.stderr.on('data', (data) => console.error(`[CLOUDFLARE] ${data.toString().trim()}`));
    tunnel.on('error', (error) => console.error('[CLOUDFLARE] No se pudo iniciar:', error.message));
    tunnel.on('exit', (code) => console.error(`[CLOUDFLARE] El tunnel terminó con código ${code}.`));
  } catch (error) {
    console.error('[CLOUDFLARE] No se pudo preparar el tunnel:', error.message);
  }
}

module.exports = { startCloudflareTunnel };
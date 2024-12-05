const fs = require('fs');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const readline = require('readline');
const ora = require('ora');

// Konfigurasi konstanta
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 5000;
const API_BASE_URL = 'https://api.gradient.network';

// Fungsi untuk membaca dan validasi file konfigurasi
function readConfig(filename) {
    try {
        const content = fs.readFileSync(filename, 'utf-8');
        if (!content.includes('=')) {
            throw new Error(`Format file ${filename} tidak valid`);
        }
        return content.split('\n').reduce((acc, line) => {
            const [key, value] = line.split('=');
            if (!key || !value) {
                throw new Error(`Format baris tidak valid dalam ${filename}`);
            }
            acc[key.trim()] = value.trim();
            return acc;
        }, {});
    } catch (error) {
        console.error(`Error membaca file ${filename}:`, error.message);
        process.exit(1);
    }
}

// Baca konfigurasi
const config = readConfig('token.txt');
const proxyConfig = readConfig('proxy.txt');

// Validasi konfigurasi wajib
const ID_TOKEN = config.ID_TOKEN;
const USER_EMAIL = config.USER_EMAIL;
const PROXY_URL = proxyConfig.PROXY_URL;

if (!ID_TOKEN || !USER_EMAIL) {
    console.error('ID_TOKEN dan USER_EMAIL wajib diisi dalam file token.txt');
    process.exit(1);
}

// Buat interface readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Fungsi untuk delay antara retry
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi utama untuk koneksi ke network
async function connectToGradientNetwork(axiosInstance) {
    try {
        if (!ID_TOKEN) {
            throw new Error('ID Token tidak ditemukan di file konfigurasi');
        }

        const response = await axiosInstance.get(`${API_BASE_URL}/connect`, {
            params: { token: ID_TOKEN },
            timeout: REQUEST_TIMEOUT
        });

        if (response.status !== 200) {
            throw new Error(`Koneksi gagal dengan status: ${response.status}`);
        }

        // Ping untuk verifikasi koneksi
        const pingResponse = await axiosInstance.get(`${API_BASE_URL}/ping`, {
            params: { token: ID_TOKEN },
            timeout: REQUEST_TIMEOUT
        });

        console.log('='.repeat(50));
        console.log(`Node berjalan dengan ID: ${ID_TOKEN}`);
        console.log(`Email pengguna: ${USER_EMAIL}`);
        console.log('Ping berhasil:', pingResponse.data);
        console.log('='.repeat(50));

        return true;
    } catch (error) {
        console.error('Kesalahan saat menjalankan node:', error.message);
        if (error.response) {
            console.error('Response error:', error.response.data);
        }
        throw error;
    }
}

// Fungsi dengan mekanisme retry
async function connectWithRetry(axiosInstance) {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
        try {
            return await connectToGradientNetwork(axiosInstance);
        } catch (error) {
            retries++;
            console.error('Kesalahan:', error.message);
            
            if (error.response) {
                console.error('Response error:', error.response.data);
            }

            if (retries < MAX_RETRIES) {
                const waitTime = retries * 2000; // Meningkatkan waktu tunggu setiap retry
                console.log(`Mencoba koneksi ulang (${retries}/${MAX_RETRIES}) dalam ${waitTime/1000} detik...`);
                await delay(waitTime);
            } else {
                console.error('Gagal terhubung setelah', MAX_RETRIES, 'percobaan');
                return false;
            }
        }
    }
}

// Fungsi untuk validasi proxy URL
function validateProxyUrl(url) {
    if (!url) return false;
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}

// Main execution dengan animasi
rl.question('Apakah Anda ingin menggunakan proxy? (yes/no): ', async (answer) => {
    let axiosInstance;
    const spinner = ora('bot tod sedang menghubungkan ke Gradient Network...').start();

    if (answer.toLowerCase() === 'yes') {
        if (!validateProxyUrl(PROXY_URL)) {
            spinner.fail('Format proxy URL tidak valid. Gunakan format: http(s)://host:port');
            rl.close();
            return;
        }

        const agent = new HttpsProxyAgent(PROXY_URL);
        axiosInstance = axios.create({ 
            httpsAgent: agent,
            headers: {
                'User-Agent': 'GradientNetwork-Bot/1.0'
            }
        });
        spinner.info('Menggunakan proxy: ' + PROXY_URL);
    } else {
        axiosInstance = axios.create({
            headers: {
                'User-Agent': 'GradientNetwork-Bot/1.0'
            }
        });
        spinner.info('Menggunakan IP VPS pengguna.');
    }

    try {
        const success = await connectWithRetry(axiosInstance);
        if (success) {
            spinner.succeed('bot tod berhasil terhubung ke Gradient Network!');
        } else {
            spinner.fail('bot tod gagal terhubung ke Gradient Network.');
        }
    } finally {
        rl.close();
    }
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nMenghentikan program...');
    rl.close();
    process.exit(0);
});

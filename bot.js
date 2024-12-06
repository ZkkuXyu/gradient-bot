const fs = require('fs');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const readline = require('readline');
const ora = require('ora');

// Konfigurasi konstanta
const MAX_RETRIES = 5;
const REQUEST_TIMEOUT = 10000;
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

        // Coba koneksi ke endpoint
        const response = await axiosInstance.get(`${API_BASE_URL}/connect`, {
            params: { 
                token: ID_TOKEN,
                // Tambahkan parameter lain jika diperlukan
            },
            timeout: REQUEST_TIMEOUT,
            headers: {
                'User-Agent': 'GradientNetwork-Bot/1.0',
                'Accept': 'application/json',
                // Tambahkan header lain jika diperlukan
            },
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            }
        });

        // Log untuk debugging
        console.log('Mencoba koneksi ke:', API_BASE_URL);
        console.log('Status response:', response.status);

        if (response.status === 200) {
            return true;
        } else {
            throw new Error(`Koneksi gagal dengan status: ${response.status}`);
        }
    } catch (error) {
        console.error('Detail error:', error.message);
        throw error;
    }
}

// Fungsi dengan mekanisme retry
async function connectWithRetry(axiosInstance) {
    let retries = 0;
    const spinner = ora('bot tod mencoba terhubung...').start();
    
    while (retries < MAX_RETRIES) {
        try {
            spinner.text = `bot tod mencoba koneksi ke-${retries + 1}...`;
            const result = await connectToGradientNetwork(axiosInstance);
            spinner.succeed('bot tod berhasil terhubung!');
            return result;
        } catch (error) {
            retries++;
            spinner.warn(`Percobaan ${retries}/${MAX_RETRIES} gagal: ${error.message}`);
            
            if (retries < MAX_RETRIES) {
                const waitTime = retries * 3000; // Menambah waktu tunggu
                spinner.text = `bot tod akan mencoba lagi dalam ${waitTime/1000} detik...`;
                await delay(waitTime);
            } else {
                spinner.fail(`bot tod gagal terhubung setelah ${MAX_RETRIES} percobaan`);
                return false;
            }
        }
    }
    return false;
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

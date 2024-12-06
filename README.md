# Gradient Bot

Bot ini dibuat untuk terhubung ke Gradient Network menggunakan Node.js. Bot ini melakukan autentikasi dengan menggunakan ID token, memastikan node berjalan dengan melakukan ping, dan menampilkan ID serta email pengguna. Bot ini juga mendukung penggunaan proxy.

## Langkah-langkah Instalasi

1. Kloning repositori ini:
   ```sh
   git clone https://github.com/ZkkuXyu/gradient-bot.git
   cd gradient-bot
2. Instal dependensi:
   ```sh
    npm install
3. Buat file token.txt
4. Buat proxy (opsional) edit file proxy apabila anda ingin mennguanakannya
5. Jalankan bot
   ```sh
   npm start
Keterangan
Bot ini akan melakukan koneksi ke Gradient Network, memastikan node berjalan dengan benar, dan menampilkan ID serta email pengguna. Jika terjadi kesalahan, bot akan menampilkan pesan kesalahan yang sesuai. Bot ini juga mendukung penggunaan proxy untuk mengelola koneksi jaringan.

gradient-bot/
├── bot.js
├── package.json
├── proxy.txt
├── token.txt
└── README.md

MIT LICENSE
Saya memberikan izin kepada pengguna lain untuk menggunakan, menyalin, memodifikasi, dan mendistribusikan perangkat lunak sesuai dengan ketentuan lisensi MIT.

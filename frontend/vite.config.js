import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // --- PROXY AYARI ---
    proxy: {
      // '/api' ile başlayan tüm istekleri backend'e yönlendir
      '/api': {
        // Backend sunucunuzun adresi ve portu
        // Eğer backend farklı bir portta (örn: 5000) çalışıyorsa burayı güncelleyin
        target: 'http://localhost:5000',
        // Güvenli olmayan (http) hedeflere izin ver (geliştirme için)
        secure: false,
        // Origin header'ını hedef URL ile eşleşecek şekilde değiştir
        changeOrigin: true,
      },
    },
    // İsteğe bağlı: Frontend'in çalıştığı port (varsayılan 5173)
    // port: 5173,
  },
});

// src/components/CodeRainEffect.jsx
import React, { useEffect, useRef } from 'react';

function CodeRainEffect({ duration = 4000, onComplete }) {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Karakterler ve sütunlar
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}';
    // Alternatif olarak Katakana karakterleri:
    // const characters = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const fontSize = 16;
    const columns = Math.floor(width / fontSize);
    const drops = Array(columns).fill(1); // Her sütunun başlangıç pozisyonu

    let startTime = null;

    function draw(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Arka planı hafifçe silerek iz efekti oluştur
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      // Yeşil karakterler
      ctx.fillStyle = '#0F0'; // Yeşil renk
      ctx.font = fontSize + 'px monospace';

      // Her sütun için karakterleri çiz
      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Sütunu aşağı hareket ettir veya başa sar
        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      // Belirtilen süre dolduysa animasyonu durdur
      if (elapsed < duration) {
        animationFrameId.current = requestAnimationFrame(draw);
      } else {
        if (onComplete) onComplete();
      }
    }

    // Pencere yeniden boyutlandırıldığında canvas'ı ayarla
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      // drops dizisini yeniden boyutlandırmaya gerek yok, sadece çizim alanı değişir
    };

    window.addEventListener('resize', handleResize);

    // Animasyonu başlat
    animationFrameId.current = requestAnimationFrame(draw);

    // Temizleme fonksiyonu
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [duration, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999, // En üstte görünmesi için yüksek z-index
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Hafif transparan siyah arka plan
        display: 'block', // Tam ekran kaplaması için
      }}
    />
  );
}

export default CodeRainEffect;

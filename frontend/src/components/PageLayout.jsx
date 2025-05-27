// src/components/PageLayout.jsx
import React from 'react';

// Bu bileşen, içine aldığı çocukları standart container yapısıyla sarmalar
// ve navigasyon çubuğu için üstten boşluk bırakır.
function PageLayout({ children }) {
  return (
    // <<< DEĞİŞİKLİK: pt-20 md:pt-24 sınıfları eklendi >>>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-14 pb-8 md:pb-12">
      {children}
    </div>
  );
}

export default PageLayout;

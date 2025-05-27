import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  FaUserPlus, 
  FaUserEdit, 
  FaFilm, 
  FaStar, 
  FaUserFriends, 
  FaList, 
  FaBookmark, 
  FaBell, 
  FaTrophy,
  FaFileImport,
  FaSearch,
  FaComment,
  FaShare,
  FaLanguage,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

const Guide = () => {
  const { t } = useTranslation();
  const [expandedSteps, setExpandedSteps] = useState({});

  const toggleStep = (sectionIndex, stepIndex) => {
    const key = `${sectionIndex}-${stepIndex}`;
    setExpandedSteps(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const guideSections = [
    {
      title: 'Başlangıç',
      steps: [
        {
          title: 'Hesap Oluşturma',
          description: 'E-posta veya GitHub hesabınızla hızlıca kayıt olun.',
          icon: <FaUserPlus className="w-6 h-6" />
        },
        {
          title: 'Profilinizi Özelleştirin',
          description: 'Profil fotoğrafı ve kullanıcı adınızı belirleyin.',
          icon: <FaUserEdit className="w-6 h-6" />
        },
        {
          title: 'Dil Seçimi',
          description: 'Türkçe veya İngilizce dil seçeneğini kullanın.',
          icon: <FaLanguage className="w-6 h-6" />
        }
      ]
    },
    {
      title: 'İçerik Takibi',
      steps: [
        {
          title: 'Film ve Dizi Ekleme',
          description: 'İzlediğiniz içerikleri kütüphanenize ekleyin ve izleme durumunuzu belirtin.',
          icon: <FaFilm className="w-6 h-6" />
        },
        {
          title: 'Değerlendirme ve Yorum',
          description: 'İçeriklere puan verin ve düşüncelerinizi paylaşın.',
          icon: <FaStar className="w-6 h-6" />
        },
        {
          title: 'İzleme Listesi',
          description: 'İzlemek istediğiniz içerikleri listelerinize ekleyin.',
          icon: <FaBookmark className="w-6 h-6" />
        },
        {
          title: 'Arama ve Keşfet',
          description: 'Film, dizi ve kullanıcıları arayın ve keşfedin.',
          icon: <FaSearch className="w-6 h-6" />
        }
      ]
    },
    {
      title: 'Sosyal Özellikler',
      steps: [
        {
          title: 'Arkadaş Ekleme',
          description: 'Diğer kullanıcıları takip edin ve aktivitelerini görüntüleyin.',
          icon: <FaUserFriends className="w-6 h-6" />
        },
        {
          title: 'Listeler Oluşturma',
          description: 'Özel listeler oluşturun ve paylaşın.',
          icon: <FaList className="w-6 h-6" />
        },
        {
          title: 'Gönderi Paylaşma',
          description: 'Film ve diziler hakkında düşüncelerinizi paylaşın.',
          icon: <FaComment className="w-6 h-6" />
        },
        {
          title: 'Bildirimler',
          description: 'Takip ettiğiniz kullanıcıların aktivitelerini takip edin.',
          icon: <FaBell className="w-6 h-6" />
        }
      ]
    },
    {
      title: 'Gelişmiş Özellikler',
      steps: [
        {
          title: 'Rozetler ve Başarılar',
          description: 'Platformu kullanarak rozetler kazanın.',
          icon: <FaTrophy className="w-6 h-6" />
        },
        {
          title: 'Letterboxd İçe Aktarma',
          description: 'Letterboxd verilerinizi kolayca içe aktarın.',
          icon: <FaFileImport className="w-6 h-6" />
        },
        {
          title: 'İstatistikler',
          description: 'İzleme alışkanlıklarınızı analiz edin.',
          icon: <FaShare className="w-6 h-6" />
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('guide.title', 'Monologed Rehberi')}
          </h1>
          <p className="text-xl text-gray-400">
            {t('guide.subtitle', 'Platformu en iyi şekilde kullanmanız için adım adım rehber')}
          </p>
        </div>

        <div className="space-y-8">
          {guideSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-gray-900/50 backdrop-blur-sm rounded-lg shadow-xl border border-gray-800 p-6">
              <h2 className="text-2xl font-semibold text-white mb-6">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.steps.map((step, stepIndex) => {
                  const isExpanded = expandedSteps[`${sectionIndex}-${stepIndex}`];
                  return (
                    <div 
                      key={stepIndex} 
                      className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800/70 transition-colors duration-200"
                      onClick={() => toggleStep(sectionIndex, stepIndex)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center text-brand">
                            {step.icon}
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-white">
                              {step.title}
                            </h3>
                            <p className="mt-1 text-gray-400">
                              {step.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pl-16 text-gray-400 border-t border-gray-700 pt-4">
                          <p className="text-sm">
                            {step.detailedDescription || 'Bu özellik hakkında daha detaylı bilgi için tıklayın.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400">
            {t('guide.help', 'Daha fazla yardıma mı ihtiyacınız var?')}
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-brand hover:bg-brand/80 transition-colors duration-200"
          >
            {t('guide.contact', 'Bize Ulaşın')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Guide; 
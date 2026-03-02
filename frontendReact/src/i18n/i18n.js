// src/i18n/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Los diccionarios — por ahora vacíos, los rellenamos en el PASO 2
import en from './locales/en.json';
import es from './locales/es.json';

i18n
  // 1️⃣ PLUGIN: Detecta el idioma del usuario automáticamente
  .use(LanguageDetector)
  
  // 2️⃣ PLUGIN: Conecta i18next con React (habilita el hook `useTranslation`)
  .use(initReactI18next)
  
  // 3️⃣ INICIALIZACIÓN
  .init({
    // Los recursos son tu "diccionario maestro"
    // Estructura: { idioma: { namespace: { clave: "valor" } } }
    resources: {
      en: { translation: en },
      es: { translation: es },
    },

    // Si una clave no existe en el idioma activo, usa este idioma como fallback
    // Ejemplo: si 'es' no tiene una clave nueva que añadiste, mostrará el inglés
    fallbackLng: 'en',

    initImmediate: false,

    interpolation: {
      // React ya protege contra XSS, no necesitamos que i18next lo haga también
      escapeValue: false,
    },

    // Configuración del detector de idioma
    // Le decimos dónde buscar y guardar la preferencia del usuario
    detection: {
      // Orden de prioridad para detectar el idioma:
      order: ['localStorage', 'navigator'],
      //        ↑ ¿Lo guardó el usuario?  ↑ ¿Qué idioma tiene el navegador?

      // Dónde persistir la elección del usuario
      caches: ['localStorage'],
      
      // Nombre de la clave en localStorage
      lookupLocalStorage: 'appLanguage',
    },
  });

export default i18n;
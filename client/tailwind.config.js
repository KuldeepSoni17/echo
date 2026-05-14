/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        echo: {
          bg: '#0A0A0F',
          card: '#111118',
          elevated: '#1A1A24',
          primary: '#FFFFFF',
          secondary: '#8888AA',
          muted: '#44445A',
          accent: '#7C5CFF',
          'accent-secondary': '#FF5C8A',
          danger: '#FF4444',
          success: '#00E676',
        },
        mood: {
          calm: '#5C9EFF',
          excited: '#FFB800',
          funny: '#FF8C00',
          vulnerable: '#FF5C8A',
          serious: '#8888AA',
          curious: '#00E5FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'waveform-bar': 'waveform-bar 0.8s ease-in-out infinite alternate',
        'fingerprint-breathe': 'fingerprint-breathe 3s ease-in-out infinite',
        'fingerprint-active': 'fingerprint-active 0.6s ease-in-out infinite alternate',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '80%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'waveform-bar': {
          '0%': { transform: 'scaleY(0.3)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'fingerprint-breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        'fingerprint-active': {
          '0%': { transform: 'scale(0.95)', opacity: '0.9' },
          '100%': { transform: 'scale(1.08)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      screens: {
        xs: '375px',
      },
      maxWidth: {
        mobile: '480px',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #7C5CFF 0%, #FF5C8A 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.9) 100%)',
      },
    },
  },
  plugins: [],
};

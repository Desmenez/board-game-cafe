/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        accent: 'var(--accent)',
        paper: {
          DEFAULT: 'var(--color-paper)',
          2: 'var(--color-paper-2)',
          3: 'var(--color-paper-3)',
          4: 'var(--color-paper-4)',
          overlay: 'var(--color-paper-overlay)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          2: 'var(--color-ink-2)',
        },
        rule: {
          DEFAULT: 'var(--color-rule)',
          2: 'var(--color-rule-2)',
        },
        pear: 'var(--color-pear)',
        'accent-ink': 'var(--color-accent-ink)',
        focus: 'var(--color-focus)',
        error: 'var(--color-error)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        input: 'var(--radius-input)',
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        label: 'var(--font-label)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
      },
      maxWidth: {
        shell: '76rem',
      },
    },
  },
  plugins: [],
};

// postcss.config.js
export default {
  plugins: {
    'postcss-import': {
      resolve: ['src/styles'], // Specify the source directory for CSS modules
    },
    '@tailwindcss/postcss': {}, // Use the new package
    autoprefixer: {},
  },
};

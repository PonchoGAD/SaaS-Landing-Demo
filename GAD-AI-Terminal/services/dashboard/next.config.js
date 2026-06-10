/** @type {import('next').NextConfig} */
module.exports = {
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000'
  },
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_URL: process.env.API_BASE_URL || 'http://localhost:4000'
  }
};

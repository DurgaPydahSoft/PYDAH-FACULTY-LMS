const config = {
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'
};

export const API_BASE_URL = config.API_BASE_URL;
export default config; 
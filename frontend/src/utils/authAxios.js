import axios from 'axios';
import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

export const createAuthAxios = (token) => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}; 
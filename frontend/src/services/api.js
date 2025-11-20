/*
  파일명: services/api.js
  기능: HTTP 요청 유틸리티
*/

import Config from '../config';

// 기본 fetch wrapper
const request = async (endpoint, options = {}) => {
  const url = `${Config.API_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API 요청 실패');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
};

// HTTP 메서드별 함수
export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),

  post: (endpoint, body) => request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  put: (endpoint, body) => request(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  }),

  delete: (endpoint) => {
    console.log('[API] DELETE 요청:', endpoint);
    return request(endpoint, { method: 'DELETE' });
  },
};

export default api;

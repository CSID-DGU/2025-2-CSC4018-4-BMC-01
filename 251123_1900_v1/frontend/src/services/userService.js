/*
  파일명: services/userService.js
  기능: 사용자 관련 API 서비스
*/

import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'USER_ID';

export const userService = {
  // 사용자 생성
  create: async (name = 'User') => {
    const response = await api.post('/users', { name });
    return response.data;
  },

  // 사용자 조회
  getById: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  // 현재 사용자 ID 가져오기 (없으면 생성)
  getCurrentUserId: async () => {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);

    if (!userId) {
      // 사용자 생성
      const user = await userService.create('User');
      userId = user.id.toString();
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }

    return parseInt(userId);
  },

  // 사용자 ID 저장
  setUserId: async (userId) => {
    await AsyncStorage.setItem(USER_ID_KEY, userId.toString());
  },

  // 사용자 ID 삭제 (로그아웃)
  clearUserId: async () => {
    await AsyncStorage.removeItem(USER_ID_KEY);
  },
};

export default userService;

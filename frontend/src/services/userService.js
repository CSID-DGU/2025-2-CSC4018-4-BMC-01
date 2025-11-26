/*
  파일명: services/userService.js
  기능: 사용자 관련 서비스 (로컬 DB 사용)
*/

import * as localDb from './localDbService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'USER_ID';

export const userService = {
  // 사용자 생성
  create: async (name = 'User') => {
    const userId = await localDb.createUser(name);
    const user = await localDb.getUserById(userId);
    return user;
  },

  // 사용자 조회
  getById: async (userId) => {
    const user = await localDb.getUserById(userId);
    return user;
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

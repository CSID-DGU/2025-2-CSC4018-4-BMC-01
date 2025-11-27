/*
  파일명: notificationService.js
  목적: 푸시 알림 관리 서비스 (모바일 전용)
*/

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { loadNotificationData } from './Storage';
import { fetchPlants } from './Storage';

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * 알림 권한 요청
 */
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[notificationService] 알림 권한 거부');
    return false;
  }

  return true;
};

/**
 * 모든 예약된 알림 취소
 */
export const cancelAllNotifications = async () => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * 물 줄 식물 체크 및 알림 발송
 */
const checkAndSendNotification = async () => {
  try {
    const plants = await fetchPlants();
    const today = new Date().toISOString().split('T')[0];

    const mustWaterPlants = plants.filter((p) => {
      if (!p.nextWater) return true;
      return p.nextWater <= today;
    });

    if (mustWaterPlants.length > 0) {
      const plantNames = mustWaterPlants.map(p => p.name).join(', ');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🪴 물 줄 시간이에요!',
          body: `오늘 물을 줘야 할 식물: ${plantNames}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // 즉시 발송
      });
    }
  } catch (error) {
    console.error('[notificationService] 알림 발송 오류:', error);
  }
};

/**
 * 매일 알림 스케줄 설정
 */
export const scheduleDailyNotification = async () => {
  if (Platform.OS === 'web') {
    console.log('[notificationService] 웹에서는 알림 미지원');
    return;
  }

  // 기존 알림 모두 취소
  await cancelAllNotifications();

  // 알림 설정 불러오기
  const notificationData = await loadNotificationData();

  if (!notificationData || !notificationData.enabled) {
    console.log('[notificationService] 알림 비활성화 상태');
    return;
  }

  const { hour, minute } = notificationData;

  // 매일 지정된 시간에 알림 예약
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🪴 물 주기 체크',
      body: '오늘 물을 줘야 할 식물을 확인하세요!',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      hour: hour || 9,
      minute: minute || 0,
      repeats: true,
    },
  });

  console.log(`[notificationService] 매일 ${hour}:${minute} 알림 설정 완료`);
};

/**
 * 알림 초기화 (앱 시작 시 호출)
 */
export const initializeNotifications = async () => {
  if (Platform.OS === 'web') return;

  const hasPermission = await requestNotificationPermissions();

  if (hasPermission) {
    await scheduleDailyNotification();
  }
};

export default {
  requestNotificationPermissions,
  cancelAllNotifications,
  scheduleDailyNotification,
  initializeNotifications,
};

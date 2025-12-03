/*
  파일명: notificationService.js
  목적: 푸시 알림 관리 서비스

  기능:
    - Background Task: 15분마다 주기적으로 식물 체크
    - 물 안 준 식물 필터링 및 알림 발송
    - 알림 권한 관리
    - 모바일 전용 (웹 미지원)

  동작 방식:
    1. 앱 시작 시 Background Task 등록
    2. OS가 15-30분마다 앱을 백그라운드에서 깨움
    3. 로컬 DB에서 식물 목록 조회
    4. 오늘 물 줘야 할 식물 필터링
    5. 식물 이름 포함한 알림 발송
*/

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { loadNotificationData } from './Storage';
import { fetchPlants } from './Storage';

/* ----------------------------------------------------------
   상수 정의
---------------------------------------------------------- */
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

/* ----------------------------------------------------------
   알림 핸들러 설정
---------------------------------------------------------- */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/* ----------------------------------------------------------
   알림 권한 요청
---------------------------------------------------------- */
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

/* ----------------------------------------------------------
   모든 예약된 알림 취소
---------------------------------------------------------- */
export const cancelAllNotifications = async () => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/* ----------------------------------------------------------
   물 줄 식물 체크 및 알림 발송
   - 로컬 DB에서 식물 목록 조회
   - 오늘 물 줘야 할 식물 필터링
   - 식물 이름 포함한 알림 발송
---------------------------------------------------------- */
export const checkAndSendNotification = async () => {
  try {
    const notificationData = await loadNotificationData();
    if (!notificationData || !notificationData.enabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const plants = await fetchPlants();

    // 한국 시간 기준 오늘 날짜
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const today = kst.toISOString().split('T')[0];

    // 물 줘야 할 식물 필터링
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
        trigger: null,
      });

      console.log(`[notificationService] 알림 발송: ${plantNames}`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('[notificationService] 물 줄 식물 없음');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error('[notificationService] 알림 발송 오류:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
};

/* ----------------------------------------------------------
   Background Task 정의
   - OS가 15-30분마다 호출
   - 물 안 준 식물 체크 및 알림 발송
---------------------------------------------------------- */
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    const result = await checkAndSendNotification();
    return result;
  } catch (error) {
    console.error('[Background Task] 오류:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/* ----------------------------------------------------------
   Background Task 등록
---------------------------------------------------------- */
export const registerBackgroundTask = async () => {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) return;

    const notificationData = await loadNotificationData();
    if (!notificationData || !notificationData.enabled) return;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
      minimumInterval: 60 * 15, // 15분
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[notificationService] Background Task 등록 완료');
  } catch (error) {
    console.error('[notificationService] Background Task 등록 실패:', error);
  }
};

/* ----------------------------------------------------------
   Background Task 해제
---------------------------------------------------------- */
export const unregisterBackgroundTask = async () => {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log('[notificationService] Background Task 해제 완료');
    }
  } catch (error) {
    console.error('[notificationService] Background Task 해제 실패:', error);
  }
};

/* ----------------------------------------------------------
   알림 스케줄 설정
   - 알림 ON: Background Task 등록
   - 알림 OFF: Background Task 해제
---------------------------------------------------------- */
export const scheduleDailyNotification = async () => {
  if (Platform.OS === 'web') return;

  const notificationData = await loadNotificationData();

  if (!notificationData || !notificationData.enabled) {
    await unregisterBackgroundTask();
    return;
  }

  await registerBackgroundTask();
};

/* ----------------------------------------------------------
   알림 초기화 (앱 시작 시 호출)
---------------------------------------------------------- */
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
  registerBackgroundTask,
  unregisterBackgroundTask,
  checkAndSendNotification,
};

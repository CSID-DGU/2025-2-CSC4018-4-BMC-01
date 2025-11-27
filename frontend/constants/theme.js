/*
  파일명: theme.js
  목적: 앱 전체에서 사용하는 디자인 시스템 상수 정의
  - 색상 팔레트
  - 간격 시스템 (4의 배수 기반)
  - 그림자 스타일
  - 타이포그래피
*/

// 색상 팔레트
export const COLORS = {
  // Primary (식물 관련 초록색)
  primary: '#8CCB7F',
  primaryDark: '#6BB85F',
  primaryLight: '#A5D99A',

  // Secondary
  secondary: '#7BA4F4',
  secondaryDark: '#5A8AE0',

  // Status
  success: '#6CC96F',
  warning: '#F5D742',
  error: '#E57373',
  info: '#4A90E2',

  // Neutral
  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E0E0E0',

  // Text
  text: {
    primary: '#333333',
    secondary: '#555555',
    tertiary: '#777777',
    disabled: '#999999',
    inverse: '#FFFFFF'
  },

  // Special
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadowColor: '#000000'
};

// 간격 시스템 (4의 배수)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40
};

// 그림자 스타일 (iOS + Android 호환)
export const SHADOWS = {
  none: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  sm: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  md: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  lg: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  xl: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8
  }
};

// 타이포그래피
export const TYPOGRAPHY = {
  // 화면 제목
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 34
  },
  // 섹션 제목
  h2: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28
  },
  // 카드 제목
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26
  },
  // 본문
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24
  },
  // 작은 텍스트
  small: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20
  },
  // 매우 작은 텍스트
  tiny: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18
  },
  // 버튼 텍스트
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24
  }
};

// Border Radius
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 15,
  xxl: 20,
  round: 999
};

// 터치 영역 최소 크기
export const TOUCH_TARGET = {
  min: 44,
  comfortable: 48
};

// Opacity
export const OPACITY = {
  active: 0.7,
  disabled: 0.5
};

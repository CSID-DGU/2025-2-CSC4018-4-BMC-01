/*
  파일명: context/PlantContext.js
  목적: 전역 식물 데이터 상태 관리 (중복 DB 쿼리 방지)

  기능:
    - 식물 데이터 캐싱 (5초)
    - loadPlants(force): 캐시 우선 로딩, force=true면 강제 갱신
    - refreshPlants(): loadPlants(true) 단축
*/

import React, { createContext, useState, useContext, useCallback } from 'react';
import { fetchPlants } from '../utils/Storage';

const PlantContext = createContext();

// 캐시 설정
const CACHE_DURATION = 5000; // 5초 (필요시 조정 가능)

export const PlantProvider = ({ children }) => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadPlants = useCallback(async (force = false) => {
    const now = Date.now();

    // 캐시 재사용 조건: 5초 이내 + 데이터 있음 + 강제 갱신 아님
    if (!force && lastUpdate && plants.length > 0 && (now - lastUpdate < CACHE_DURATION)) {
      console.log('[PlantContext] 캐시 사용');
      return plants;
    }

    // 새로 로드
    try {
      console.log('[PlantContext] DB 로드');
      setLoading(true);
      const list = await fetchPlants();
      setPlants(list);
      setLastUpdate(now);
      return list;
    } catch (error) {
      console.error('[PlantContext] 로드 실패:', error);
      return plants;
    } finally {
      setLoading(false);
    }
  }, [plants, lastUpdate]);

  const refreshPlants = useCallback(() => {
    return loadPlants(true);
  }, [loadPlants]);

  const updatePlant = useCallback((plantId, updates) => {
    setPlants(prev => prev.map(p =>
      p.id === plantId ? { ...p, ...updates } : p
    ));
  }, []);

  const clearCache = useCallback(() => {
    setPlants([]);
    setLastUpdate(null);
  }, []);

  return (
    <PlantContext.Provider
      value={{
        plants,
        loading,
        loadPlants,
        refreshPlants,
        updatePlant,
        clearCache
      }}
    >
      {children}
    </PlantContext.Provider>
  );
};

export const usePlants = () => {
  const context = useContext(PlantContext);
  if (!context) {
    throw new Error('usePlants must be used within PlantProvider');
  }
  return context;
};

export default PlantContext;

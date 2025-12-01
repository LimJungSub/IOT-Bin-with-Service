package org.boot.sensorserver.repository;

import org.boot.sensorserver.model.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SensorDataRepository extends JpaRepository<SensorData, Long> {

    // 필요하다면 나중에 커스텀 조회 메서드 추가 가능
    // 예: List<SensorData> findTop10ByOrderByCreatedAtDesc();
}

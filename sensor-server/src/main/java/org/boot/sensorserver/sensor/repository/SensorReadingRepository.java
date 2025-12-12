package org.boot.sensorserver.sensor.repository;

import org.boot.sensorserver.sensor.model.SensorReading;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {

    // ✅ 전체 기준 가장 최근 1개 (기존 유지)
    Optional<SensorReading> findFirstByOrderByCreatedAtDesc();

    // ✅ 특정 binId 기준 가장 최근 1개
    Optional<SensorReading> findTopByBinIdOrderByCreatedAtDesc(String binId);

    // ✅ 특정 binId 기준 최근 N개 (Pageable로 limit 처리)
    List<SensorReading> findByBinIdOrderByCreatedAtDesc(String binId, Pageable pageable);
}

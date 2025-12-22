// src/main/java/org/boot/sensorserver/sensor/service/SensorReadingService.java
package org.boot.sensorserver.sensor.service;

import lombok.RequiredArgsConstructor;
import org.boot.sensorserver.sensor.model.SensorReading;
import org.boot.sensorserver.sensor.repository.SensorReadingRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SensorReadingService {

    private final SensorReadingRepository repository;

    // 최신 데이터 여러 개 (기본 50개 정도)
    public List<SensorReading> findLatest(int limit) {
        Pageable pageable = PageRequest.of(
                0,
                limit,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return repository.findAll(pageable).getContent();
    }

    // 가장 마지막 1건
    public Optional<SensorReading> findLastOne() {
        return repository.findFirstByOrderByCreatedAtDesc();
    }
}

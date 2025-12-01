package org.boot.sensorserver.service;

import org.boot.sensorserver.dto.SensorDataRequest;
import org.boot.sensorserver.dto.SensorDataResponse;
import org.boot.sensorserver.model.SensorData;
import org.boot.sensorserver.repository.SensorDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SensorDataService {

    private final SensorDataRepository sensorDataRepository;

    public SensorDataResponse saveSensorData(SensorDataRequest request) {
        SensorData entity = SensorData.builder()
                .distanceMm(request.getDistanceMm())
                .weightG(request.getWeightG())
                .waterAdc(request.getWaterAdc())
                .createdAt(LocalDateTime.now())
                .build();

        SensorData saved = sensorDataRepository.save(entity);

        return SensorDataResponse.builder()
                .id(saved.getId())
                .distanceMm(saved.getDistanceMm())
                .weightG(saved.getWeightG())
                .waterAdc(saved.getWaterAdc())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    public List<SensorDataResponse> getAll() {
        return sensorDataRepository.findAll().stream()
                .map(d -> SensorDataResponse.builder()
                        .id(d.getId())
                        .distanceMm(d.getDistanceMm())
                        .weightG(d.getWeightG())
                        .waterAdc(d.getWaterAdc())
                        .createdAt(d.getCreatedAt())
                        .build()
                )
                .toList();
    }

    public List<SensorDataResponse> getLatest(int limit) {
        // 간단 버전: 메모리에서 createdAt 기준 정렬 후 상위 N개
        return sensorDataRepository.findAll().stream()
                .sorted(Comparator.comparing(SensorData::getCreatedAt).reversed())
                .limit(limit)
                .map(d -> SensorDataResponse.builder()
                        .id(d.getId())
                        .distanceMm(d.getDistanceMm())
                        .weightG(d.getWeightG())
                        .waterAdc(d.getWaterAdc())
                        .createdAt(d.getCreatedAt())
                        .build()
                )
                .toList();
    }
}

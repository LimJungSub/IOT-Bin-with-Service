package org.boot.sensorserver.controller;

import org.boot.sensorserver.dto.SensorDataRequest;
import org.boot.sensorserver.dto.SensorDataResponse;
import org.boot.sensorserver.service.SensorDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sensor-data")
@RequiredArgsConstructor
public class SensorDataController {

    private final SensorDataService sensorDataService;

    // 센서에서 JSON POST
    @PostMapping
    public ResponseEntity<SensorDataResponse> create(@RequestBody SensorDataRequest request) {
        SensorDataResponse response = sensorDataService.saveSensorData(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 전체 데이터 조회 (테스트/디버깅용)
    @GetMapping
    public ResponseEntity<List<SensorDataResponse>> getAll() {
        return ResponseEntity.ok(sensorDataService.getAll());
    }

    // 최근 N개 조회 (예: /api/sensor-data/latest?limit=10)
    @GetMapping("/latest")
    public ResponseEntity<List<SensorDataResponse>> getLatest(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(sensorDataService.getLatest(limit));
    }
}

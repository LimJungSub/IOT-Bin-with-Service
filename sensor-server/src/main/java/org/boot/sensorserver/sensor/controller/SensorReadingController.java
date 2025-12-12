package org.boot.sensorserver.sensor.controller;

import lombok.RequiredArgsConstructor;
import org.boot.sensorserver.sensor.model.SensorReading;
import org.boot.sensorserver.sensor.repository.SensorReadingRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/readings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // 초기 개발용, 배포 시 도메인 제한 추천
public class SensorReadingController {

    private final SensorReadingRepository repository;

    // ✅ 최근 N개 (binId 있으면 해당 bin, 없으면 전체 최신 N개는 별도 구현 필요)
    // 실사용은 보통 binId 넣어서 씀: /api/readings?binId=Bin-Master&limit=50
    @GetMapping
    public ResponseEntity<List<SensorReading>> getLatest(
            @RequestParam(required = false) String binId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        if (binId == null || binId.isBlank()) {
            // binId 없이 “전체 최신 N개”가 필요하면 Repository 메서드 추가가 필요함.
            // 일단 혼동 방지로 400 처리.
            return ResponseEntity.badRequest().build();
        }

        List<SensorReading> list = repository.findByBinIdOrderByCreatedAtDesc(
                binId, PageRequest.of(0, Math.max(1, Math.min(limit, 500)))
        );
        return ResponseEntity.ok(list);
    }

    // ✅ 가장 최근 1개
    // /api/readings/latest?binId=Bin-Master
    @GetMapping("/latest")
    public ResponseEntity<SensorReading> getLastOne(@RequestParam String binId) {
        return repository.findTopByBinIdOrderByCreatedAtDesc(binId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}

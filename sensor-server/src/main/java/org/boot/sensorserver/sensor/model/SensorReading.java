// src/main/java/org/boot/sensorserver/sensor/model/SensorReading.java
package org.boot.sensorserver.sensor.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_reading")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SensorReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String binId;

    // ToF 거리 (mm)
    private Integer distanceMm;

    // 무게 (g)
    private Float weightG;

    // 누수 센서 ADC 값
    private Integer waterAdc;

    // 쓰레기 수거 필요 여부
    private Boolean needCollection;

    // GPS 좌표 (옵션)
    private Double lat;
    private Double lng;

    // 수집 시각
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

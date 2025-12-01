package org.boot.sensorserver.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_data")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SensorData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // distance_mm
    @Column(name = "distance_mm", nullable = false)
    private Integer distanceMm;

    // weight_g
    @Column(name = "weight_g", nullable = false)
    private Double weightG;

    // water_adc
    @Column(name = "water_adc", nullable = false)
    private Integer waterAdc;

    // 서버에서 데이터 저장한 시각
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

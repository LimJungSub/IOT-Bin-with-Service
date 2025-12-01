package org.boot.sensorserver.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SensorDataResponse {

    private Long id;
    private Integer distanceMm;
    private Double weightG;
    private Integer waterAdc;
    private LocalDateTime createdAt;
}

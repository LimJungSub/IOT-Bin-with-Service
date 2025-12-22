// src/main/java/org/boot/sensorserver/sensor/dto/SensorPayload.java
package org.boot.sensorserver.sensor.dto;

import lombok.Data;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

// MQTT payload는 snake_case로 들어오므로 DTO에서만 snake_case 매핑 적용
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
public class SensorPayload {

    // JSON: bin_id (하드웨어가 안 보내는 경우도 있으므로 nullable 취급)
    private String binId;

    // JSON: distance_mm
    private int distanceMm;

    // JSON: weight_g
    private float weightG;

    // JSON: water_adc
    private int waterAdc;

    // JSON: need_collection
    private boolean needCollection;

    // JSON: lat (옵션)
    private Double lat;

    // JSON: lng (옵션)
    private Double lng;
}

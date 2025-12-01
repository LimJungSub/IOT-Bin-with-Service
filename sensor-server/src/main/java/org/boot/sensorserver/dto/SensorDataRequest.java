package org.boot.sensorserver.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SensorDataRequest {

    // JSON: distance_mm
    private Integer distanceMm;

    // JSON: weight_g
    private Double weightG;

    // JSON: water_adc
    private Integer waterAdc;
}

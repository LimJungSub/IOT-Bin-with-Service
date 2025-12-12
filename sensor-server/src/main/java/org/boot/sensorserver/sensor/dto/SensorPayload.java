// src/main/java/org/boot/sensorserver/sensor/dto/SensorPayload.java
package org.boot.sensorserver.sensor.dto;

import lombok.Data;

@Data
public class SensorPayload {

    // JSON: bin_id
    private String binId;

    // JSON: distance_mm
    private int distanceMm;

    // JSON: weight_g
    private float weightG;

    // JSON: water_adc
    private int waterAdc;

    // JSON: need_collection
    private boolean needCollection;
}

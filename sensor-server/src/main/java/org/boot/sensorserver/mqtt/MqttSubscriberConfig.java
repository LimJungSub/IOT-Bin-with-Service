package org.boot.sensorserver.mqtt;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.boot.sensorserver.sensor.dto.SensorPayload;
import org.boot.sensorserver.sensor.model.SensorReading;
import org.boot.sensorserver.sensor.repository.SensorReadingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import tools.jackson.databind.ObjectMapper;

import org.eclipse.paho.client.mqttv3.IMqttClient;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class MqttSubscriberConfig {

    @Value("${app.mqtt.broker-url}")
    private String brokerUrl;

    @Value("${app.mqtt.client-id}")
    private String clientId;

    @Value("${app.mqtt.topic}")
    private String topic;

    @Value("${app.mqtt.default-bin-id:Bin-Master}")
    private String defaultBinId;

    private final ObjectMapper objectMapper;
    private final SensorReadingRepository repository;

    private IMqttClient mqttClient;

    @PostConstruct
    public void init() throws MqttException {
        String finalClientId = clientId + "-" + System.currentTimeMillis();

        mqttClient = new MqttClient(brokerUrl, finalClientId);

        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);

        mqttClient.connect(options);
        log.info("✅ Connected to MQTT broker: {} (clientId={})", brokerUrl, finalClientId);

        mqttClient.subscribe(topic, (t, msg) -> handleMessage(t, msg));
        log.info("✅ Subscribed to topic: {}", topic);
    }

    private void handleMessage(String topic, MqttMessage message) {
        try {
            String payloadStr = new String(message.getPayload());
            log.info("📥 MQTT message received (topic={}): {}", topic, payloadStr);

            // ✅ DTO로 매핑 (MQTT 입력은 DTO의 @JsonNaming으로 snake_case 처리)
            SensorPayload payload = objectMapper.readValue(payloadStr, SensorPayload.class);

            String binId = payload.getBinId();
            if (binId == null || binId.isBlank()) {
                // 하드웨어에서 bin_id를 안 보내는 경우가 있어도 저장되도록 fallback 적용
                binId = (defaultBinId == null || defaultBinId.isBlank()) ? "Bin-Master" : defaultBinId;
                log.info("ℹ️ bin_id missing. Using default binId='{}' (topic={})", binId, topic);
            }

            SensorReading entity = SensorReading.builder()
                    .binId(binId)
                    .distanceMm(payload.getDistanceMm())
                    .weightG(payload.getWeightG())
                    .waterAdc(payload.getWaterAdc())
                    .needCollection(payload.isNeedCollection())
                    .lat(payload.getLat())
                    .lng(payload.getLng())
                    .build();

            repository.save(entity);
            log.info("💾 Saved SensorReading to DB: {}", entity);

        } catch (Exception e) {
            log.error("❌ Failed to handle MQTT message", e);
        }
    }
}

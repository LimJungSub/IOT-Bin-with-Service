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

        mqttClient.subscribe(topic, (t, msg) -> handleMessage(msg));
        log.info("✅ Subscribed to topic: {}", topic);
    }

    private void handleMessage(MqttMessage message) {
        try {
            String payloadStr = new String(message.getPayload());
            log.info("📥 MQTT message received: {}", payloadStr);

            // ✅ DTO로 매핑 (spring.jackson.property-naming-strategy=SNAKE_CASE 적용)
            SensorPayload payload = objectMapper.readValue(payloadStr, SensorPayload.class);

            if (payload.getBinId() == null || payload.getBinId().isBlank()) {
                log.warn("⚠️ bin_id가 없어 저장하지 않음: {}", payloadStr);
                return;
            }

            SensorReading entity = SensorReading.builder()
                    .binId(payload.getBinId())
                    .distanceMm(payload.getDistanceMm())
                    .weightG(payload.getWeightG())
                    .waterAdc(payload.getWaterAdc())
                    .needCollection(payload.isNeedCollection())
                    .build();

            repository.save(entity);
            log.info("💾 Saved SensorReading to DB: {}", entity);

        } catch (Exception e) {
            log.error("❌ Failed to handle MQTT message", e);
        }
    }
}

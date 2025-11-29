#include <WiFi.h> //ESP32 Built-in library (실습 때 Uno에서 썼던 Wifi3.h와 다른 것)
#include <PubSubClient.h>
#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>
#include "HX711.h"
#include <ArduinoJson.h>

//ESP32는 Wifi 2.4GHz신호만 잡을수있으니 5G신호 사용 X
// const char* ssid = "정섭의 S25";
// const char* password = "wjdtjq12!@";
// const char* mqtt_broker = "192.168.246.173";
const char* ssid = "KT_GiGA_4290";
const char* password = "bbxc3bd627";
const char* mqtt_broker = "172.30.1.50"; //wifi주소는 공유기 설정상 매번 바뀔수있으니 확인
const int mqtt_port = 1883;
const char* topic_pub = "Bin/test/data";

#define I2C_SDA_PIN 9
#define I2C_SCL_PIN 8
#define LOADCELL_DOUT_PIN 35
#define LOADCELL_SCK_PIN  36
#define WATER_SENSOR_PIN 6 
#define CALIBRATION_FACTOR -350.0

WiFiClient espClient;
PubSubClient client(espClient);

SparkFun_VL53L5CX myImager;
VL53L5CX_ResultsData measurementData;
HX711 scale;

int latestDistance = 0; 
unsigned long lastPrintTime = 0;
const long PUBLISH_INTERVAL = 1000;

// MQTT 연결이 끊어졌을 때 재연결하는 함수
void reconnect() {
  while (!client.connected()) {
    Serial.print("MQTT 브로커 연결 시도...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("성공!");
    } else {
      Serial.print("실패, rc=");
      Serial.print(client.state());
      Serial.println(" 5초 후 재시도");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(9600);
  Serial.println("\n=== 스마트 쓰레기통 시스템 부팅 ===");

  WiFi.disconnect(true);
  Serial.print("Wi-Fi 연결 중: ");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi 연결 성공!");
  Serial.print("IP 주소: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_broker, mqtt_port);

  // ToF 거리 센서를 초기화
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (myImager.begin() == false) { Serial.println("[ToF] 연결 실패!"); while (1); }
  myImager.setResolution(8 * 8); 
  myImager.setRangingFrequency(15); 
  myImager.startRanging();

  // 로드셀 무게 센서를 초기화
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(); 

  // 수위 센서를 초기화
  pinMode(WATER_SENSOR_PIN, INPUT);
  
  Serial.println("=== 모든 센서 준비 완료, MQTT 대기 ===");
}

void loop() {
  if (!client.connected()) {
    reconnect(); 
  }
  client.loop(); //
  
  // ToF 센서로부터 거리값을 읽어오도록 하자
  // ToF 센서는 비동기식으로 데이터 업데이트하기에 앞에서 처리한다 
  if (myImager.isDataReady()) {
    if (myImager.getRangingData(&measurementData)) {
      int min_dist = 4000; 
      for (int i = 0; i < 64; i++) {
        int dist = measurementData.distance_mm[i];
        if (dist > 10 && dist < 4000 && dist < min_dist) {
            min_dist = dist;
        }
      }
      latestDistance = min_dist;
    }
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastPrintTime >= PUBLISH_INTERVAL) { 
    lastPrintTime = currentMillis; 

    // 로드셀 센서로부터 무게값을 읽기
    float currentWeight = scale.is_ready() ? scale.get_units(1) : 0.0;
    // 수위 센서로부터 수위값을 읽기
    int currentWaterLevel = analogRead(WATER_SENSOR_PIN);
    
    StaticJsonDocument<256> doc;
    doc["distance_mm"] = latestDistance;
    doc["weight_g"] = currentWeight;
    doc["water_adc"] = currentWaterLevel;
    
    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);
    
    if (client.publish(topic_pub, jsonBuffer)) {
      Serial.print("PUB SUCCESS: ");
      Serial.println(jsonBuffer);
    } else {
      Serial.println("PUB FAIL!");
    }
  }
}
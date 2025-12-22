#include <PubSubClient.h>
#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>
#include "HX711.h"
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <TinyGPS.h>
#include <WiFi.h> 

// ESP32는 2.4GHz 신호만 잡을 수 있으니 5G 신호 사용 X
const char* ssid = "임의";
const char* password = "임의";
const char* mqtt_broker = "165.246.44.72"; //지금은 학교에서 실행해둔 MQTT브로커 주소 //wifi주소는 공유기 설정상 매번 바뀔수있으니 확인
const int mqtt_port = 2025;
const char* topic_pub = "Bin/test/data";

#define I2C_SDA_PIN 42
#define I2C_SCL_PIN 41  // ToF용 I2C 핀

#define LOADCELL_DOUT_PIN 35
#define LOADCELL_SCK_PIN  36
#define WATER_SENSOR_PIN 6 
#define CALIBRATION_FACTOR -350.0 

WiFiClient espClient;
PubSubClient client(espClient);

SparkFun_VL53L5CX myImager;
VL53L5CX_ResultsData measurementData;
HX711 scale;

int latestDistance = 0;   // ToF 거리값

unsigned long lastPrintTime = 0;
const long PUBLISH_INTERVAL = 1000;

// GPS - RX: 16, TX: 17 (UART2) - 현재는 하드코딩 좌표 사용으로 비활성
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17

TinyGPS gps;
HardwareSerial SerialGPS(2); // UART 2번 채널 사용

bool isGpsSent = false; 


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
  Serial.println("\n=== 스마트 쓰레기통 (초기 좌표 1회 전송 버전) ===");
  
  // GPS 시리얼 시작 (일단 열어는 둠)
  SerialGPS.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

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
  if (myImager.begin() == false) { Serial.println("[ToF] 연결 실패!"); }
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
  client.loop(); 

  
  // ToF 센서 데이터 읽기 (비동기)
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
  
  // 1초마다 실행 (PUBLISH_INTERVAL)
  if (currentMillis - lastPrintTime >= PUBLISH_INTERVAL) { 
    lastPrintTime = currentMillis; 

    // 로드셀 & 수위 센서 읽기
    float currentWeight = scale.is_ready() ? scale.get_units(1) : 0.0;
    int currentWaterLevel = analogRead(WATER_SENSOR_PIN);

    //====================================================================
    //                          쓰레기 수거 필요 판단 로직 
    bool needCollection = false;
    String reason = "";

    if (latestDistance > 0 && latestDistance <= 100) {
        needCollection = true;
        reason = "Distance <= 100mm (Trash Full)";
    }
    else if (currentWeight >= 200.0) {
        needCollection = true;
        reason = "Weight >= 200g (Too Heavy)";
    }
    else if (currentWaterLevel >= 500) { 
        needCollection = true;
        reason = "Water Level >= 30mm (Liquid Warning)";
    }

    if (needCollection) {
        Serial.print("[Collection Needed] ");
        Serial.println(reason);
    }
    // ====================================================================
    
    StaticJsonDocument<256> doc;
    doc["distance_mm"] = latestDistance;
    doc["weight_g"] = currentWeight;
    doc["water_adc"] = currentWaterLevel;
    doc["need_collection"] = needCollection;
    
    if (isGpsSent == false) {
      // 인하대 좌표 하드코딩
      doc["lat"] = 37.45;
      doc["lng"] = 126.65;
      
      // 플래그를 true로 바꿔서 다음 루프부터는 이 if문에 못 들어오게 함
      isGpsSent = true; 
      Serial.println(">>> [알림] 초기 GPS 좌표를 포함하여 전송합니다.");
    }
    // else { ... } // else일 때는 아무것도 안 하므로 lat, lng 필드는 자동으로 생략됨
    
    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);
    
    if (client.publish(topic_pub, jsonBuffer)) {
      Serial.print("[PUB]: ");
      Serial.println(jsonBuffer);
    } else {
      Serial.println("[PUB FAIL]");
    }
  }
  
  delay(100);
}
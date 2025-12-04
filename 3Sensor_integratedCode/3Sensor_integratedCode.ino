제목과 반대 
#include <PubSubClient.h>
#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>
#include "HX711.h"
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <TinyGPS.h>
#include <WiFi.h> //ESP32 Built-in library (실습 때 Uno에서 썼던 Wifi3.h와 다른 것)
//ESP32는 2.4GHz신호만 잡을수있으니 5G신호 사용 X
const char* ssid = "KT_GiGA_4290";
const char* password = "bbxc3bd627";
const char* mqtt_broker = "165.246.44.72"; //지금은 학교에서 실행해둔 MQTT브로커 주소 //wifi주소는 공유기 설정상 매번 바뀔수있으니 확인
const int mqtt_port = 2025;
const char* topic_pub = "Bin/test/data";
#define I2C_SDA_PIN 42
#define I2C_SCL_PIN 41  //이 두개는 ToF
#define LOADCELL_DOUT_PIN 35
#define LOADCELL_SCK_PIN  36
#define WATER_SENSOR_PIN 6 
#define CALIBRATION_FACTOR -350.0 
WiFiClient espClient;
PubSubClient client(espClient);
SparkFun_VL53L5CX myImager;
VL53L5CX_ResultsData measurementData;
HX711 scale;
int latestDistance = 0;   //tof
unsigned long lastPrintTime = 0;
const long PUBLISH_INTERVAL = 1000;
// -------------------- Nano 33 BLE Sense , UART , GPS 변수들 ------------------------
// 아두이노 나노와 통신하기 위한 하드웨어 시리얼 객체 생성 UART 1번 채널을 사용함
HardwareSerial SerialNano(1);
// 움직임이 멈춘 것으로 판단하고 GPS를 끄기까지 기다리는 대기 시간 10초
const unsigned long TIMEOUT_MS = 10000;
// 현재 GPS 시스템이 동작 중인지 여부를 저장하는 상태 변수
bool isGpsRunning = false;
// 아두이노 나노로부터 마지막으로 움직임 신호를 받은 시각을 저장한다
unsigned long lastMovingTime = 0;

TinyGPS gps;
HardwareSerial SerialGPS(2); // UART 2번 채널 사용
//----------------------------------------------------------------------------------
// 데이터 저장용 변수
float flat, flon;
unsigned long age;

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
  
  SerialNano.begin(9600, SERIAL_8N1, 4, 5); //Nano - RX:4, TX:5 (UART1)
  SerialGPS.begin(9600, SERIAL_8N1, 16, 17); // GPS - RX: 16, TX: 17 (UART2)

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
  // 나노로부터 들어온 데이터 확인
  if (SerialNano.available()) {
    // 줄바꿈 문자가 나올 때까지 읽어서 문자열로 저장
    Serial.println("SerialNano is avail");
    String msg = SerialNano.readStringUntil('\n'); //nano쪽에서 Serai1.println으로 보냈기에 ln까지 읽으면 된다 
    msg.trim();
    if (msg == "MOVING") {
      // 움직임 신호가 들어왔으므로 마지막 감지 시간을 현재 시스템 시간으로 갱신함          
      lastMovingTime = millis();
      Serial.println("-----from nano, Moving status is detected, Then gps start-----");
      // 만약 현재 GPS가 꺼져있는 상태라면 GPS를 켬
      if (isGpsRunning == false) {
        isGpsRunning = true;
      }
    }
    else{
      Serial.println("-----from nano, STOP status is detected-----");
    }
  }
  // GPS가 켜져 있는 상태일 때만 타임아웃 여부를 검사함
  if (isGpsRunning == true) {
    // GPS 데이터 파싱 및 시리얼 출력 (움직임 감지 시에만 동작)
    while (SerialGPS.available() > 0) {
      if (gps.encode(SerialGPS.read())) {
        // 새 데이터가 파싱되었고, 위치 정보를 갱신함
        gps.f_get_position(&flat, &flon, &age); // TinyGPS 구버전 방식
        
        // 시리얼 모니터에 출력해보고 싶으면 주석 해제
        // Serial.print("[GPS] Lat: "); Serial.print(flat == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flat, 6);
        // Serial.print(", Lng: "); Serial.println(flon == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flon, 6);
      }
    }
    
    // 현재 시간에서 마지막 움직임 감지 시간을 뺀 값이 설정한 타임아웃 시간보다 큰지 확인
    if (millis() - lastMovingTime > TIMEOUT_MS) {
      // 10초 동안 움직임 신호가 없었으므로 GPS를 끔
      Serial.println("-----from nano, GPS STOP-----");
      isGpsRunning = false;
    }
  }
  
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
    
    // GPS 정보는 isGpsRunning(움직임 감지 중) 상태일 때만 포함
    // ***(스프링으로 전송시) 움직이지 않거나 GPS 신호가 없으면 lat/lng 필드를 아예 보내지 않는다 
    if (isGpsRunning && gps.location.isValid()) {
      doc["lat"] = flat;
      doc["lng"] = flon;
    }
    
    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);
    
    if (client.publish(topic_pub, jsonBuffer)) {
      Serial.print("[MQTT PUB SUCCESS] : ");
      Serial.println(jsonBuffer);
    } else {
      Serial.println("[MQTT PUB FAIL]");
    }
  }
  delay(300);
}

#include <PubSubClient.h>
#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>
#include "HX711.h"
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <TinyGPS.h>
#include <WiFi.h> 

const char* ssid = "임의";
const char* password = "임의";
const char* mqtt_broker = "165.246.44.72"; //wifi주소는 공유기 설정상 매번 바뀔수있으니 확인
const int mqtt_port = 2025;
const char* topic_pub = "Bin/test/data";

#define I2C_SDA_PIN 41
#define I2C_SCL_PIN 42 

#define LOADCELL_DOUT_PIN 35
#define LOADCELL_SCK_PIN  36
#define WATER_SENSOR_PIN 6 
#define CALIBRATION_FACTOR -370.0 

WiFiClient espClient;
PubSubClient client(espClient);

SparkFun_VL53L5CX myImager;
VL53L5CX_ResultsData measurementData;
HX711 scale;

int latestDistance = 0;   // ToF 거리값
int avg_global_dist = 0;
int avg_center_dist = 0;

unsigned long lastPrintTime = 0;
const long PUBLISH_INTERVAL = 1000;

// -------------------- Nano 33 BLE Sense , UART , GPS 변수들 ------------------------
// 아두이노 나노와 통신하기 위한 하드웨어 시리얼 객체 생성 UART 1번 채널을 사용함
HardwareSerial SerialNano(1);
// 움직임이 멈춘 것으로 판단하고 GPS를 끄기까지 기다리는 대기 시간 10초
const unsigned long TIMEOUT_MS = 20000;
// 현재 GPS 시스템이 동작 중인지 여부를 저장하는 상태 변수
bool isGpsRunning = false;
// 아두이노 나노로부터 마지막으로 움직임 신호를 받은 시각을 저장한다
unsigned long lastMovingTime = 0;

TinyGPS gps;
HardwareSerial SerialGPS(2); // UART 2번 채널 사용

//초기 GPS 데이터 전송 여부 
bool isGpsSent = false; 

//초기값을 무효한 좌표로 설정해서 GPS수신 전에는 무효한 값을 전송하도록 
float flat = TinyGPS::GPS_INVALID_F_ANGLE; 
float flon = TinyGPS::GPS_INVALID_F_ANGLE;
unsigned long age = 0;
//----------------------------------------------------------------------------------

// GPS - RX: 16, TX: 17 (UART2)
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17


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
  Serial.println("\n=== 스마트 쓰레기통 ===");

  // Nano 통신 시작 (RX:4, TX:5)
  // Nano가 보내는 "MOVING"을 듣기 위해 4 핀이 Nano의 TX와 연결되어야 함
  SerialNano.begin(9600, SERIAL_8N1, 4, 5);
  SerialNano.setTimeout(50); // 빠른 반응을 위해 타임아웃 단축
  
  // GPS 시리얼 시작 
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

  Serial.println("MQTT Broker에 연결 중");
  client.setServer(mqtt_broker, mqtt_port);
  Serial.println("MQTT Broker에 연결 완료");
  
  // ToF 센서 초기화
  Serial.println("ToF Wire begin start");
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (myImager.begin() == false) {
    Serial.println(">>> [ToF] 연결 실패! (이후 ToF 설정 건너뜀)");
    while(1);
  } else {
    Serial.println(">>> [ToF] 연결 성공!");
    myImager.setResolution(8 * 8); //88이 원래
    myImager.setRangingFrequency(15); 
    myImager.startRanging();
  }

  // 로드셀 무게 센서 초기화
  Serial.println("LoadCell start");

  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(); 

  // 수위 센서 초기화
  Serial.println("leak begin");

  pinMode(WATER_SENSOR_PIN, INPUT);
  
  Serial.println("=== 모든 센서 준비 완료, MQTT 대기 ===");
}

void loop() {
  if (!client.connected()) {
    reconnect(); 
  }
  client.loop(); 

  if (SerialNano.available()) {
      String msg = SerialNano.readStringUntil('\n');
      msg.trim(); // 공백 제거

      if (msg == "MOVING") {
        lastMovingTime = millis(); // 마지막 움직임 시간 갱신
        Serial.println(">>> [Motion Detected] GPS System ON");

        if (isGpsRunning == false) {
          isGpsRunning = true; // GPS 활성화
        }
    }
  }

  if (isGpsRunning) {
    while (SerialGPS.available()) { // NMEA 0183이라는 표준 프로토콜 형태의 Raw 텍스트를 한 글자씩 읽어오고, 
      char c = SerialGPS.read();
      
      if (gps.encode(c)) { //라이브러리가 알아서 인코딩 해줌
        // 유효한 GPS 데이터가 완성되면 변수에 저장
        gps.f_get_position(&flat, &flon, &age); //age는 "마지막으로 유효한 GPS 신호를 받은 지 몇 밀리초가 지났는가를 나타냄
        Serial.print(">>> [GPS 수신 성공] 위도: ");
        Serial.print(flat, 6); // 소수점 6자리까지 출력
        Serial.print(", 경도: ");
        Serial.print(flon, 6); // 소수점 6자리까지 출력
        Serial.print(", 경과시간(age): ");
        Serial.print(age);
        Serial.println("ms");
      }
    }
    //20초(TIMEOUT_MS) 동안 움직임 신호가 없으면 GPS 로직 끄기
    if (millis() - lastMovingTime > TIMEOUT_MS) {
       Serial.println(">>> [Timeout] GPS System OFF");
       isGpsRunning = false;
    }

  }

  int min_dist = 4000;      
  long total_sum = 0;       
  int valid_count = 0;      
  
  long center_sum = 0;      
  int center_count = 0;     
  
  int min_center_dist = 4000; // 초기값은 '아주 먼 거리'

  if (myImager.isDataReady()) {
    if (myImager.getRangingData(&measurementData)) {
      
      for (int i = 0; i < 64; i++) {
        // 행/열 계산 (8x8 그리드)
        int row = i / 8;
        int col = i % 8;

        // 가장자리는 무시하고, '중앙 4x4' 영역만 검사 (인덱스 2,3,4,5)
        if (row >= 2 && row <= 5 && col >= 2 && col <= 5) {
            
            int dist = measurementData.distance_mm[i];
            
            // 유효한 거리값인지 확인
            if (dist > 10 && dist < 4000) {
                // 중앙 영역 내에서 가장 가까운 거리(최솟값) 찾기
                if (dist < min_center_dist) {
                    min_center_dist = dist;
                }
            }
        }
      }
      latestDistance = min_center_dist; // 최종 결과 업데이트
    }
  }
  

  unsigned long currentMillis = millis();
  
  if (currentMillis - lastPrintTime >= PUBLISH_INTERVAL) { 
    lastPrintTime = currentMillis; 

    // 로드셀 & 수위 센서 읽기
    float currentWeight = abs(scale.is_ready() ? scale.get_units(1) : 0.0);
    int currentWaterLevel = analogRead(WATER_SENSOR_PIN);


    bool needCollection = false;
    String reason = ""; 

    
    // 중앙 영역 최솟값이 100mm 이내로 들어오면 Full
    if (latestDistance > 0 && latestDistance <= 100) {
        needCollection = true;
        reason += "[Full(Center)] ";
    }

    if (currentWeight >= 200.0) {
        needCollection = true;
        reason += "[Heavy] ";
    }

    if (currentWaterLevel >= 500) { 
        needCollection = true;
        reason += "[Liquid] ";
    }

    if (needCollection) {
        Serial.print("[Collection Needed] Reasons: ");
        Serial.println(reason); 
    }
    // ====================================================================
    
    StaticJsonDocument<512> doc;

    doc["bin_id"] = "Bin-Master";
    doc["distance_mm"] = latestDistance;
    doc["weight_g"] = currentWeight;
    doc["water_adc"] = currentWaterLevel;
    doc["need_collection"] = needCollection;
    
    // GPS 전송 로직
    if (isGpsSent == false) {
      // 초기 1회: GPS 상태 무관하게 기본값 전송
      doc["lat"] = 37.45;
      doc["lng"] = 126.65;
      isGpsSent = true; 
      Serial.println(">>> [알림] 초기 GPS 좌표를 포함하여 전송합니다.");
    } 
    else {
      // 그 이후 GPS 데이터가 유효하고 최신일 때만 전송
      // age < 1500 : 마지막 수신 후 1.5초 이내여야 함````````````````````````````````````````````````````````````````````````````````````````````````````````````00000000000000000000000 (실내 진입 등 신호 끊김 감지)
      bool isValid = (flat != TinyGPS::GPS_INVALID_F_ANGLE && flon != TinyGPS::GPS_INVALID_F_ANGLE);
      bool isFresh = (age < 1500); 

      if (isValid && isFresh) {
         doc["lat"] = flat;
         doc["lng"] = flon;
      }
      // 조건 불만족 시(실내 등) lat, lng 키 자체를 넣지 않음 -> 미전송
    }
    
    char jsonBuffer[512];
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
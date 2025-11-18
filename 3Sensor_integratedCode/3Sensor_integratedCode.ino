#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>
#include "HX711.h"

// [ToF 센서: VL53L5CX]
#define I2C_SDA_PIN 9
#define I2C_SCL_PIN 8

// [무게 센서: HX711]
#define LOADCELL_DOUT_PIN 35
#define LOADCELL_SCK_PIN  36
#define CALIBRATION_FACTOR -350.0 //

// [수위 감지 센서]
const int WATER_SENSOR_PIN = 6; // (GPIO 6) ADC1 채널

// ToF 객체
SparkFun_VL53L5CX myImager;
VL53L5CX_ResultsData measurementData;
int latestDistance = 0; // 가장 최근 측정한 거리 저장용

// 무게 센서 객체
HX711 scale;

// 타이머 변수 (폴링용)
unsigned long lastPrintTime = 0;
const long PRINT_INTERVAL = 500; // 0.5초마다 출력

void setup() {
  Serial.begin(9600);
  Serial.println("\n=== 센서 통합 테스트 시작 ===");

  // ToF 센서 초기화
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN); // I2C 핀 설정
  
  Serial.println("[ToF] 센서 초기화 중... (수 초 걸릴 수 있음.)");
  if (myImager.begin() == false) {
    Serial.println("[ToF] 연결 실패!");
    while (1); // 센서 없으면 멈춤
  }
  Serial.println("[ToF] 연결 성공!");
  
  myImager.setResolution(8 * 8); // 64존 모드
  myImager.setRangingFrequency(15); // 15Hz 속도
  myImager.startRanging();

  // 무게 센서 초기화
  Serial.println("[무게] HX711 초기화 중...");
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(); // 부팅 시 영점 잡기
  Serial.println("[무게] 영점 설정 완료.");

  // 수위 센서 초기화
  pinMode(WATER_SENSOR_PIN, INPUT);
  Serial.println("[수위] 핀 설정 완료.");
  
  Serial.println("=== 모든 센서 준비 완료, 측정 시작 ===");
}

void loop() {
  // ToF 센서는 비동기식으로 데이터 업데이트하기에 앞에서 처리한다 
  if (myImager.isDataReady()) {
    if (myImager.getRangingData(&measurementData)) {
      // (테스트용) 중앙 지점 (인덱스 35) 거리 저장
      latestDistance = measurementData.distance_mm[35];
    }
  }

  //타이머 개념을 적용하자
  unsigned long currentMillis = millis();
  if (currentMillis - lastPrintTime >= PRINT_INTERVAL) { //PRINT_INTERVAL : 500ms
  //즉 마지막 시각 기록 후 500ms가 지났으면 if 안쪽으로 들어온다.
    lastPrintTime = currentMillis; // 마지막 읽은 시간 갱신

    // 무게 읽기 (1회 측정)
    float currentWeight = 0;
    if (scale.is_ready()) {
      currentWeight = scale.get_units(1);
    }

    // 수위 읽기
    int currentWaterLevel = analogRead(WATER_SENSOR_PIN);

    // 한 줄로 출력하자 
    Serial.print("거리: ");
    Serial.print(latestDistance);
    Serial.print(" mm\t | "); // 탭(\t)으로 구분

    Serial.print("무게: ");
    Serial.print(currentWeight, 1);
    Serial.print(" g\t | ");

    Serial.print("수위: ");
    Serial.print(currentWaterLevel);
    
    Serial.println(); // 줄바꿈
  }
}
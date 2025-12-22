#include <Wire.h>
#include <SparkFun_VL53L5CX_Library.h>

SparkFun_VL53L5CX myImager;
VL53L5CX_ResultsData measurementData; // 측정 데이터를 담을 변수
#define I2C_SDA_PIN 41
#define I2C_SCL_PIN 42 

void setup() {
  Serial.begin(9600); 
  Serial.println("VL53L5CX Test Start...");

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  Serial.println("센서 초기화 중... (수 초 소요될 수 있음)");
  
  // begin() 함수가 센서에 펌웨어를 전송
  //이 센서는 매우 똑똑해서, 전원이 켜질 때마다 ESP32가 센서에게 "작동 매뉴얼(펌웨어)" 파일을 전송해 줘야 한다고 한다.
  if (myImager.begin() == false) {                                                          
    Serial.println("!!! 센서 연결 실패 !!!");
    while (1); // 무한 대기
  }

  Serial.println("센서 연결 성공!");
  
  // 측정 해상도 및 속도 설정
  myImager.setResolution(8 * 8); // 8x8 (64존) 모드
  myImager.setRangingFrequency(15); // 초당 15회 측정
  myImager.startRanging(); // 측정 시작
}

void loop() {
  // 데이터가 준비되었는지 확인
  if (myImager.isDataReady()) {
    
    // 데이터를 읽어옵니다
    if (myImager.getRangingData(&measurementData)) {
      
      // 64개 존 중, 중앙(4,4) 지점 하나의 거리만 예시로 출력
      // (전체를 다 출력하면 시리얼 모니터가 너무 빨라짐)
      int centerDistance = measurementData.distance_mm[35]; // 대략 중앙 인덱스
      
      Serial.print("중앙 거리: ");
      Serial.print(centerDistance);
      Serial.println(" mm");
      
      // 전체 64개 데이터를 활용하려면 여기서 for문을 돌리면 될 것이다.
    }
  }
  
  // 폴링 방식이라 별도 delay는 필요 없지만, 보기 편하게 0.5초 대기
  delay(500); 
}

// #include <HardwareSerial.h>

// #define GPS_RX_PIN 16
// #define GPS_TX_PIN 17

// HardwareSerial SerialGPS(2);

// void setup() {
//   Serial.begin(9600);
//   SerialGPS.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
//   Serial.println("Raw GPS Data Check...");
// }

// void loop() {
//   if (SerialGPS.available()) {
//     char c = SerialGPS.read();
//     Serial.write(c); // 들어오는 족족 그대로 화면에 뿌림
//   }
// }


#include <TinyGPS.h>/
#include <HardwareSerial.h>

#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define GPS_BAUD 9600 

TinyGPS gps;
HardwareSerial SerialGPS(2); 

// 마지막 출력 시간 저장용
unsigned long lastPrintTime = 0;

void setup() {
  Serial.begin(9600);
  
  SerialGPS.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  Serial.println("\n-------------------------------------");
  Serial.println("   ESP32-S3 GPS Signal Checker       ");
  Serial.println("   Go OUTSIDE to catch satellites!   ");
  Serial.println("-------------------------------------");
}

void loop() {
  // GPS 모듈에서 데이터가 들어오면 라이브러리에 계속 먹여준다
  while (SerialGPS.available()) {
    char c = SerialGPS.read();
    gps.encode(c);
  }

  if (millis() - lastPrintTime > 1000) {
    lastPrintTime = millis();
    
    long lat, lon;
    unsigned long fix_age;
    
    // 위치 정보를 가져옴
    gps.get_position(&lat, &lon, &fix_age);

    // fix_age가 INVALID -> 아직 위성을 못 잡은 것
    if (fix_age == TinyGPS::GPS_INVALID_AGE) {
      Serial.print("[검색 중...] 위성을 찾는 중입니다. (Sats: ");
      Serial.print(gps.satellites() == TinyGPS::GPS_INVALID_SATELLITES ? 0 : gps.satellites());      // 현재 발견된 위성 개수
      Serial.println(")");
    } 
    else {
      // 위성을 잡았다면 유효한 age 값이 나온다
      Serial.println(" [성공] 위성 신호를 잡았습니다.");
      Serial.print("   >> 위도: "); Serial.print(lat);
      Serial.print(" / 경도: "); Serial.println(lon);
    }
    // --------------------------------------------------
  }
}


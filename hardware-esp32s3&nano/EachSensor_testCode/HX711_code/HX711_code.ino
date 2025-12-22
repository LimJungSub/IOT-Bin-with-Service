#include "HX711.h" // 라이브러리 호출

// ESP32-S3의 안전한 핀으로 설정
#define calibration_factor -350.0 
#define DOUT 35  // GPIO 35번 핀으로 변경
#define CLK  36  // GPIO 36번 핀으로 변경
`
HX711 scale;

void setup() {
  Serial.begin(9600); 
  Serial.println("HX711 scale TEST (v0.5.2 style)");

  scale.begin(DOUT, CLK); 
  
  scale.set_scale(calibration_factor);
  scale.tare(); // 영점 설정
  Serial.println("Readings:");
}

void loop() {  if (scale.is_ready()) {
    Serial.print("Reading: ");
    Serial.print(scale.get_units(), 1); 
    Serial.print(" g"); 
    Serial.println();
  } else {
    Serial.println("HX711 응답 없음.");
  }
    delay(300); //
}`
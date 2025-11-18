const int WATER_SENSOR_PIN = 6; 
//단순히 analogRead로 해결할 수 있는 듯 하다.
void setup() {
  Serial.begin(9600);   
  // ESP32에서는 analogRead를 위한 별도 pinMode 설정이 필요 없는 경우가 많으나,
  // 명시적으로 입력 모드로 설정해도 무방하다고 한다
  pinMode(WATER_SENSOR_PIN, INPUT); 
  
  Serial.println("수위 센서 테스트 시작...");
}

void loop() {
  int sensorValue = analogRead(WATER_SENSOR_PIN);

  Serial.print("현재 수위 값: ");
  Serial.println(sensorValue);

  delay(500);
}
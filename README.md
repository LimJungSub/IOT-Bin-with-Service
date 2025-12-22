IoT 쓰레기통 스택

목차

dashboard-frontend (쓰레기통 모니터링을 위한 React + TypeScript + Vite UI)

sensor-server (PostgreSQL + MQTT 구독자를 포함한 Spring Boot 4 / Java 17 백엔드)

hardware-esp32s3&nano (ESP32-S3 & Nano 펌웨어, Edge Impulse 기반 모션 감지 / 통합 스케치 ino 파일)



데이터 흐름

ESP32 펌웨어(Master_bin/Remote_bin)가 MQTT로 JSON을 발행합니다(토픽 Bin/test/data). 거리/무게/누수 값에 필요 시 GPS 좌표가 포함되고, 모션 발생 시 GPS를 켜는 구조가 있습니다.

sensor-server가 해당 토픽을 구독하고, SensorReading 레코드를 저장한 뒤 REST API를 제공합니다.

dashboard-frontend가 REST API를 호출해 대시보드/지도/리스트 화면을 렌더링합니다.



대시보드 프론트엔드 (dashboard-frontend (대시보드))

구성: React + TS + Vite, Kakao Maps JS SDK 로더는 src/lib/kakaoLoader.ts, 센서 API 클라이언트는 src/lib/sensorApi.ts, 샘플 쓰레기통 데이터는 src/lib/trashData.ts에 있습니다.

로컬 실행

cd "dashboard-frontend (대시보드)"

npm install

npm run dev -- --host (또는 npm run build 후 npm run preview)

필요한 환경변수 (.env에 복사):
VITE_API_BASE_URL=http://localhost:8080

VITE_KAKAO_MAP_KEY=<kakao_javascript_key>

동작 방식: Dashboard/Map/List 탭으로 구성됩니다. Map 페이지는 카카오 지도를 로드하고 쓰레기통 마커를 그린 뒤, 실시간 상태를 위해 /api/readings/latest?binId=...를 조회합니다. API 데이터가 없으면 미리 심어둔 trashBins 데이터를 대체로 사용합니다. 거리/무게/누수 값은 “채움 상태/수거 필요 상태”로 변환됩니다.



센서 서버 (sensor-server (서버))

구성: Spring Boot 4, Java 17, WebFlux/WebMVC, PostgreSQL용 JPA, Eclipse Paho 기반 MQTT. 주요 클래스: mqtt/MqttSubscriberConfig(브로커 연결, 구독, SensorPayload 파싱, SensorReading 저장), sensor/controller/SensorReadingController(REST), sensor/model/SensorReading(JPA 엔티티).

REST API
GET /api/readings?binId=<id>&limit=50 -> 최신순 리스트 (binId 누락 시 400)
GET /api/readings/latest?binId=<id> -> 최신 1건 (데이터 없으면 204)
필드: id, binId, distanceMm, weightG, waterAdc, needCollection, lat, lng, createdAt.

설정 (application.properties에 기본값 존재, 환경변수로 덮어쓰기 가능):
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
APP_MQTT_BROKER_URL (기본값 tcp://165.246.44.72:2025)
APP_MQTT_CLIENT_ID (기본값 sensor-server-backend)
APP_MQTT_TOPIC (기본값 Bin/test/data)
APP_MQTT_DEFAULT_BIN_ID (bin_id가 없을 때 대체값, 기본값 Bin-Master)
PORT (기본값 8080)

로컬 실행: cd "sensor-server (서버)" && ./gradlew bootRun
JAR 빌드: ./gradlew bootJar && java -jar build/libs/*SNAPSHOT.jar
Docker: docker build -t sensor-server . && docker run -p 8080:8080 --env-file <env> sensor-server



임베디드/펌웨어 (iotEdge_finalTeamPrj)

- Master_bin/Master_bin.ino: ESP32 통합 스케치. VL53L5CX ToF(8x8) + HX711 로드셀 + 아날로그 누수 센서 + TinyGPS를 사용해 1초마다 Bin/test/data 토픽으로 MQTT 발행합니다. 거리/무게/누수 임계값으로 need_collection을 판단하며 초기 1회 기본 GPS 좌표(37.45, 126.65)를 넣습니다. Wi-Fi SSID/비밀번호와 브로커 정보가 하드코딩되어 있으므로 플래시 전 교체하세요.
- Remote_bin/Remote_bin.ino: ESP32 스케치로 Nano 33 BLE Sense(모션 추론 결과 “MOVING”)를 UART(RX4/TX5)로 수신해 GPS(UART2, RX16/TX17)를 필요 시만 켭니다. ToF 중심/전체 거리, 로드셀, 누수 센서 값을 읽어 bin_id=Bin-Master, need_collection 여부, 최신 GPS(유효/신선한 경우만)와 함께 Bin/test/data로 MQTT 발행합니다.
- nano_motion_detect/nano_motion_detect.ino: Arduino Nano 33 BLE Sense용. LSM9DS1 가속도계를 Edge Impulse 모델(motion_detect_iot_bin_inferencing)로 추론해 모션 스코어가 임계값(약 0.7) 이상이면 UART(Serial1)로 “MOVING”을 ESP32에 전송하여 GPS를 게이팅합니다.
- motion_detect_iot_bin_inferencing/: Edge Impulse C++ 추론 라이브러리와 예제(examples/esp32, nano_ble33_sense, nicla_sense, nicla_vision, portenta_h7, rp2040, sony_spresense, static_buffer). 핵심 헤더는 src/motion_detect_iot_bin_inferencing.h에 있으며, model-parameters 및 tflite-model이 포함됩니다.
- EachSensor_testCode/: 단일 센서 브링업 스케치. GPSNeo6m_code, HX711_code, LeakSensor_code, ToFSensor_code로 구성되어 개별 센서를 따로 검증할 수 있습니다.

MQTT 페이로드 예시:
{
  "bin_id": "Bin-Master",
  "distance_mm": 120,
  "weight_g": 180.5,
  "water_adc": 420,
  "need_collection": false,
  "lat": 37.45,
  "lng": 126.65
}
(GPS가 비활성 상태면 lat/lng는 생략됩니다. 이때 백엔드는 binId가 없을 경우 APP_MQTT_DEFAULT_BIN_ID를 사용합니다.)




팁

운영(프로덕션) 적용 전에는 Wi-Fi 및 DB 자격증명(크리덴셜)을 교체하세요.

프론트/백엔드 환경변수 값을 서로 일치시키세요: API Base URL, 카카오 키, MQTT 토픽/bin id 등.

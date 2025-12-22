#include <motion_detect_iot_bin_inferencing.h>
#include <Arduino_LSM9DS1.h>

#define CONVERT_G_TO_MS2    9.80665f
#define MAX_ACCEPTED_RANGE  2.0f        // 가속도 센서 범위

static bool debug_nn = false; // true로 하면 AI모델에서 시리얼 모니터에 자세한 로그 출력

void setup()
{
    // PC와 통신할 속도
    Serial.begin(9600);
    
    // ESP32와 통신할 UART 시리얼 (Pin 0, 1) 속도
    Serial1.begin(9600); 

    // Serial.println("Edge Impulse Inferencing Demo");

    // IMU 센서 초기화 (IMU변수 출처는 LSM9DS1라이브러리)
    if (!IMU.begin()) {
        Serial.println("Failed to initialize IMU!");
    }
    else {
        Serial.println("IMU initialized");
    }

    if (EI_CLASSIFIER_RAW_SAMPLES_PER_FRAME != 3) { //AI모델 헤더파일에 있는 변수 (Inference 주기에 필요한 전체 데이터 샘플의 개수)
    /*
    윈도우 크기: 2초 (125Hz 샘플링) ➔ 샘플 수: 250개 [이것은 AI모델을 통해 결정됐었다]
    센서 축 개수: 가속도계 3축 (X, Y, Z)
    -> EI_CLASSIFIER_RAW_SAMPLES_PER_FRAME = 250 * 3 = 750, 이 상수가 있어야 Nano가 AI 모델에게 데이터를 넘겨줄 때 버퍼 크기가 정확히 맞게 된다
    */
        Serial.println("ERR: EI_CLASSIFIER_RAW_SAMPLES_PER_FRAME should be equal to 3 (the 3 sensor axes)");
        return;
    }
}

void loop()
{
    // AI 모델(2초짜리 윈도우)은 그대로 두고, 2초짜리 검사를 연속으로 2번(총 4초) 실행한 뒤 평균 점수를 내는 방식으로 진행한다
    // 2번 연속 측정하여 평균 점수를 내기 위한 변수 설정
    float totalMovingScore = 0.0;
    int checkCount = 3;

    //각 루프마다 2초만큼의 움직임데이터로 AI 추론 및 Moving Score 뽑아오기
    //checkCount*MovingScore -> totalMovingScore

    //측정된 점수들의 평균 계산
    
    // 조건: 'moving' 평균 점수가 0.7 이상이면 -> MOVING
    //       나머지(점수가 낮거나, noising, stopping이 높은 경우) -> STOPPED
    
   
    
    for (int i = 0; i < checkCount; i++) {
        
        // 엣지 임펄스 모델이 요구하는 샘플링 속도에 맞춰 데이터를 모으기
        float buffer[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE] = { 0 };

        for (size_t ix = 0; ix < EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE; ix += 3) {
            uint64_t next_tick = micros() + (EI_CLASSIFIER_INTERVAL_MS * 1000);
            
            float x, y, z;
            // 가속도 값 읽기
            if (IMU.accelerationAvailable()) {
                IMU.readAcceleration(x, y, z);
                
                // G -> m/s^2 단위 변환
                buffer[ix] = x * CONVERT_G_TO_MS2;
                buffer[ix + 1] = y * CONVERT_G_TO_MS2;
                buffer[ix + 2] = z * CONVERT_G_TO_MS2;
            }

            // 다음 샘플링 시간까지 대기
            uint64_t time_to_wait = next_tick - micros();
            delayMicroseconds(time_to_wait);
        }

        // AI 추론 실행
        signal_t signal;
        int err = numpy::signal_from_buffer(buffer, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
        if (err != 0) {
            Serial.print("ERR: signal_from_buffer failed (");
            Serial.print(err);
            Serial.println(")");
            return;
        }

        ei_impulse_result_t result = { 0 };
        err = run_classifier(&signal, &result, debug_nn);
        if (err != EI_IMPULSE_OK) {
            Serial.print("ERR: Failed to run classifier (");
            Serial.print(err);
            Serial.println(")");      
            return;
        }

        // 전체 라벨 중 moving의 점수만 뽑아내자
        for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
            // (디버깅용) 모든 라벨의 점수 출력
            Serial.print(result.classification[ix].label);
            Serial.print(": ");
            Serial.println(result.classification[ix].value);

            // 라벨 이름이 moving인 것의 점수를 누적
            if (String(result.classification[ix].label) == "moving") {
                totalMovingScore += result.classification[ix].value;
            }
        }
    }
    

    float averageScore = totalMovingScore / checkCount;
   

    
    if (averageScore >= 0.7) {
        Serial.println("[uart sent] current status >> MOVING"); 
        Serial1.println("MOVING");       // ESP32로 전송
    } else {
        Serial.println("[uart not sent] current state >> STOPPED"); 
    }
    // Serial.print("Final Average Score: ");
    // Serial.println(averageScore);
    
    Serial.println("----------------------------------");
    delay(100); // 
}

// void loop()
// {
  
//     // 엣지 임펄스 모델이 요구하는 샘플링 속도에 맞춰 데이터를 모으기
//     float buffer[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE] = { 0 };

//     for (size_t ix = 0; ix < EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE; ix += 3) {
//         uint64_t next_tick = micros() + (EI_CLASSIFIER_INTERVAL_MS * 1000);
        
//         float x, y, z;
//         // 가속도 값 읽기
//         if (IMU.accelerationAvailable()) {
//             IMU.readAcceleration(x, y, z);
            
//             // 단위 변환 (G -> m/s^2) 및 버퍼 저장
//             buffer[ix] = x * CONVERT_G_TO_MS2;
//             buffer[ix + 1] = y * CONVERT_G_TO_MS2;
//             buffer[ix + 2] = z * CONVERT_G_TO_MS2;
//         }

//         // 다음 샘플링 시간까지 대기
//         uint64_t time_to_wait = next_tick - micros();
//         delayMicroseconds(time_to_wait);
//     }


//     // AI 추론 실행
//     signal_t signal;
//     int err = numpy::signal_from_buffer(buffer, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
//     if (err != 0) {
//         Serial.print("ERR: signal_from_buffer failed (");
//         Serial.print(err);
//         Serial.println(")");
//         return;
//     }

//     ei_impulse_result_t result = { 0 };
//     err = run_classifier(&signal, &result, debug_nn);
//     if (err != EI_IMPULSE_OK) {
//         Serial.print("ERR: Failed to run classifier (");
//         Serial.print(err);
//         Serial.println(")");      
//         return;
//     }


//     // 전체 라벨 중 moving의 점수만 뽑아내자
//     float movingScore = 0.0;

//     for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
//         // (디버깅용) 모든 라벨의 점수 출력
//         Serial.print(result.classification[ix].label);
//         Serial.print(": ");
//         Serial.println(result.classification[ix].value);

//         // 라벨 이름이 moving인 것의 점수를 저장
//         if (String(result.classification[ix].label) == "moving") {
//             movingScore = result.classification[ix].value;
//         }
//     }

//     // 조건: 'moving' 점수가 0.7 이상이면 -> MOVING
//     //       나머지(점수가 낮거나, noising, stopping이 높은 경우) -> STOPPED
//     if (movingScore >= 0.7) {
//         Serial.println("[uart sent] current status >> MOVING"); 
//         Serial1.println("MOVING");       // ESP32로 전송
//     } else {
//         Serial.println("[uart not sent] current state >> STOPPED"); 
//     }
    
//     Serial.println("----------------------------------");
//     delay(100); // 
// }
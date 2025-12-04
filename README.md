# IOT-Bin-with-Service
[2025-2 IOT 엣지컴퓨팅개론 프로젝트] : Edge Impulse / WisePaaS / ESP32 MCU를 활용한 Smart bin

백엔드 측에서 각 쓰레기통별 마지막 GPS값 저장 필요, 백엔드에선 GPS값이 새로 들어왔을때에만 GPS값을 교체한다

(스프링으로 전송시) 움직이지 않거나 GPS 신호가 없으면 lat/lng 필드를 json에 아예 담지 않는다 

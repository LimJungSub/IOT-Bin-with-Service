let loadingPromise: Promise<any> | null = null;

export function loadKakaoMaps(appKey: string) {
    const w = window as any;

    if (w.kakao?.maps) return Promise.resolve(w.kakao);
    if (loadingPromise) return loadingPromise;

    loadingPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-kakao-sdk="true"]') as HTMLScriptElement | null;
        if (existing) existing.remove();

        const script = document.createElement("script");
        script.dataset.kakaoSdk = "true";
        script.async = true;

        // ✅ services 추가: 주소 → 좌표(Geocoder) 사용 가능
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;

        script.onload = () => {
            if (!w.kakao?.maps?.load) {
                reject(new Error("Kakao SDK는 로드됐지만 maps.load가 없습니다(응답이 JS가 아닐 수 있음)."));
                return;
            }
            w.kakao.maps.load(() => resolve(w.kakao));
        };

        script.onerror = () => reject(new Error("Kakao SDK 로드 실패(네트워크/차단/도메인/키 확인 필요)."));
        document.head.appendChild(script);
    });

    return loadingPromise;
}

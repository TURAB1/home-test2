var token = sessionStorage.getItem('token');
var vehicle_data = get_vehicle_data(token);
var trip_history_data = get_trip_history_data(token);
var updateVehicleData = {};
console.log("trips_history_data:", trip_history_data);

let searchKey = '';
let map = null;
let pathCoords = [];
let pathLine = null;
let currentMarker = null;
let startMarker = null;
let endMarker = null;
let pagerB, pagerC, pagerDevice, pagerVehicleList;
let _pageSize = 10;
let isVehicleClick = false;
const markerByKey = {}; // 차량 키별 마커 저장 객체
const pathByKey = {}; // 차량 키별 경로 좌표 저장 객체
let markersLayer = L.layerGroup();
let pathLayer = L.layerGroup();
let historyLayer = L.layerGroup();



// ----웹소겟 연결 ----
function connectWS() {
    const ws = new WebSocket("wss://adocs.viewcar.co.kr/api/plugin/ws/subscribe?token=" + sessionStorage.getItem('token')); // TODO

    ws.onopen = () => console.log("WS: connected");
    ws.onclose = () => {
        console.log("WS: disconnected (reconnecting...)");
        setTimeout(connectWS, 1500);
    };
    ws.onerror = () => console.log("WS: error");

    ws.onmessage = (evt) => {
        let msg;
        try { msg = JSON.parse(evt.data); } catch { return; }
        console.log("WS message:", msg);
        console.log("location:", msg.values?.latestLat, msg.values?.latestLon);
        const newValue = msg.values || {};
        updateVehicleData['msg'] = msg;

        const id = vehicle_data['data']['items'].findIndex(i => i.vehicleKey === msg.vehicleKey);
        $.extend(vehicle_data['data']['items'][id], newValue);
        // console.log("new_vehicle_data:", vehicle_data['data']['items'][id] );
        //forB
        // const positions = msg['positions'] || [];
        // const length = positions.length;
        // const vehicleKey = msg.vehicleKey;
        // if (length > 0)
        //     positions.forEach(pos => {
        //         if (!pathByKey[vehicleKey])
        //             pathByKey[vehicleKey] = [];
        //         pathByKey[vehicleKey].push([pos.lat, pos.lon]);
        //     });
        //forB

        switch (msg.type) {
            case 'VEHICLE_POSITION_APPEND':
                {
                    renderB();
                    break;
                }

            case 'VEHICLE_PROP_MULTI_UPDATE': {
                renderA();
                break;
            }
            case 'VEHICLE_PROP_SINGLE_UPDATE':
                break;
            default:
                return;
        }

        //전역 vehicle_data 업데이트
        //화면 render
        //renderA();

    };


}

connectWS();
/*
// 테스트용 위치 업데이트 시뮬레이터2
(() => {
    var msg = {
        "vehicleKey": "ed9378fd-5142-48b9-a67f-9b4dec81db7f",
        "ts": 1697047200,
        "values": {
            "currentRpm": 2500,
            "journeyDistanceKm": 120.5,
            "currentSpeedKph": 80,
            "latestLat": 37.5665,
            "latestLon": 126.9780,
            "latestGpsTs": 1697047195
        }
    };

    function pathUpdateSimulator() {
        const ranLat = Math.random() * 0.01
        const ranLon = Math.random() * 0.01
        msg['values']['latestLat'] = (37.5665 + ranLat) > 37.57 ? (37.5665 + ranLat) : 37;
        msg['values']['latestLon'] = (126.9780 + ranLon) > 126.98 ? (126.9780 + ranLon) : 126;
        updateVehicleData['msg'] = msg;

        var item = vehicle_data['data']['items'].filter(i => i.vehicleKey === msg.vehicleKey);
        const id = vehicle_data['data']['items'].findIndex(i => i.vehicleKey === msg.vehicleKey);
        $.extend(vehicle_data['data']['items'][id], msg.values);
        // renderA();
        renderB();
       /// updateMapPath(msg.vehicleKey, msg['values']['latestLat'], msg['values']['latestLon']);

    }
    setInterval(pathUpdateSimulator, 5000); // 5초마다 위치 업데이트 시뮬레이션
})()*/

function renderA() {
    const newVal = updateVehicleData['msg'].values || {};
    const vehicleKey = updateVehicleData['msg'].vehicleKey;
    if (map.hasLayer(pathLayer))
        renderVehiclesB();
    if (newVal?.latestLat && newVal?.latestLon) {
        updateVehicleMarker(vehicleKey, newVal?.latestLat, newVal?.latestLon);
        // if (isVehicleClick) {
        //     if (map.hasLayer(pathLayer))
        //         updateMapPath(vehicleKey, newVal?.latestLat, newVal?.latestLon);
        // }
    }
    if (isVehicleClick) {
        renderVehicleStatusDetail(vehicleKey);
    }

}

function renderB() {
    const positions = updateVehicleData['msg'].positions || [];
    const length = positions.length;
    const vehicleKey = updateVehicleData['msg'].vehicleKey;
    var vehicleItem = vehicle_data['data']['items'].filter(i => i.vehicleKey === vehicleKey);

    if (length > 0) {
        for (var i = length - 1; i >= 0; i--) {
            const pos = positions[i];
            if (!pathByKey[vehicleKey])
                pathByKey[vehicleKey] = [];
            if (vehicleItem.journeyStartTs === pos.journeyStartTs)//check data again???10초후에 계속?? 
                pathByKey[vehicleKey].push([pos.lat, pos.lon]);
        };
        if (map.hasLayer(pathLayer) && isVehicleClick)
            updateMapPath(vehicleKey, positions[0].lat, positions[0].lon);//check data again???

    }

}


/*
function renderVehicles() {
    $('.vehicle-data-box').empty();
    let found = false; // 검색 결과 유무 확인 변수
    vehicle_data['data']['items'].forEach(function (item, id) {
        const item1 = item;
        item = JSON.stringify(item);
        searchKey = $('input[type="text"]').val().toLowerCase().trim();
        if (!searchKey)
            $('.vehicle-data-box').append(`<div class="vehicle-data-item ${item1.vehicleKey}" data-id="${id}">차량데이터:${item} </div>`);
        else {
            if (item.toLowerCase().includes(searchKey)) {
                $('.vehicle-data-box').append(`<div class="vehicle-data-item ${item1.vehicleKey}">차량데이터:${item} </div>`);
                found = true;
            }
        }

    });
    if (searchKey && !found) {
        $('.vehicle-data-box').append(`<div class="vehicle-data-item">검색 결과가 없습니다.</div>`);
    }
    $(".vehicle-data-item").on("click", function () {
        isVehicleClick = true;
        const dataText = $(this).text().replace('차량데이터:', '');
        const dataObj = JSON.parse(dataText);
        console.log("Clicked vehicle data:", dataObj);
        if (map.hasLayer(historyLayer))
            tripHistoryDraw(dataObj.vehicleKey);
        //drawPathFor(dataObj.vehicleKey);

        if (map.hasLayer(pathLayer))
            updateMapPath(dataObj.vehicleKey, dataObj.latestLat, dataObj.latestLon);
    });

}
*/


function renderVehiclesB() {
    $(function () {
        // var allData = [];
        // for (var i = 1; i <= 124; i++) {
        //     allData.push({ id: i, name: "item" + i });
        // }
        var journeyStopCount = 0;
        pagerB = new Paginator({
            pagerSelector: "#pagerB",
            listSelector: "#listB",
            pageSize: 10,
            windowSize: 5,
            data: vehicle_data['data']['items'],
            filterFn: function (item) {
                if (!$.trim($("#search_input").val()).toLowerCase()) return true;
                // 검색 필드 선택
                var hay = (item.plateNum + " " + item.vehicleKey).toLowerCase();
                return hay.indexOf($.trim($("#search_input").val()).toLowerCase()) !== -1;
            },
            rowRenderer: function (item) {
                const journeyStartTs = item.journeyStartTs ? list_date(item.journeyStartTs) : '-';
                if (journeyStartTs === '-')
                    journeyStopCount++;
                var drivingModeText = journeyStartTs === '-' ? '주행종료' :
                    item.drivingMode === 1 ? '수동주행' :
                        item.drivingMode === 2 ? '반자율주행(Lv.2)' :
                            item.drivingMode === 3 ? '자율주행' :
                                item.drivingMode === 4 ? '협력형자율주행' :
                                    '알수없음';
                return (
                    `
                <tr class="vehicle-status-item" data-vehicleKey="${item.vehicleKey}">
                    <td>${item.plateNum}</td>
                    <td>${journeyStartTs}</td>
                    <td>
                        <strong>${drivingModeText}</strong>
                    </td>
                </tr>
              `
                );
            },

            emptyHtml: `
                <tr class="vehicle-status-item" >
                    <td colspan="3" class="text-center">데이터가 없습니다</td>
                </tr>
              `
        });
        pagerB.go(1);

        $('#vehicleStatusContainer #registeredVehicle').text(vehicle_data['data']['items'].length);
        $("#vehicleStatusContainer #useEnd").text(journeyStopCount)
        $("#vehicleStatusContainer #beingUsed").text(vehicle_data['data']['items'].length - journeyStopCount)

        $(".vehicle-status-item").on("click", function () {
            isVehicleClick = true;
            const vehicleKey = $(this).data("vehiclekey");
            dataObj = vehicle_data['data']['items'].find(i => i.vehicleKey === vehicleKey);
            console.log("Clicked vehicle data:", dataObj);
            $("#vehicleStatusContainer").hide();
            $("#vehicleStatusDetail").show();
            $('#vehicleStatusDetail #plateNum').text(dataObj.plateNum);
            renderVehicleStatusDetail(vehicleKey);
            drawExistingPath(vehicleKey, dataObj.latestLat, dataObj.latestLon);

        });

    });

}

function applySearchVehicle() {
    pagerB.refresh();           // 현재 페이지에 필터를 다시 적용
    pagerB.go(1);               // 사용자 경험 개선: 새 검색 시 1페이지로 재설정
}
function applySearchTrip() {
    pagerC.refresh();
    pagerC.go(1);
}
function refreshTrip() {
    pagerC.refresh();
    pagerC.go(1);
}
function renderVehiclesC(searchStartTs = null, searchEndTs = null) {
    if (!searchStartTs && !searchEndTs) {
        trip_history_data = get_trip_history_data(sessionStorage.getItem('token'), searchStartTs, searchEndTs);
    }
    console.log("trip_history_data:", trip_history_data);
    $(function () {
        pagerC = new Paginator({
            pagerSelector: "#pagerC",
            listSelector: "#listC",
            pageSize: 10,
            windowSize: 5,
            data: trip_history_data['data'],
            filterFn: function (item) {
                if (!$.trim($("#search_input_trip").val()).toLowerCase()) return true;
                // 검색 필드 선택
                var hay = (item.deviceSn + " " + item.vehicleKey).toLowerCase();
                return hay.indexOf($.trim($("#search_input_trip").val()).toLowerCase()) !== -1;
            },
            rowRenderer: function (item) {
                const startTime = item.startTs ? list_date(item.startTs) : '-';
                const endTime = item.endTs ? list_date(item.endTs) : '-';
                return (
                    `
                <tr class="vehicle-trip-item" data-vehicleKey="${item.vehicleKey}" data-tripKey="${item.tripKey}">
                    <td>${item.deviceSn}</td>
                    <td>${startTime}</td>
                    <td>${endTime}</td>
                </tr>
              `
                );
            },

            emptyHtml: `
                <tr class="vehicle-trip-item" >
                    <td colspan="3" class="text-center">데이터가 없습니다</td>
                </tr>
              `
        });
        pagerC.go(1);

        $(".vehicle-trip-item").on("click", function () {
            const vehicleKey = $(this).data("vehiclekey");
            const tripKey = $(this).data("tripkey");
            dataObj = vehicle_data['data']['items'].find(i => i.vehicleKey === vehicleKey);
            console.log("Clicked vehicle data:", dataObj);

            tripHistoryDraw(vehicleKey, tripKey);
            $("#tripHstrContainer").hide();
            $("#tripHstrDetail").show();
        });

    });

}
function renderVehicleStatusDetail(vehicleKey) {
    const item = vehicle_data['data']['items'].find(i => i.vehicleKey === vehicleKey);
    if (!item) return;
    if (item.currentSpeedKph)
        $('#vehicleStatusDetail #speed').text(item.currentSpeedKph + ' km/h');
    if (item.currentRpm)
        $('#vehicleStatusDetail #rpm').text(item.currentRpm);
    if (item.journeyDistanceKm)
        $('#vehicleStatusDetail #distance').text((item.journeyDistanceKm).toFixed(2) + ' km');
    //
    if (item.lidarStatus) {
        const statusText = item.lidarStatus === 1 ? "정상" :
            item.lidarStatus === 2 ? "이상" :
                "알수없음"
        $('#vehicleStatusDetail #lidarStatus').text(statusText);
    }
    if (item.cameraStatus) {
        const statusText = item.cameraStatus === 1 ? "정상" :
            item.cameraStatus === 2 ? "이상" :
                "알수없음"
        $('#vehicleStatusDetail #cameraStatus').text(statusText);
    }

    if (item.radarStatus) {
        const statusText = item.radarStatus === 1 ? "정상" :
            item.radarStatus === 2 ? "이상" :
                "알수없음"
        $('#vehicleStatusDetail #radarStatus').text(statusText);
    }

}


function initMap(mapContainer) {
    if (map) return; // 지도가 이미 초기화된 경우 무시

    // 기본 위치(서울)로 지도를 초기화
    map = L.map(mapContainer).setView([37.5665, 126.9780], 13);

    // OpenStreetMap tiles 추가
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markersLayer.addTo(map);//마커 레이어 추가

}
function initMapA(mapContainer) {
    if (map) return; // 지도가 이미 초기화된 경우 무시  
    map = L.map(mapContainer).setView([37.5665, 126.9780], 13); // 기본 위치(서울)로 지도를 초기화

    // OpenStreetMap tiles 추가
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markersLayer.addTo(map);//마커 레이어 추가

    const markers = [];
    vehicle_data['data']['items'].forEach(p => {
        if (p.latestLat && p.latestLon) {
            const m = currentMarker = L.marker([p.latestLat, p.latestLon]).addTo(map).bindPopup(p.plateNum);
            markerByKey[p.vehicleKey] = m; // 마커를 차량 키로 저장
            m.addTo(markersLayer);// 마커 레이어에 추가(map에 직접 추가하지 않음)
            markers.push(m);
        }

    });

    // 모든 마커에 맞춰 지도를 조정
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));

}
function updateVehicleMarker(vehicleKey, lat, lon) {
    if (markerByKey[vehicleKey]) {
        markerByKey[vehicleKey].setLatLng([lat, lon]);//마커가 있으면 위치 업데이트
    }
    // else {
    //     currentMarker = markerByKey[vehicleKey] = L.marker([lat, lon]).addTo(map).bindPopup(vehicleKey);//마커가 없으면 생성하고 저장
    // }
}
function updateMapPath(vehicleKey, lat, lon) {
    if (!map) return; // 맵이 아직 초기화되지 않은 경우 무시
    const pathCoords = []
    pathCoords = pathByKey[vehicleKey];
    //pathByKey[vehicleKey].push([lat, lon]) on each GPS update
    console.log("path update:", pathCoords);
    // 기존 폴리라인이 있으면 제거
    if (pathLine) {
        map.removeLayer(pathLine);
    }

    // 업데이트된 좌표로 새 폴리라인을 생성
    if (pathCoords.length > 1) {
        pathLine = L.polyline(pathCoords, { weight: 6, color: 'blue' }).addTo(map);
        map.fitBounds(pathLine.getBounds());
    }

    // 기존 현재 위치 표시를 제거
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }

    // 현재 위치 마커를 추가
    currentMarker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<h3>Current Location</h3><p>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</p>`);
}
function drawExistingPath(vehicleKey, lat, lon) {
    if (!map) return; // 맵이 아직 초기화되지 않은 경우 무시
    // pathByKey[vehicleKey] = [
    //     [37.5665, 126.9780],
    //     [37.5650, 126.9900],
    //     [37.5700, 127.0000]
    // ];
    const coords = [];
    pathByKey[vehicleKey] = [];
    const journeyData = get_current_journey_data(vehicleKey, token);
    console.log("journeyData:", journeyData);

    if (journeyData['result'] || journeyData['data']['list'].length > 0)
        journeyData['data']['list'].forEach(pc => {
            coords.push([pc.lat, pc.lon]);
            pathByKey[vehicleKey].push([pc.lat, pc.lon]);
        });
    //console.log("trip coordsExist:", coords);

    // 기존 폴리라인이 있으면 제거
    if (pathLine) {
        map.removeLayer(pathLine);
    }

    // 업데이트된 좌표로 새 폴리라인을 생성
    if (coords.length > 1) {
        pathLine = L.polyline(coords, { weight: 6, color: 'blue' }).addTo(map);
        map.fitBounds(pathLine.getBounds());
    }

    // 기존 현재 위치 표시를 제거
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }

    // 현재 위치 마커를 추가
    currentMarker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<h3>Current Location</h3><p>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</p>`);
}
function tripHistoryDraw(vehicleKey, tripKey) {
    // var coords = [
    //     [37.5665, 126.9780],
    //     [37.5650, 126.9900],
    //     [37.5700, 127.0000]
    // ];
    //const journeyData = get_current_journey_data(vehicleKey, token);
    const journeyData = get_past_journey_data(vehicleKey, tripKey, token)
    console.log("journeyData:", journeyData);
    const coords = [];
    if (!journeyData['result'] || journeyData['data']['list'].length === 0) return;

    journeyData['data']['list'].forEach(pc => {
        coords.push([pc.lat, pc.lon]);
    });
    //console.log("trip coords:", coords);
    //const coords = pathByKey[vehicleKey] || [];
    if (coords.length === 0) return;
    if (pathLine) {
        map.removeLayer(pathLine);
    }
    if (startMarker) {
        map.removeLayer(startMarker);
    }
    if (endMarker) {
        map.removeLayer(endMarker);
    }

    pathLine = L.polyline(coords, { weight: 6 }).addTo(map);

    // 4) 화면을 라인에 맞추기
    map.fitBounds(pathLine.getBounds());

    // 시작/끝 마커
    startMarker = L.marker(coords[0]).addTo(map).bindPopup("<h3>출발</h3>");
    endMarker = L.marker(coords[coords.length - 1]).addTo(map).bindPopup("도착");
}
function drawPathFor(vehicleKey) {
    const coords = pathByKey[vehicleKey] || [];

    pathLayer.clearLayers();

    if (coords.length === 0) return;

    // if only one point, show it
    if (coords.length === 1) {
        L.circleMarker(coords[0], { radius: 6 }).addTo(pathLayer).bindPopup(vehicleKey + " (1 point)");
        map.setView(coords[0], Math.max(map.getZoom(), 16));
        return;
    }

    const line = L.polyline(coords, { weight: 6 }).addTo(pathLayer);

    // start/end markers on the path layer
    L.circleMarker(coords[0], { radius: 6 }).addTo(pathLayer).bindPopup("Start: " + vehicleKey);
    L.circleMarker(coords[coords.length - 1], { radius: 6 }).addTo(pathLayer).bindPopup("End: " + vehicleKey);

    map.fitBounds(line.getBounds().pad(0.2));
}

function vehicleStatusView() {
    if (map.hasLayer(historyLayer)) {
        if (pathLine)
            map.removeLayer(pathLine);
        if (startMarker)
            map.removeLayer(startMarker);
        if (endMarker)
            map.removeLayer(endMarker);
        map.removeLayer(historyLayer)
    };

    if (!map.hasLayer(markersLayer)) {
        markersLayer.addTo(map);
        const markers = [];
        vehicle_data['data']['items'].forEach(p => {
            const m = currentMarker = L.marker([p.latestLat, p.latestLon]).addTo(map).bindPopup(p.plateNum);
            markerByKey[p.vehicleKey] = m; // 마커를 차량 키로 저장
            m.addTo(markersLayer);// 마커 레이어에 추가(map에 직접 추가하지 않음)
            markers.push(m);
        });

        // 모든 마커에 맞춰 지도를 조정
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
    }
    isVehicleClick = false;
    if (!map.hasLayer(pathLayer)) pathLayer.addTo(map);
}
function tripHistoryView() {
    if (map.hasLayer(pathLayer)) {
        if (pathLine)
            map.removeLayer(pathLine);
        if (currentMarker)
            map.removeLayer(currentMarker);
        map.removeLayer(pathLayer)
    };
    if (map.hasLayer(markersLayer)) {
        if (currentMarker)
            map.removeLayer(currentMarker);
        map.removeLayer(markersLayer);
    }
    if (!map.hasLayer(historyLayer)) historyLayer.addTo(map);
    isVehicleClick = false;
}
//123
function renderStatusEvents(vehicleKey, tripEventKey) {

    const statusEvent = get_status_event(sessionStorage.getItem('token'), vehicleKey, tripEventKey);

    console.log("statusEvent:", statusEvent);
    $(function () {
        pagerStatusEvent = new Paginator({
            pagerSelector: "#pagerStatusEvent",
            listSelector: "#listStatusEvent",
            pageSize: 10,
            windowSize: 5,
            data: statusEvent['data'],
            filterFn: function (item) {
                if (!$.trim($("#search_input_trip").val()).toLowerCase()) return true;
                // 검색 필드 선택
                var hay = (item.deviceSn + " " + item.vehicleKey).toLowerCase();
                return hay.indexOf($.trim($("#search_input_trip").val()).toLowerCase()) !== -1;
            },
            rowRenderer: function (item) {
                const startTime = item.startTs ? list_date(item.startTs) : '-';
                const endTime = item.endTs ? list_date(item.endTs) : '-';
                return (
                    `
                <tr class="vehicle-trip-item" data-vehicleKey="${item.vehicleKey}" data-tripKey="${item.tripKey}">
                    <td>${item.deviceSn}</td>
                    <td>${startTime}</td>
                    <td>${endTime}</td>
                </tr>
              `
                );
            },

            emptyHtml: `
                <tr class="vehicle-trip-item" >
                    <td colspan="3" class="text-center">데이터가 없습니다</td>
                </tr>
              `
        });
        pagerStatusEvent.go(1);


    });

}

function renderTripHstrEvents(vehicleKey, tripEventKey) {
    const tripEvent = get_trip_hstr_event(sessionStorage.getItem('token'), vehicleKey, tripEventKey);

    console.log("tripEvent:", tripEvent);
    $(function () {
        pagerTripEvent = new Paginator({
            pagerSelector: "#pagerTripEvent",
            listSelector: "#listTripEvent",
            pageSize: 10,
            windowSize: 5,
            data: tripEvent['data'],
            filterFn: function (item) {
                if (!$.trim($("#search_input_trip").val()).toLowerCase()) return true;
                // 검색 필드 선택
                var hay = (item.deviceSn + " " + item.vehicleKey).toLowerCase();
                return hay.indexOf($.trim($("#search_input_trip").val()).toLowerCase()) !== -1;
            },
            rowRenderer: function (item) {
                const startTime = item.startTs ? list_date(item.startTs) : '-';
                const endTime = item.endTs ? list_date(item.endTs) : '-';
                return (
                    `
                <tr class="vehicle-trip-item" data-vehicleKey="${item.vehicleKey}" data-tripKey="${item.tripKey}">
                    <td>${item.deviceSn}</td>
                    <td>${startTime}</td>
                    <td>${endTime}</td>
                </tr>
              `
                );
            },

            emptyHtml: `
                <tr class="vehicle-trip-item" >
                    <td colspan="3" class="text-center">데이터가 없습니다</td>
                </tr>
              `
        });
        pagerTripEvent.go(1);


    });

}

function renderDeviceList() {

    const deviceList = get_device_list(sessionStorage.getItem('token'));

    console.log("devicelist1:", deviceList);
    $(function () {
        pagerDevice = new Paginator({
            pagerSelector: "#pagerDevice",
            listSelector: "#deviceList",
            pageSize: 10,
            windowSize: 5,
            data: deviceList['data']['items'],
            filterFn: function (item) {
                if (!$.trim($("#search_input_device").val()).toLowerCase()) return true;
                // 검색 필드 선택
                var hay = (item.deviceSn).toLowerCase();
                return hay.indexOf($.trim($("#search_input_device").val()).toLowerCase()) !== -1;
            },
            rowRenderer: function (item) {
                return (
                    `
                    <tr class="vehicle-device-item">
                        <td>
                        ${item.deviceSeries} ${item.deviceSn}
                        </td>
                        <td class="attach-vehicle-device" data-item="${item.deviceSn}"><button class="btn">차량·단말기 연동</button></td>
                    </tr>
              `
                );
            },

            emptyHtml: `
                <tr class="vehicle-device-item" >
                    <td colspan="3" class="text-center">데이터가 없습니다</td>
                </tr>
              `
        });
        $("#devicePageSizeSelect").val(String(pagerDevice.pageSize));
        pagerDevice.go(1);

        $(".attach-vehicle-device").on("click", function () {

            popupOpen("Modal2")
            const deviceSn = $(this).data('item')
            $("#Modal2 #deviceSnInput").text(deviceSn)

        });
        $("#deviceDeviceageSizeSelect").on("change", function () {
            pagerDevice.setPageSize($(this).val());
        });

        $("#vehicleDeviceMngContainer #availableDeviceNum").text(deviceList['data']['items'].length)
        isVehicleClick = false;

    });


}


function renderVehicleList() {
    let beingUsedCount = 0;
    const vehicles = get_vehicle_data(token);
    $(function () {
        pagerVehicleList = new Paginator({
            pagerSelector: "#pagerVehicleList",
            listSelector: "#vehicleList",
            pageSize: 10,
            windowSize: 5,
            data: vehicles['data']['items'],
            filterFn: function (item) {
                if (!$.trim($("#search_input_vehicle").val()).toLowerCase()) return true;
                // 검색 필드 선택
                var hay = (item.deviceSn + " " + item.plateNum).toLowerCase();
                return hay.indexOf($.trim($("#search_input_vehicle").val()).toLowerCase()) !== -1;
            },
            rowRenderer: function (item) {
                const deviceSn = item.deviceSn
                const vehicleKey = item.vehicleKey
                if (deviceSn)
                    beingUsedCount++

                return (
                    `
                <tr class="vehicle-list-item "  >
                    <td>
                        <label><input data-item3="${vehicleKey}" type="checkbox" class="checkbox">
                            <div><em></em></div>
                        </label>
                    </td>
                    <td>${item.plateNum}</td>
                    <td>
                       ${item.device?.deviceSeries || ""} ${item.deviceSn || "-"}
                    </td>
                    <td>${item.pcl}</td>
                    <td>${deviceSn ? "사용중" : "사용종료"}</td>
                    <td class="attach-detach" data-item="${deviceSn}" data-item2="${vehicleKey}"><button class="btn">${deviceSn ? "차량·단말기 해제" : "차량·단말기 연동"}</button></td>
                </tr>
              `
                );
            },

            emptyHtml: `
                <tr class="vehicle-list-item" >
                    <td colspan="6" class="text-center">데이터가 없습니다</td>
                </tr>
              `
        });
        $("#vehiclePageSizeSelect").val(String(pagerVehicleList.pageSize));

        pagerVehicleList.go(1);

        $(".attach-detach").on("click", function () {

            const deviceSn = $(this).data("item");
            const vehicleKey = $(this).data("item2");
            var attachDettach;
            console.log("dvcSn", deviceSn, "vk:", vehicleKey)
            if (deviceSn)
                attachDettach = deviceDettach(token, vehicleKey)
            else
                attachDettach = deviceAttach(token, vehicleKey, deviceSn)//deviceSn==null??
            if (attachDettach['result']) {
                renderDeviceList()
                renderVehicleList()
            } else {
                alert("액션 실패했습니다")
            }


        });
        $("#vehicleList").on("change", ".vehicle-list-item .checkbox", function () {
            const $row = $(this).closest(".vehicle-list-item");
            const vehicleKey = $(this).data("item3")

            const $this = $(this);

            if ($this.prop("checked")) {
                // uncheck all other checkboxes
                $(".vehicle-list-item .checkbox")
                    .not(this)
                    .prop("checked", false)
                    .closest(".vehicle-list-item")
                    .removeClass("selected");

                // mark only this row
                $this
                    .closest(".vehicle-list-item")
                    .addClass("selected");
                $("selectedKey").val(vehicleKey)
            } else {
                // if unchecked, remove highlight
                $this
                    .closest(".vehicle-list-item")
                    .removeClass("selected");
                $("selectedKey").val("")
            }
        });

        $("#vehiclePageSizeSelect").on("change", function () {

            pagerVehicleList.setPageSize($(this).val());

        });

        $("#vehicleDeviceMngContainer #beingUsedNum").text(beingUsedCount)
        $("#vehicleDeviceMngContainer #useEndNum").text(vehicles['data']['items'].length - beingUsedCount)
    });

}
function applySearchDevice() {
    pagerDevice.refresh();           // 현재 페이지에 필터를 다시 적용
    pagerDevice.go(1);               // 사용자 경험 개선: 새 검색 시 1페이지로 재설정
}
function applySearchVehicleMng() {
    pagerVehicleList.refresh();
    pagerVehicleList.go(1);
}


class GlobalConfig {


    constructor(apiHostOrigin, webhook_id) {

        this.api_host_origin = apiHostOrigin;
        this.webhook_id = webhook_id;
        this.updateApiHostOrigin(apiHostOrigin);
    }

    updateApiHostOrigin(newOrigin) {
        this.api_host_origin = newOrigin;
        this.api_host_url = this.api_host_origin + 'api/';
        this.api_base_url = this.api_host_url;
    }
}

class WebConfig extends GlobalConfig {
    constructor() {
        super('https://web.viewcar.co.kr/', 'ikubqugz1ibi9fh4mokfhx3ptc');
    }
}

class TestConfig extends GlobalConfig {
    constructor() {
        super('https://test.viewcar.co.kr/', '913k5jqczfgoxeffa6mg7dwi9a');
    }
}

class LocalConfig extends TestConfig {
    constructor() {
        super();
        this.updateApiHostOrigin('http://localhost/');
    }
}

class IntraConfig extends TestConfig {
    constructor() {
        super();
        this.updateApiHostOrigin('http://192.168.0.119/');
    }
}


let globalConfig;
const subDomain = location.host.split('.')[0];

const configSubdomainMap = {
    mt: function () {
        return new TestConfig()
    },
    m: function () {
        return new WebConfig()
    }
};

if (configSubdomainMap[subDomain]) {
    globalConfig = configSubdomainMap[subDomain]();
} else if (location.host.startsWith('localhost')) {
    globalConfig = new LocalConfig();
} else if (location.host.startsWith('192.168.0.119')) {
    globalConfig = new IntraConfig();
} else {
    throw new Error('Unknown environment: ' + location.origin);
}

const {
    api_host_origin,
    api_host_url,
    api_base_url,
    webhook_id
} = globalConfig;



// 로딩화면 컴포넌트
let loadingAjax = 0

class NowLoadingComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
<div class="now-loading on">
    <img src="/img/common/loading.webp" alt="loading">
</div>        
  `;
    }
}

customElements.define('now-loading', NowLoadingComponent);

addEventListener('DOMContentLoaded', () => {
    $('.no-data').addClass('d-none')
})

addEventListener('load', async () => {

    loadingOn(1)

    // 5초 후에 강제 로딩 해제
    const isLongLoad = (!!$('.feed-wrap').length && (location.pathname === '/' || location.pathname === '/index.html')) || (!!$('.jour-swiper').length && location.pathname === '/side_menu.html') || (!!$('.jour-swiper').length && location.pathname === '/trip.html')

    await delay(isLongLoad ? 30000 : 5000)
    loadingAjax = 0
    $('.now-loading').removeClass('on')
});


// 로딩 시작 함수
function loadingOn(noAjax = 0) {
    if (!noAjax) ++loadingAjax

    const $nowLoading = $('.now-loading')
    $nowLoading.addClass('on')

    const $noData = $('.no-data')
    $noData.addClass('d-none')

    const sid = setInterval(() => {
        if (!loadingAjax) {
            clearInterval(sid)
            $nowLoading.removeClass('on')
            $noData.removeClass('d-none')
        }
    }, 500)
}

// 로딩 해제 함수
function loadingOff() {
    const $nowLoading = $('.now-loading')
    const $noData = $('.no-data')
    --loadingAjax

    if (loadingAjax < 1) {
        $nowLoading.removeClass('on')
        $noData.removeClass('d-none')
    }
}


function base64ToJsonObj(b64) {
    try {
        b64 = b64.replace(/\s/g, '');

        const binary = atob(b64);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const json = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(json);
    } catch (e) {
        console.error('DECODE FAILED', b64, e);
        return null;
    }
}
function jsonToBase64(obj) {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}



function list_date(timestamp) {
    var date = new Date(timestamp);
    return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
}
function get_timestamp(dateStr) {
    const date = new Date(dateStr);
    return date.getTime();
}

const delay = ms => new Promise(res => setTimeout(res, ms));
//회원 토큰가져오기
function get_token(id, pw) {
    const result_data = {};

    let a_data = {
        'accountId': id,
        'accountPw': pw,

    }

    loadingOn()

    $.ajax({
        type: "POST",
        url: api_base_url + 'auth',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
        },
        data: JSON.stringify(a_data),
        dataType: "json",
        cache: false,
        async: false,
        success: function (data) {
            loadingOff()
            result_data['result'] = true;
            result_data['token'] = data["accessToken"];


        },
        error: function (request, status, error) {
            loadingOff()
            console.log("error" + "\n" + "code:" + request.status + "\n" + "message:" + request.responseText + "\n" + "error:" + error);
            result_data['result'] = false;
            result_data['status'] = request.status;
            result_data['message'] = request.responseText;
            result_data['error'] = error;
        }
    });

    return result_data;
}
//회원정보 조회하기
function get_me(key) {

    const result_data = {};

    loadingOn()

    $.ajax({
        type: "GET",
        url: api_base_url + 'me',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + key);
        },
        dataType: "json",
        async: false,
        success: function (data) {
            loadingOff()
            result_data['result'] = true;
            result_data['me'] = data['result'];
        },
        error: function (request, status, error) {
            console.log("error" + "\n" + "code:" + request.status + "\n" + "message:" + request.responseText + "\n" + "error:" + error);
            result_data['result'] = false;
            result_data['status'] = request.status;
            result_data['message'] = request.responseText;
            result_data['error'] = error;
        }
    });

    return result_data;
}

function get_vehicle_data(key) {

    const result_data = {};
    let a_data = {
        'limit': 1000,
        'offset': 0
    }

    loadingOn()

    $.ajax({
        type: "GET",
        url: api_base_url + 'vehicle',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + key);
        },
        data: a_data,
        dataType: "json",
        async: false,
        success: function (data) {
            loadingOff()
            result_data['result'] = true;
            result_data['data'] = data;
        },
        error: function (request, status, error) {
            const result_data_err = result_data || {};
            errorHandler(request, status, error, result_data_err);
        }
    });

    return result_data;
}

function get_trip_history_data(key, startTs = null, endTs = null) {

    const result_data = {};
    let a_data = {
        'limit': 1000,
        'offset': 0,
        'startTs': startTs,
        'endTs': endTs
    }

    loadingOn()

    $.ajax({
        type: "GET",
        url: api_base_url + 'trips',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + key);
        },
        data: a_data,
        dataType: "json",
        async: false,
        success: function (data) {
            loadingOff()
            result_data['result'] = true;
            result_data['data'] = data;
        },
        error: function (request, status, error) {
            const result_data_err = result_data || {};
            errorHandler(request, status, error, result_data_err);
        }
    });

    return result_data;
}

function get_current_journey_data(vehicleKey, token) {

    const result_data = {};

    loadingOn()

    $.ajax({
        type: "GET",
        url: api_base_url + 'vehicle/' + vehicleKey + '/currentJourney',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + token);
        },
        dataType: "json",
        async: false,
        success: function (data) {
            loadingOff()
            result_data['result'] = true;
            result_data['data'] = data;
        },
        error: function (request, status, error) {
            const result_data_err = result_data || {};
            errorHandler(request, status, error, result_data_err);
        }
    });

    return result_data;
}
function get_past_journey_data(vehicleKey, tripKey, token) {

    const result_data = {};

    loadingOn()

    $.ajax({
        type: "GET",
        url: api_base_url + 'vehicle/' + vehicleKey + '/pastJourney/' + tripKey,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + token);
        },
        dataType: "json",
        async: false,
        success: function (data) {
            loadingOff()
            result_data['result'] = true;
            result_data['data'] = data;
        },
        error: function (request, status, error) {
            const result_data_err = result_data || {};
            errorHandler(request, status, error, result_data_err);
        }
    });

    return result_data;
}

function vinMismatchFix(vehicleKey,token) {

    const result_data = {};

    loadingOn()

    $.ajax({
        type: "POST",
        url: api_base_url + 'vehicle/' + vehicleKey + '/vinMismatch/clear',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + token);
        },
        dataType: "json",
        async: false,
        success: function () {
            loadingOff()
            result_data['result'] = true;
           
        },
        error: function (request, status, error) {
            console.log("error" + "\n" + "code:" + request.status + "\n" + "message:" + request.responseText + "\n" + "error:" + error);
            result_data['result'] = false;
            result_data['status'] = request.status;
            result_data['message'] = request.responseText;
            result_data['error'] = error;
        }
    });

    return result_data;
}

function nameChange(token,userName) {

    const result_data = {};
       let a_data = {
        'accountName': userName

    }

    loadingOn()

    $.ajax({
        type: "PATCH",
        url: api_base_url + ' account/name',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + token);
        },
        data:JSON.stringify(a_data),
        dataType: "json",
        async: false,
        success: function () {
            loadingOff()
            result_data['result'] = true;
           
        },
        error: function (request, status, error) {
            console.log("error" + "\n" + "code:" + request.status + "\n" + "message:" + request.responseText + "\n" + "error:" + error);
            result_data['result'] = false;
            result_data['status'] = request.status;
            result_data['message'] = request.responseText;
            result_data['error'] = error;
        }
    });

    return result_data;
}

function idChange(token,id) {

    const result_data = {};
           let a_data = {
        'accountId': id

    }

    loadingOn()

    $.ajax({
        type: "PATCH",
        url: api_base_url + ' account/id',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + token);
        },
         data:JSON.stringify(a_data),
        dataType: "json",
        async: false,
        success: function () {
            loadingOff()
            result_data['result'] = true;
           
        },
        error: function (request, status, error) {
            console.log("error" + "\n" + "code:" + request.status + "\n" + "message:" + request.responseText + "\n" + "error:" + error);
            result_data['result'] = false;
            result_data['status'] = request.status;
            result_data['message'] = request.responseText;
            result_data['error'] = error;
        }
    });

    return result_data;
}

function pwChange(token,oldPw,newPw) {

    const result_data = {};
           let a_data = {
        'accountOld': oldPw,
        'accountNewPw':newPw

    };

    loadingOn()

    $.ajax({
        type: "PATCH",
        url: api_base_url + ' account/password',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + token);
        },
         data:JSON.stringify(a_data),
        dataType: "json",
        async: false,
        success: function () {
            loadingOff()
            result_data['result'] = true;
           
        },
        error: function (request, status, error) {
            console.log("error" + "\n" + "code:" + request.status + "\n" + "message:" + request.responseText + "\n" + "error:" + error);
            result_data['result'] = false;
            result_data['status'] = request.status;
            result_data['message'] = request.responseText;
            result_data['error'] = error;
        }
    });

    return result_data;
}
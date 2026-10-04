function handler(event) {
    var request = event.request;
    var host = request.headers.host.value.toLowerCase();
    if (host !== 'cricastudio.com' && host !== 'www.cricastudio.com' && host !== 'cricastudio.com.br') return request;
    var query = [];
    for (var key in request.querystring) {
        var item = request.querystring[key];
        var values = item.multiValue || [item];
        for (var i = 0; i < values.length; i++) query.push(key + '=' + values[i].value);
    }
    return {statusCode: 301, statusDescription: 'Moved Permanently', headers: {
        location: {value: 'https://www.cricastudio.com.br' + request.uri + (query.length ? '?' + query.join('&') : '')},
        'cache-control': {value: 'public, max-age=300'}
    }};
}

function handler(event) {
    var request = event.request;
    var host = request.headers.host.value.toLowerCase();
    var country = request.headers['cloudfront-viewer-country'];
    var international = host === 'cricastudio.com' || host === 'www.cricastudio.com';
    var brazilian = host === 'cricastudio.com.br' || host === 'www.cricastudio.com.br';
    if (!international && !brazilian) return request;

    var targetHost = host;
    var path = request.uri;
    var temporary = international;
    if (international && country && country.value === 'BR') {
        targetHost = 'www.cricastudio.com.br';
    } else if (international) {
        targetHost = 'www.cricastudio.com';
        if (path === '/' || path === '/index.html' || path === '/loja' || path.indexOf('/loja/') === 0) path = '/fornecedores';
    } else {
        targetHost = 'www.cricastudio.com.br';
    }
    if (targetHost === host && path === request.uri) return request;

    var query = [];
    for (var key in request.querystring) {
        var item = request.querystring[key];
        var values = item.multiValue || [item];
        for (var i = 0; i < values.length; i++) query.push(key + '=' + values[i].value);
    }
    return {
        statusCode: temporary ? 302 : 301,
        statusDescription: temporary ? 'Found' : 'Moved Permanently',
        headers: {
            location: {value: 'https://' + targetHost + path + (query.length ? '?' + query.join('&') : '')},
            'cache-control': {value: temporary ? 'private, no-store' : 'public, max-age=300'}
        }
    };
}

function handler(event) {
    var request = event.request;
    var host = request.headers.host.value.toLowerCase();
    var country = request.headers['cloudfront-viewer-country'];
    var international = host === 'cricastudio.com' || host === 'www.cricastudio.com';
    var brazilian = host === 'cricastudio.com.br' || host === 'www.cricastudio.com.br';
    if (!international && !brazilian) return request;

    // Country only; no IP address or other visitor data is exposed.
    if (request.uri === '/site-context.json') {
        return {
            statusCode: 200,
            headers: {
                'content-type': {value: 'application/json; charset=utf-8'},
                'cache-control': {value: 'private, no-store'}
            },
            body: JSON.stringify({country: country ? country.value : null})
        };
    }

    var targetHost = host;
    var path = request.uri;
    var temporary = international;
    var news = path === '/blog' || path.indexOf('/blog/') === 0;
    if (international && country && country.value === 'BR' && !news) {
        targetHost = 'www.cricastudio.com.br';
    } else if (international) {
        targetHost = 'www.cricastudio.com';
        if (path === '/' || path === '/index.html' || path === '/loja' || path.indexOf('/loja/') === 0) path = '/fornecedores';
    } else {
        targetHost = 'www.cricastudio.com.br';
    }
    if (targetHost === host && path === request.uri) {
        // The origin policy excludes Host. Pass the viewer's News language explicitly.
        if (path === '/blog' && !request.querystring.idioma) {
            var accepted = request.headers['accept-language'];
            var preferences = accepted ? accepted.value.split(',').map(function (item) {
                var parts = item.trim().split(';');
                return {code: parts[0].toLowerCase(), quality: parts.length > 1 ? Number(parts[1].trim().replace('q=', '')) : 1};
            }).filter(function (item) { return item.quality > 0; }).sort(function (a, b) { return b.quality - a.quality; }) : [];
            var preferred = preferences.length ? preferences[0].code : '';
            request.querystring.idioma = {value: brazilian ? 'pt' : preferred === 'es' || preferred.indexOf('es-') === 0 ? 'es' : 'en'};
        }
        // API-rendered HTML and genuine 404s must reach the blog origin unchanged.
        if (path === '/blog' || path.indexOf('/blog/') === 0 || path === '/blog-sitemap.xml' || path.indexOf('/api/') === 0) return request;
        // Replace the global S3 error fallback with explicit SPA route rewrites.
        if (path === '/' || path === '/loja' || path.indexOf('/loja/') === 0 || path === '/fornecedores' || path === '/vitrine' || path === '/login' || path === '/admin' || path.indexOf('/admin/') === 0) request.uri = '/index.html';
        return request;
    }

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

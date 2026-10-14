// Pure local transformation. Does not call AWS or deploy anything.
// node prepare-blog-config.mjs current-config.json proposed-config.json API_HOST CACHE_DISABLED_ID ALL_VIEWER_EXCEPT_HOST_ID FUNCTION_ARN
import { readFileSync, writeFileSync } from 'node:fs';
const [input, output, host, cachePolicyId, originRequestPolicyId, functionArn] =
    process.argv.slice(2);
if (!functionArn || !/^[a-z0-9.-]+$/i.test(host || ''))
    throw new Error(
        'Supply config paths, API hostname, managed policy IDs and the reviewed viewer-request function ARN.',
    );
const parsed = JSON.parse(readFileSync(input, 'utf8'));
const config = parsed.DistributionConfig || parsed;
const originId = 'crica-blog-api';
const origins = (config.Origins.Items || []).filter((o) => o.Id !== originId);
origins.push({
    Id: originId,
    DomainName: host,
    OriginPath: '',
    CustomHeaders: process.env.BLOG_ORIGIN_PROXY_KEY ? {Quantity:1,Items:[{HeaderName:'X-Crica-Proxy-Key',HeaderValue:process.env.BLOG_ORIGIN_PROXY_KEY}]} : { Quantity: 0 },
    CustomOriginConfig: {
        HTTPPort: 80,
        HTTPSPort: 443,
        OriginProtocolPolicy: 'https-only',
        OriginSslProtocols: { Quantity: 1, Items: ['TLSv1.2'] },
        OriginReadTimeout: 30,
        OriginKeepaliveTimeout: 5,
    },
    ConnectionAttempts: 3,
    ConnectionTimeout: 10,
});
config.Origins = { Quantity: origins.length, Items: origins };
const patterns = ['/blog', '/blog/*', '/blog-sitemap.xml', '/api/blog/*'];
const existing = (config.CacheBehaviors?.Items || []).filter(
    (b) => !patterns.includes(b.PathPattern),
);
const associations = {
    Quantity: 1,
    Items: [{ EventType: 'viewer-request', FunctionARN: functionArn }],
};
const blog = patterns.map((PathPattern) => ({
    PathPattern,
    TargetOriginId: originId,
    ViewerProtocolPolicy: 'redirect-to-https',
    AllowedMethods: {
        Quantity: PathPattern==='/api/blog/*'?7:2,
        Items: PathPattern==='/api/blog/*'?['HEAD','GET','OPTIONS','POST','PUT','PATCH','DELETE']:['HEAD', 'GET'],
        CachedMethods: { Quantity: 2, Items: ['HEAD', 'GET'] },
    },
    Compress: true,
    CachePolicyId: cachePolicyId,
    OriginRequestPolicyId: originRequestPolicyId,
    FunctionAssociations: associations,
    LambdaFunctionAssociations: { Quantity: 0 },
    TrustedSigners: { Enabled: false, Quantity: 0 },
    TrustedKeyGroups: { Enabled: false, Quantity: 0 },
    SmoothStreaming: false,
    FieldLevelEncryptionId: '',
}));
config.CacheBehaviors = { Quantity: blog.length + existing.length, Items: [...blog, ...existing] };
// Global SPA error rewrites would turn genuine blog 404s into indexable homepages.
const errors = (config.CustomErrorResponses?.Items || []).filter(
    (e) => ![403, 404].includes(e.ErrorCode),
);
config.CustomErrorResponses = {
    Quantity: errors.length,
    ...(errors.length ? { Items: errors } : {}),
};
config.DefaultCacheBehavior.FunctionAssociations = associations;
for (const behavior of existing) behavior.FunctionAssociations = associations;
writeFileSync(output, JSON.stringify(config, null, 2) + '\n');
console.log(
    'Prepared ' +
        output +
        ' locally. Publish the reviewed function and supply the matching ETag only after release approval.',
);

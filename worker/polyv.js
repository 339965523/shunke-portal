/**
 * 瞬刻门户 · 保利威签名服务（Cloudflare Worker）
 * 部署：Cloudflare 控制台 → Workers & Pages → Create → Worker → 粘贴本文件 → Deploy
 * 环境变量：POLYV_SECRET / POLYV_CHANNEL_ID / POLYV_DOMAIN / ALLOW_ORIGIN
 */

function md5(input) {
  function toBytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) { out.push(192 | (c >> 6), 128 | (c & 63)); }
      else { out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
    }
    return out;
  }
  var bytes = toBytes(input);
  var bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  var lo = bitLen >>> 0;
  for (var i = 0; i < 4; i++) bytes.push((lo >>> (i * 8)) & 0xff);
  var hi = Math.floor(bitLen / 4294967296);
  for (var j = 0; j < 4; j++) bytes.push((hi >>> (j * 8)) & 0xff);

  var a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  var S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
           5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
           4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
           6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  var K = [];
  for (var k = 0; k < 64; k++) K[k] = Math.floor(Math.abs(Math.sin(k + 1)) * 0x100000000);

  function add(x, y) { return (x + y) >>> 0; }
  function rol(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }

  for (var off = 0; off < bytes.length; off += 64) {
    var M = [];
    for (var m = 0; m < 16; m++) {
      M[m] = bytes[off + m * 4] + (bytes[off + m * 4 + 1] << 8) + (bytes[off + m * 4 + 2] << 16) + (bytes[off + m * 4 + 3] << 24);
    }
    var A = a, B = b, C = c, D = d;
    for (var r = 0; r < 64; r++) {
      var F, g;
      if (r < 16) { F = (B & C) | (~B & D); g = r; }
      else if (r < 32) { F = (D & B) | (~D & C); g = (5 * r + 1) % 16; }
      else if (r < 48) { F = B ^ C ^ D; g = (3 * r + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * r) % 16; }
      var tmp = D; D = C; C = B;
      B = add(B, rol(add(add(A, F), add(K[r], M[g])), S[r]));
      A = tmp;
    }
    a = add(a, A); b = add(b, B); c = add(c, C); d = add(d, D);
  }

  function hexLE(x) {
    var s = '';
    for (var q = 0; q < 4; q++) s += ('0' + ((x >>> (q * 8)) & 0xff).toString(16)).slice(-2);
    return s;
  }
  return hexLE(a) + hexLE(b) + hexLE(c) + hexLE(d);
}

function b64url(str) {
  var b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }
  });
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    var origin = env.ALLOW_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        }
      });
    }

    if (url.pathname === '/polyv' || url.pathname === '/') {
      var secret = env.POLYV_SECRET || '';
      var channelId = env.POLYV_CHANNEL_ID || '';
      if (!secret || !channelId) {
        return json({ error: '未配置 POLYV_SECRET / POLYV_CHANNEL_ID 环境变量' }, 500, origin);
      }

      var userid = (url.searchParams.get('userid') || 'guest').replace(/[^\w-]/g, '').slice(0, 64) || 'guest';
      var nickname = url.searchParams.get('nickname') || '访客';
      var vid = url.searchParams.get('vid') || '';
      var ts = Date.now();
      var sign = md5(secret + userid + secret + ts);
      var host = env.POLYV_DOMAIN || 'live.polyv.cn';

      var qs = 'userid=' + encodeURIComponent(userid) +
        '&ts=' + ts +
        '&sign=' + sign +
        '&nickname=' + encodeURIComponent(b64url(nickname)) +
        '&avatar=' + encodeURIComponent(env.POLYV_AVATAR || '');
      if (vid) qs += '&vid=' + encodeURIComponent(vid);

      return json({ url: 'https://' + host + '/watch/' + channelId + '?' + qs, ts: ts }, 200, origin);
    }

    return json({ ok: true, hint: '瞬刻门户签名服务运行中，请调用 /polyv?userid=&nickname=' }, 200, origin);
  }
};

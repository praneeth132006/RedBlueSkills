"""Isolated teaching fixtures, NOT production JWT, upload, or model loaders.

No network, subprocesses, model execution, or real credentials. Vulnerable modes
intentionally omit controls. Callers supply temporary directories and a clock.
"""
import base64
import hashlib
import hmac
import json
import math
import re
import uuid
from pathlib import Path


class Rejected(ValueError):
    pass


def _b64(data):
    return base64.urlsafe_b64encode(data).decode('ascii').rstrip('=')


def _unb64(text):
    if not isinstance(text, str) or not re.fullmatch(r'[A-Za-z0-9_-]*', text):
        raise Rejected('invalid base64url')
    return base64.b64decode(text + '=' * (-len(text) % 4), altchars=b'-_', validate=True)


def _object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Rejected('duplicate JSON member')
        result[key] = value
    return result


def _decode(segment):
    obj = json.loads(_unb64(segment).decode('utf-8'), object_pairs_hook=_object)
    if not isinstance(obj, dict):
        raise Rejected('expected an object')
    return obj


def token(claims, key, header=None):
    """Make a synthetic HS256 token; 'none' is only used to build negative cases."""
    header = header or {'alg': 'HS256', 'typ': 'at+jwt'}
    parts = [_b64(json.dumps(x, separators=(',', ':')).encode()) for x in (header, claims)]
    message = '.'.join(parts)
    signature = b'' if header.get('alg') == 'none' else hmac.digest(key, message.encode(), 'sha256')
    return message + '.' + _b64(signature)


def verify_token(encoded, key, now, hardened=True):
    """A deliberately narrow access-token profile, not a general JWT library."""
    try:
        if not isinstance(encoded, str) or len(encoded) > 8192:
            raise Rejected('token size')
        head, body, signature = encoded.split('.')
        claims = _decode(body)
        if not hardened:
            return claims  # vulnerable: decoding is mistaken for authentication
        header = _decode(head)
        if header != {'alg': 'HS256', 'typ': 'at+jwt'}:
            raise Rejected('unapproved algorithm, type, or header')
        expected = hmac.digest(key, (head + '.' + body).encode(), 'sha256')
        if not hmac.compare_digest(expected, _unb64(signature)):
            raise Rejected('signature mismatch')
        if claims.get('iss') != 'https://issuer.example.test' or claims.get('aud') != 'orders-api':
            raise Rejected('issuer or audience mismatch')
        if not isinstance(claims.get('sub'), str) or not claims['sub']:
            raise Rejected('subject missing')
        for claim in ('exp', 'nbf'):
            value = claims.get(claim)
            if type(value) not in (int, float) or not math.isfinite(value):
                raise Rejected('invalid time claim')
        if now >= claims['exp'] or now < claims['nbf']:
            raise Rejected('token not valid at this time')
        return claims
    except (ValueError, TypeError, UnicodeError) as exc:
        raise Rejected(str(exc)) from exc


def store_upload(root, filename, content_type, data, hardened=True):
    """Text-only fixture: fixed 1024-byte policy and no HTTP/rendering layer."""
    root = Path(root)
    if hardened:
        if not isinstance(filename, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,64}\.txt', filename):
            raise Rejected('invalid filename or extension')
        if content_type != 'text/plain' or not 0 < len(data) <= 1024:
            raise Rejected('invalid type or size')
        try:
            text = data.decode('utf-8')
        except UnicodeError as exc:
            raise Rejected('invalid UTF-8') from exc
        if any(ord(c) < 32 and c not in '\n\r\t' for c in text):
            raise Rejected('binary control characters')
        dest = root / (uuid.uuid4().hex + '.txt')
    else:
        # Keep the vulnerable example confined to root even for hostile names.
        # It demonstrates weak extension/type checks, not filesystem traversal.
        filename = filename.replace('\\', '/').split('/')[-1]
        if not filename or '\x00' in filename:
            raise Rejected('fixture boundary')
        dest = root / filename
    root.mkdir(parents=True, exist_ok=True)
    with dest.open('xb' if hardened else 'wb') as stream:
        stream.write(data)
    return dest


def load_artifact(blob, supplied, approved, hardened=True):
    """Verify JSON artifact bytes against a separately trusted local manifest.

This does not deserialize weights or execute custom code. 'approved' represents
an operator-controlled policy; supplied metadata cannot replace that policy.
"""
    if hardened:
        if len(blob) > 4096:
            raise Rejected('artifact too large')
        for key in ('source', 'revision', 'sha256', 'format'):
            if supplied.get(key) != approved.get(key):
                raise Rejected('manifest mismatch: ' + key)
        if not re.fullmatch(r'[0-9a-f]{40}', supplied.get('revision', '')):
            raise Rejected('revision is not pinned')
        if supplied.get('format') != 'fixture-json' or supplied.get('remote_code') is not False:
            raise Rejected('unsupported format or executable code')
        if not hmac.compare_digest(hashlib.sha256(blob).hexdigest(), approved['sha256']):
            raise Rejected('artifact digest mismatch')
    # JSON is used in both modes; no pickle or unsafe deserializer is invoked.
    value = json.loads(blob)
    if not isinstance(value, dict):
        raise Rejected('artifact must be an object')
    return value

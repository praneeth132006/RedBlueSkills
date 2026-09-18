"""Run with Python 3.10+: positive, negative, boundary and vulnerable controls."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from controls import Rejected, load_artifact, store_upload, token, verify_token


class JWTControls(unittest.TestCase):
    def setUp(self):
        # Public fixture key, never a production secret.
        self.key = b'local-fixture-only-not-a-production-key'
        self.now = 1000
        self.claims = dict(iss='https://issuer.example.test', aud='orders-api',
                           sub='fixture-user', nbf=900, exp=1100)

    def test_valid_signed_token(self):
        self.assertEqual(verify_token(token(self.claims, self.key), self.key, self.now), self.claims)

    def test_unsigned_is_accepted_only_by_vulnerable_decoder(self):
        encoded = token(self.claims, self.key, {'alg': 'none', 'typ': 'at+jwt'})
        self.assertEqual(verify_token(encoded, self.key, self.now, False), self.claims)
        with self.assertRaises(Rejected):
            verify_token(encoded, self.key, self.now)

    def test_wrong_signer(self):
        with self.assertRaises(Rejected):
            verify_token(token(self.claims, b'wrong-fixture-key'), self.key, self.now)

    def test_claim_binding(self):
        for field, value in [('iss', 'https://other.example.test'), ('aud', 'other-api'),
                             ('exp', 1000), ('nbf', 1001), ('sub', ''),
                             ('exp', '1100'), ('exp', True), ('exp', float('nan'))]:
            with self.subTest(field=field, value=value), self.assertRaises(Rejected):
                verify_token(token({**self.claims, field: value}, self.key), self.key, self.now)

    def test_missing_required_claims(self):
        for field in self.claims:
            claims = dict(self.claims)
            del claims[field]
            with self.subTest(field=field), self.assertRaises(Rejected):
                verify_token(token(claims, self.key), self.key, self.now)

    def test_header_profile(self):
        for header in [{'alg': 'HS512', 'typ': 'at+jwt'}, {'alg': 'HS256', 'typ': 'JWT'},
                       {'alg': 'HS256', 'typ': 'at+jwt', 'jku': 'https://example.test/key'}]:
            with self.subTest(header=header), self.assertRaises(Rejected):
                verify_token(token(self.claims, self.key, header), self.key, self.now)

    def test_time_boundaries_and_malformed_input(self):
        good = token(self.claims, self.key)
        self.assertEqual(verify_token(good, self.key, 900), self.claims)
        for encoded in ['', 'a.b', 'a.b.c.d', 'a.W10.c', None, 'x' * 8193]:
            with self.subTest(encoded=str(encoded)[:20]), self.assertRaises(Rejected):
                verify_token(encoded, self.key, self.now)


class UploadControls(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_valid_text_and_randomized_storage(self):
        first = store_upload(self.root, 'notes.txt', 'text/plain', b'hello\n')
        second = store_upload(self.root, 'notes.txt', 'text/plain', b'second')
        self.assertNotEqual(first.name, 'notes.txt')
        self.assertNotEqual(first, second)
        self.assertEqual(first.read_bytes(), b'hello\n')
        self.assertEqual(first.parent, self.root)

    def test_disallowed_file_accepted_only_by_vulnerable_mode(self):
        # Inert text bytes, no executable payload.
        dest = store_upload(self.root, 'canary.txt.php', 'text/plain', b'CANARY', False)
        self.assertEqual(dest.read_bytes(), b'CANARY')
        with self.assertRaises(Rejected):
            store_upload(self.root, 'canary.txt.php', 'text/plain', b'CANARY')

    def test_names_and_content_are_rejected_before_writing(self):
        for name, mime, data in [('../escape.txt', 'text/plain', b'ok'),
                                ('..\\escape.txt', 'text/plain', b'ok'),
                                ('x.txt\x00.php', 'text/plain', b'ok'),
                                ('x.txt', 'image/png', b'ok'),
                                ('x.txt', 'text/plain', b'\xff'),
                                ('x.txt', 'text/plain', b'\x00')]:
            with self.subTest(name=name), self.assertRaises(Rejected):
                store_upload(self.root, name, mime, data)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_size_boundaries(self):
        self.assertEqual(store_upload(self.root, 'x.txt', 'text/plain', b'a' * 1024).stat().st_size, 1024)
        for data in [b'', b'a' * 1025]:
            with self.assertRaises(Rejected):
                store_upload(self.root, 'x.txt', 'text/plain', data)


class ArtifactControls(unittest.TestCase):
    def setUp(self):
        self.blob = b'{"model":"fixture","answer":"approved"}'
        self.approved = dict(source='approved/fixture', revision='a' * 40,
                             sha256=hashlib.sha256(self.blob).hexdigest(), format='fixture-json')
        self.supplied = dict(self.approved, remote_code=False)

    def test_approved_artifact(self):
        self.assertEqual(load_artifact(self.blob, self.supplied, self.approved)['answer'], 'approved')

    def test_tampering_accepted_only_in_vulnerable_mode(self):
        altered = self.blob.replace(b'approved', b'changed')
        self.assertEqual(load_artifact(altered, self.supplied, self.approved, False)['answer'], 'changed')
        with self.assertRaises(Rejected):
            load_artifact(altered, self.supplied, self.approved)

    def test_attacker_checksum_cannot_replace_trusted_checksum(self):
        altered = b'{"answer":"changed"}'
        supplied = dict(self.supplied, sha256=hashlib.sha256(altered).hexdigest())
        with self.assertRaises(Rejected):
            load_artifact(altered, supplied, self.approved)

    def test_unapproved_origin_revision_format_and_code(self):
        for field, value in [('source', 'unknown/model'), ('revision', 'main'),
                             ('format', 'pickle'), ('remote_code', True)]:
            with self.subTest(field=field), self.assertRaises(Rejected):
                load_artifact(self.blob, dict(self.supplied, **{field: value}), self.approved)

    def test_missing_manifest_fields_and_oversized_artifact(self):
        for field in self.supplied:
            supplied = dict(self.supplied)
            del supplied[field]
            with self.subTest(field=field), self.assertRaises(Rejected):
                load_artifact(self.blob, supplied, self.approved)
        with self.assertRaises(Rejected):
            load_artifact(b' ' * 4097, self.supplied, self.approved)


if __name__ == '__main__':
    unittest.main(verbosity=2)

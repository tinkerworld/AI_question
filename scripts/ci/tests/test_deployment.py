import importlib.util
import io
import json
import pathlib
import tarfile
import tempfile
import unittest
from unittest.mock import patch, Mock

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'github-deploy.py'
spec = importlib.util.spec_from_file_location('deploy', SCRIPT)
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
SHA = 'a' * 40


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.live = self.root / 'AI_question'
        self.live.mkdir()
        self.releases = self.root / 'releases'
        self.state = self.root / 'state'
        self.state.mkdir()
        (self.live / 'Exam').mkdir()
        env = self.live / 'Exam/.env'
        env.write_text('JWT_SECRET=test-only\nJWT_REFRESH_SECRET=test-only-other\n')
        env.chmod(0o600)
        (self.live / '.ports.env').write_text('API_PORT=4201\nWEB_PORT=3002\nTRACKER_PORT=3050\n')
        (self.live / 'postgres-data').mkdir()
        (self.live / 'postgres-data/fixture').write_text('persistent data')
        (self.live / 'stop_all.sh').write_text('original stop script')
        self.config = {'enabled': True, 'startup_schema_reviewed': True,
                       'release': str(self.live), 'releases': str(self.releases),
                       'api_port': 4201, 'web_port': 3002, 'tracker_port': 3050,
                       'public_url': 'https://example.invalid', 'keep_releases': 2,
                       'shared_paths': ['Exam/.env', 'postgres-data']}
        config_path = self.root / 'config.json'
        config_path.write_text(json.dumps(self.config))
        self.artifact = self.root / 'release.tar.gz'
        with tarfile.open(self.artifact, 'w:gz') as f:
            for name, text in {'.cicd-release.json': json.dumps({'commit': SHA, 'node': '24.16.0'}),
                               'Exam/apps/api/dist/server.js': 'compiled',
                               'Exam/apps/web/dist/index.html': '<html>compiled</html>'}.items():
                b = text.encode(); member = tarfile.TarInfo(name); member.size = len(b)
                f.addfile(member, io.BytesIO(b))
        self.patches = [patch.object(d, 'HOME', self.state), patch.object(d, 'CONFIG', config_path),
                        patch.object(d, 'command'), patch.object(d, 'service'), patch.object(d, 'health'),
                        patch.object(d.subprocess, 'check_output', return_value='v24.16.0\n'),
                        patch.object(d.subprocess, 'run', return_value=Mock(returncode=1, stdout='')),
                        patch.object(d.shutil, 'which', return_value='/usr/bin/mock'),
                        patch.object(d.shutil, 'disk_usage', return_value=Mock(free=100 * 1024**3))]
        self.mocks = [p.start() for p in self.patches]
        for p in self.patches: self.addCleanup(p.stop)

    def test_success_preserves_data_and_old_release(self):
        d.deploy(self.artifact, SHA)
        self.assertTrue(self.live.is_symlink())
        self.assertEqual((self.live / 'postgres-data/fixture').read_text(), 'persistent data')
        record = json.loads((self.state / 'last-deployment.json').read_text())
        self.assertEqual(record['commit'], SHA)
        self.assertTrue((pathlib.Path(record['previous']) / 'stop_all.sh').exists())
        self.assertTrue((pathlib.Path(record['database_backup']) / 'postgres-data/fixture').exists())
        self.assertEqual((self.live / 'Exam/.env').stat().st_mode & 0o777, 0o600)

    def test_failed_health_restores_old_release_and_remains_failed(self):
        self.mocks[4].side_effect = [RuntimeError('unhealthy'), None]
        with self.assertRaisesRegex(RuntimeError, 'unhealthy'):
            d.deploy(self.artifact, SHA)
        self.assertTrue((self.live / '.cicd-legacy-scripts/stop_all.sh').read_text().startswith('original'))
        self.assertIn('systemctl', (self.live / 'stop_all.sh').read_text())
        self.assertEqual((self.live / 'postgres-data/fixture').read_text(), 'persistent data')
        self.assertFalse((self.state / 'last-deployment.json').exists())
        self.assertEqual(self.mocks[4].call_count, 2)

    def test_wrong_artifact_commit_does_not_stop_application(self):
        with self.assertRaisesRegex(RuntimeError, 'identity'):
            d.deploy(self.artifact, 'b' * 40)
        self.mocks[2].assert_not_called()
        self.mocks[3].assert_not_called()
        self.assertFalse(self.live.is_symlink())

    def test_disabled_configuration_stops_before_changes(self):
        self.config['enabled'] = False
        d.CONFIG.write_text(json.dumps(self.config))
        with self.assertRaisesRegex(RuntimeError, 'not enabled'):
            d.deploy(self.artifact, SHA)
        self.assertFalse(self.releases.exists())

    def test_manual_rollback_checks_restored_release(self):
        d.deploy(self.artifact, SHA)
        d.rollback()
        self.assertTrue((self.live / '.cicd-legacy-scripts/stop_all.sh').read_text().startswith('original'))
        self.assertIn('systemctl', (self.live / 'stop_all.sh').read_text())
        self.assertEqual(json.loads((self.state / 'last-deployment.json').read_text())['action'], 'rollback')

    def test_archive_traversal_is_rejected(self):
        with tarfile.open(self.artifact, 'w:gz') as f:
            member = tarfile.TarInfo('../escaped'); member.size = 1
            f.addfile(member, io.BytesIO(b'x'))
        with self.assertRaises(tarfile.FilterError):
            d.unpack(self.artifact, self.root / 'unpack', SHA)
        self.assertFalse((self.root / 'escaped').exists())

    def test_archive_symlink_is_rejected(self):
        with tarfile.open(self.artifact, 'w:gz') as f:
            member = tarfile.TarInfo('link'); member.type = tarfile.SYMTYPE; member.linkname = '/etc'
            f.addfile(member)
        with self.assertRaisesRegex(RuntimeError, 'links'):
            d.unpack(self.artifact, self.root / 'unpack', SHA)

    def test_retention_does_not_delete_shared_data_or_backups(self):
        self.releases.mkdir()
        legacy = self.releases / 'legacy-fixture'
        legacy.mkdir()
        (legacy / 'postgres-data').mkdir()
        (legacy / 'postgres-data/fixture').write_text('keep data')
        old_dirs = []
        for number in range(4):
            release = self.releases / f'aaaaaaaaaaaa-20260101T00000{number}-aaaaaaaa'
            release.mkdir()
            (release / '.cicd-healthy').touch()
            (release / 'postgres-data').symlink_to(legacy / 'postgres-data')
            old_dirs.append(release)
        backup = self.releases / 'database-backup-fixture'
        backup.mkdir()
        d.retain(self.config, old_dirs[-1], old_dirs[-2])
        self.assertFalse(old_dirs[0].exists())
        self.assertTrue(old_dirs[-1].exists())
        self.assertEqual((legacy / 'postgres-data/fixture').read_text(), 'keep data')
        self.assertTrue(backup.exists())

    def test_low_disk_does_not_stop_application(self):
        self.mocks[-1].return_value = Mock(free=1)
        with self.assertRaisesRegex(RuntimeError, 'disk space'):
            d.deploy(self.artifact, SHA)
        self.mocks[3].assert_not_called()


if __name__ == '__main__':
    unittest.main()

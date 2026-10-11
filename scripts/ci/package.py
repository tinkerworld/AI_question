#!/usr/bin/env python3
"""Package committed source and compiled outputs, never ignored local data."""
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile


def package(output):
    root = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip())
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    if sha != os.environ['EXPECTED_SHA']:
        raise RuntimeError('Checked-out commit does not match workflow commit')
    if subprocess.run(['git', 'diff', '--quiet', 'HEAD'], cwd=root).returncode:
        raise RuntimeError('Build/tests changed tracked source; refusing inconsistent artifact')
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        stage = Path(temp)
        archive = subprocess.check_output(['git', 'archive', sha], cwd=root)
        with tarfile.open(fileobj=io.BytesIO(archive)) as source:
            source.extractall(stage, filter='data')
        for category in ['apps', 'packages']:
            for build in (root / 'Exam' / category).glob('*/dist'):
                shutil.copytree(build, stage / build.relative_to(root), dirs_exist_ok=True)
        for expected in ['Exam/apps/api/dist/server.js', 'Exam/apps/web/dist/index.html']:
            if not (stage / expected).is_file():
                raise RuntimeError('Missing build output: ' + expected)
        (stage / '.cicd-release.json').write_text(json.dumps({'commit': sha, 'node': '24.16.0'}) + '\n')
        (stage / 'Exam/apps/web/dist/__release.json').write_text(json.dumps({'commit': sha}) + '\n')
        with tarfile.open(output / 'release.tar.gz', 'w:gz') as artifact:
            for item in sorted(stage.iterdir()):
                artifact.add(item, arcname=item.name)


if __name__ == '__main__':
    package(Path(sys.argv[1]))

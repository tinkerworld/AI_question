#!/usr/bin/env python3
"""Reject tracked dotenv files; examples with placeholders are allowed."""
import subprocess
from pathlib import PurePosixPath

files = subprocess.check_output(['git', 'ls-files', '-z'], text=True).split('\0')
bad = [f for f in files if (PurePosixPath(f).name == '.env' or
       PurePosixPath(f).name.startswith('.env.')) and
       not PurePosixPath(f).name.endswith(('.example', '.sample', '.template'))]
if bad:
    raise SystemExit('Environment files must not be tracked: ' + ', '.join(bad))
print('PASS: no tracked production dotenv files')

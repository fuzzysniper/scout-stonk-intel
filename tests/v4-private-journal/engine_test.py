"""Execute actual local PostgreSQL/TLS + crypto/auth tests in existing root discovery."""
import pathlib
import subprocess
import unittest


class PrivateJournalRegression(unittest.TestCase):
    def test_isolated_local_encrypted_append_only_repository(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(["bash", "tests/v4-private-journal/run.sh"], cwd=root,
                                capture_output=True, text=True, timeout=180, check=False)
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-16000:])

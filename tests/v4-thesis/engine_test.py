"""Actual native LOCAL PostgreSQL/TLS API tests, discovered by unchanged root runner."""
import pathlib
import subprocess
import unittest


class ThesisApiRegression(unittest.TestCase):
    def test_authenticated_local_save_revision_read(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(["bash", "tests/v4-thesis/run.sh"], cwd=root,
                                capture_output=True, text=True, timeout=180, check=False)
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-16000:])

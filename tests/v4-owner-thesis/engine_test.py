"""Actual A signed-cookie → J verified principal → native encrypted local SQL."""
import pathlib
import subprocess
import unittest


class OwnerThesisBridgeRegression(unittest.TestCase):
    def test_unselected_genuine_owner_journal_bridge(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(["bash", "tests/v4-owner-thesis/run.sh"], cwd=root,
                                capture_output=True, text=True, timeout=180, check=False)
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-16000:])

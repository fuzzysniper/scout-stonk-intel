"""Actual native local PG/TLS + signed-cookie boundary, no provider or hosted SQL."""
import pathlib
import subprocess
import unittest


class OwnerLedgerRegression(unittest.TestCase):
    def test_actual_owner_and_atomic_native_boundary(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(["bash", "tests/v4-owner-ledger/run.sh"], cwd=root,
                                capture_output=True, text=True, timeout=180, check=False)
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-20000:])

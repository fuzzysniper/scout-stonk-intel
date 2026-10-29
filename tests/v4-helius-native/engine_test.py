"""Actual local TLS/native PG fixtures only; no provider or hosted SQL."""
import pathlib
import subprocess
import unittest


class NativeHeliusRegression(unittest.TestCase):
    def test_off_native_producer(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(["bash", "tests/v4-helius-native/run.sh"], cwd=root,
                                capture_output=True, text=True, timeout=180, check=False)
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-20000:])

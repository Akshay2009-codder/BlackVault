"""
Thin wrapper around sandbox.py that scoring.py imports.
Provides run_player_code() and CodeRunError.
"""

from .sandbox import run_player_code, CodeRunError

__all__ = ["run_player_code", "CodeRunError"]

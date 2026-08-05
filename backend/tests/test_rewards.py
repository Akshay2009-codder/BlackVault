"""
Tests for rewards and achievements logic.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.rewards import calculate_xp, xp_to_rank


def test_xp_calculation():
    xp_passed = calculate_xp(level="1", difficulty="easy", passed=True, attempt_number=1)
    assert xp_passed == 150  # 100 base * 1.0 * 1.5 first attempt bonus

    xp_failed = calculate_xp(level="1", difficulty="easy", passed=False)
    assert xp_failed == 10


def test_rank_thresholds():
    assert xp_to_rank(0) == "Recruit"
    assert xp_to_rank(150) == "Trainee"
    assert xp_to_rank(5000) == "Legendary Hacker"

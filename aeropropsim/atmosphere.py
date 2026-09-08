"""
ISA atmosphere and freestream stagnation state.

Ref: §1 (Atmosphere & Flight State).
"""

from .constants import GAMMA_C


def isa_troposphere(z: float) -> tuple:
    """Standard-day ISA troposphere (0-11 km), quadratic curve-fit form.

    Ref: §1, p.114-118, 137.

    Args:
        z: geopotential altitude, m (0 <= z <= 11000).

    Returns:
        (T_a, p_a): ambient static temperature [K], ambient static
        pressure [Pa].

    Raises:
        ValueError: if z is outside [0, 11000] m. The source gives an
        exact hydrostatic form for the stratosphere (above 11 km), but
        does not supply the specific reference constants (p, T at the
        11 km boundary) needed to anchor it numerically within the
        extracted transcript — rather than substitute an unsourced
        "standard atmosphere" constant silently, this is left as an
        explicit Phase 2 extension. v1's flight envelope (subsonic
        cruise and below) sits well inside the troposphere anyway.
    """
    if not (0.0 <= z <= 11000.0):
        raise ValueError(
            f"isa_troposphere: z={z} m is outside the source's valid "
            f"0-11000 m troposphere range. Stratosphere support "
            f"(z > 11000 m) is a Phase 2 extension — see module docstring."
        )
    T_a = 288.0 - 0.0065 * z
    p_a = (1.01325 - 1.12e-4 * z + 3.8e-9 * z ** 2) * 1.0e5  # bar -> Pa
    return T_a, p_a


def freestream_stagnation(T_a: float, p_a: float, M: float,
                           gamma_c: float = GAMMA_C) -> tuple:
    """Freestream-to-intake stagnation state at flight Mach M.

    Ref: §1, p.288. Assumption: isentropic freestream deceleration ahead
    of the intake lip.

    Args:
        T_a: ambient static temperature, K.
        p_a: ambient static pressure, Pa.
        M: flight Mach number.
        gamma_c: cold-section ratio of specific heats.

    Returns:
        (T0a, p0a): freestream stagnation temperature [K], pressure [Pa].
    """
    factor_T = 1.0 + (gamma_c - 1.0) / 2.0 * M ** 2
    T0a = T_a * factor_T
    p0a = p_a * factor_T ** (gamma_c / (gamma_c - 1.0))
    return T0a, p0a

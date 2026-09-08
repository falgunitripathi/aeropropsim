"""
Compressible-flow fundamentals and the station-state recipe.

Ref: §2 (Compressible-Flow Fundamentals), §2.1 (Computing a complete
station state).

This module has two layers:
  1. Bare isentropic-relation functions (speed of sound, Mach number,
     stagnation/static ratios, critical pressure ratio, area-Mach
     relation) — these are used both directly and as building blocks by
     every other component module.
  2. `Station`, a small dataclass that applies the §2.1 "station-state
     recipe" once T0, p0 and a through-flow velocity are known, producing
     the full T, p, M, rho, h, h0 row that every Stage/Station Analysis
     table needs.
"""

from dataclasses import dataclass, field
from typing import Optional
import math


# ---------------------------------------------------------------------------
# Bare isentropic relations — Ref: §2
# ---------------------------------------------------------------------------

def speed_of_sound(gamma: float, R: float, T: float) -> float:
    """a = sqrt(gamma*R*T).  Ref: §2, p.69-72."""
    return math.sqrt(gamma * R * T)


def mach_number(V: float, a: float) -> float:
    """M = V/a.  Ref: §2, p.69-72."""
    return V / a


def T0_over_T(gamma: float, M: float) -> float:
    """T0/T = 1 + (gamma-1)/2 * M^2.  Ref: §2, p.76-83. (adiabatic only)"""
    return 1.0 + (gamma - 1.0) / 2.0 * M ** 2


def p0_over_p(gamma: float, M: float) -> float:
    """p0/p = (T0/T)^(gamma/(gamma-1)).  Ref: §2, p.76-83. (isentropic)"""
    return T0_over_T(gamma, M) ** (gamma / (gamma - 1.0))


def rho0_over_rho(gamma: float, M: float) -> float:
    """rho0/rho = (T0/T)^(1/(gamma-1)).  Ref: §2, p.76-83. (isentropic)"""
    return T0_over_T(gamma, M) ** (1.0 / (gamma - 1.0))


def critical_pressure_ratio(gamma: float) -> float:
    """p*/p0 = (2/(gamma+1))^(gamma/(gamma-1)).  Ref: §2, p.83.

    Evaluates to 0.5283 for gamma=1.4 (matches the source's stated check
    value).
    """
    return (2.0 / (gamma + 1.0)) ** (gamma / (gamma - 1.0))


def area_mach_ratio(gamma: float, M: float) -> float:
    """A/A* isentropic area-Mach relation.  Ref: §2, p.404.

    Valid for M > 0 (undefined/singular at M=0, where A/A* -> infinity).
    """
    if M <= 0:
        raise ValueError("area_mach_ratio requires M > 0")
    return (1.0 / M) * (
        (2.0 + (gamma - 1.0) * M ** 2) / (gamma + 1.0)
    ) ** ((gamma + 1.0) / (2.0 * (gamma - 1.0)))


def static_temperature_from_stagnation(T0: float, V: float, cp: float) -> float:
    """T = T0 - V^2/(2*Cp).  Ref: §2.1 step 2."""
    return T0 - V ** 2 / (2.0 * cp)


def static_pressure_from_stagnation(p0: float, gamma: float, M: float) -> float:
    """p = p0 / (1+((gamma-1)/2)M^2)^(gamma/(gamma-1)).  Ref: §2.1 step 4.

    Valid pointwise even downstream of a lossy component: decelerating the
    local flow back to rest *at that single point* is itself reversible;
    the losses already live inside the actual p0 computed upstream.
    """
    return p0 / (1.0 + (gamma - 1.0) / 2.0 * M ** 2) ** (gamma / (gamma - 1.0))


def entropy_relative(cp: float, R: float, T: float, p: float,
                      T_ref: float, p_ref: float) -> float:
    """Delta_s = Cp*ln(T/T_ref) - R*ln(p/p_ref), relative to a reference
    station (e.g. ambient).  Ref: §2.1 step 7.
    """
    return cp * math.log(T / T_ref) - R * math.log(p / p_ref)


# ---------------------------------------------------------------------------
# Station-state recipe — Ref: §2.1
# ---------------------------------------------------------------------------

@dataclass
class Station:
    """A single flow station, fully resolved from (T0, p0, V, gamma, cp).

    Implements the §2.1 "station-state recipe" exactly:
      1. Inputs: T0, p0 (from the relevant cycle/stage equation) and the
         local through-flow velocity V (axial Vz if held constant through
         a stage, the resultant velocity-triangle V, or a continuity V).
      2. T   = T0 - V^2/(2*Cp)
      3. M   = V / sqrt(gamma*R*T)
      4. p   = p0 / (1+((gamma-1)/2)M^2)^(gamma/(gamma-1))
      5. rho = p/(R*T)
      6. h = Cp*T, h0 = Cp*T0
      7. Delta_s relative to a caller-supplied reference station (optional;
         call `.entropy_rel(T_ref, p_ref)` explicitly since it needs a
         reference choice the recipe itself leaves open).

    V = 0 is the valid/expected input for a purely thermodynamic (no
    kinetic-energy) station read: it collapses M to 0 and T, p to T0, p0,
    which is correct (static = stagnation at zero velocity).
    """

    name: str
    T0: float           # K
    p0: float           # Pa
    gamma: float
    cp: float           # J/(kg*K)
    R: Optional[float] = None
    V: float = 0.0       # m/s, local through-flow velocity at this station

    T: float = field(init=False)
    p: float = field(init=False)
    M: float = field(init=False)
    rho: float = field(init=False)
    h: float = field(init=False)
    h0: float = field(init=False)

    def __post_init__(self):
        if self.R is None:
            self.R = self.cp * (self.gamma - 1.0) / self.gamma
        if self.T0 <= 0 or self.p0 <= 0:
            raise ValueError(f"Station '{self.name}': T0 and p0 must be positive "
                              f"(got T0={self.T0}, p0={self.p0})")

        T = static_temperature_from_stagnation(self.T0, self.V, self.cp)
        if T <= 0:
            raise ValueError(
                f"Station '{self.name}': computed static T={T:.2f} K <= 0 — "
                f"V={self.V} m/s is not physically achievable from T0={self.T0} K "
                f"with cp={self.cp}."
            )
        if self.V > 0:
            a = speed_of_sound(self.gamma, self.R, T)
            M = mach_number(self.V, a)
        else:
            M = 0.0
        p = static_pressure_from_stagnation(self.p0, self.gamma, M)
        rho = p / (self.R * T)

        self.T = T
        self.M = M
        self.p = p
        self.rho = rho
        self.h = self.cp * T
        self.h0 = self.cp * self.T0

    def entropy_rel(self, T_ref: float, p_ref: float) -> float:
        """Delta_s relative to an arbitrary reference (T_ref, p_ref).
        Ref: §2.1 step 7."""
        return entropy_relative(self.cp, self.R, self.T, self.p, T_ref, p_ref)

    @classmethod
    def from_static(cls, name: str, T: float, p: float, V: float,
                     gamma: float, cp: float, R: Optional[float] = None) -> "Station":
        """Build a Station from an already-known STATIC state (T, p, V)
        rather than from (T0, p0, V).

        Use this — not the normal (T0, p0, V) constructor — whenever the
        static state was computed directly by a lossy-component formula
        (e.g. the §8 nozzle exit velocity/pressure, which already bakes in
        eta_N). Feeding that component's upstream T0/p0 into the normal
        constructor together with the lossy exit V would silently apply
        the ISENTROPIC p0->p relation to an upstream p0 that does not
        reflect the loss actually incurred — double-counting nothing, but
        reporting the wrong static pressure. Going forward from a known
        static state instead (M = V/sqrt(gamma*R*T), then T0 = T*(T0/T),
        p0 = p*(p0/p)) is exactly as valid an application of the same §2.1
        isentropic point relations, just run in the other direction — and
        it makes the ACTUAL total-pressure loss through the component
        visible by comparison against the component's inlet p0 (e.g.
        p09 < p05 for a real nozzle, even though T09 = T05 since the
        nozzle is adiabatic).
        """
        if R is None:
            R = cp * (gamma - 1.0) / gamma
        if T <= 0 or p <= 0:
            raise ValueError(f"Station.from_static '{name}': T and p must be positive "
                              f"(got T={T}, p={p})")
        M = mach_number(V, speed_of_sound(gamma, R, T)) if V > 0 else 0.0
        T0 = T * T0_over_T(gamma, M)
        p0 = p * p0_over_p(gamma, M)
        return cls(name=name, T0=T0, p0=p0, gamma=gamma, cp=cp, R=R, V=V)

    def as_dict(self) -> dict:
        return {
            "name": self.name, "T0": self.T0, "p0": self.p0, "T": self.T,
            "p": self.p, "M": self.M, "V": self.V, "rho": self.rho,
            "h": self.h, "h0": self.h0,
        }

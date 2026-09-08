"""
Gas properties and §10 design-value defaults.

Ref: §0 (Notation & Conventions), §10 (Design-Value Quick Reference).

Two calorically-perfect-gas property sets are carried through the whole
cycle: COLD (ambient air, everything upstream of the combustor) and HOT
(combustion products, combustor exit onward). Gas constant R for each
section is *derived* from Cp and gamma via R = Cp(gamma-1)/gamma, rather
than hand-entered separately — this keeps Cp, gamma and R thermodynamically
self-consistent by construction (no risk of the three numbers silently
disagreeing with each other).
"""

# ---------------------------------------------------------------------------
# Cold section (air, up to combustor inlet) — Ref: §0
# ---------------------------------------------------------------------------
GAMMA_C = 1.400
CP_C = 1005.0  # J/(kg*K)   [source: 1.005 kJ/kg.K]
R_C = CP_C * (GAMMA_C - 1) / GAMMA_C  # ~287.1 J/(kg*K)

# ---------------------------------------------------------------------------
# Hot section (combustion products, combustor exit onward) — Ref: §0
# ---------------------------------------------------------------------------
GAMMA_H = 1.333
CP_H = 1148.0  # J/(kg*K)   [source: 1.148 kJ/kg.K]
R_H = CP_H * (GAMMA_H - 1) / GAMMA_H  # ~286.8 J/(kg*K)

# ---------------------------------------------------------------------------
# §10 Design-Value Quick Reference — typical/recommended ranges from the
# source, used as UI slider defaults and sanity bounds. Each entry below
# states its source range in a comment; the DEFAULT chosen is the
# range's midpoint unless noted otherwise. A few quantities the solver
# needs are NOT given a numeric default anywhere in the extracted source
# (flagged "NOT IN SOURCE" below) — these use a labelled, conventional
# literature value instead, and callers should treat them as the most
# provisional numbers in the whole model.
# ---------------------------------------------------------------------------

DEFAULTS = {
    # --- Intake --- Ref §3, §10
    "eta_d": 0.80,          # source range 0.70-0.90

    # --- Compressor --- Ref §4, §10
    "eta_c_stage": 0.90,    # per-stage isentropic/polytropic efficiency,
                            # source range for OVERALL eta_c is 0.85-0.90;
                            # used here as the constant per-stage value fed
                            # into the stacking procedure (§4.2) — overall
                            # eta_c is then a *derived*, PR-dependent result
                            # (see compressor.overall_isentropic_efficiency),
                            # not an independent input. Source explicitly
                            # warns not to hold overall eta_c constant across
                            # a PR sweep.
    "sigma_slip": 0.90,     # centrifugal slip factor — source gives no
                            # numeric correlation (Stanitz/Stodola), adopts
                            # "a literature-typical sigma ~ 0.9" per its own
                            # wording (§4.3).
    "V_z_axial": 175.0,     # m/s, source range 150-200 (axial compressor)

    # --- Combustor --- Ref §5, §10
    "eta_b": 0.97,          # source range ~0.97
    "delta_p_cc_pct": 0.05, # combustor fractional total-pressure loss.
                            # NOT IN SOURCE as a specific number (source
                            # only gives the p04 = p03(1 - dp_cc%) formula
                            # shape) — 5% is a conventional literature
                            # placeholder, not from the reference PDF.
    "Q_R": 43.0e6,          # J/kg, aviation kerosene (Jet-A) lower heating
                            # value. NOT IN SOURCE (source only worked a
                            # stoichiometric METHANE example, f~0.06, to
                            # illustrate f << 1 — it gives no numeric QR
                            # for kerosene). 43 MJ/kg is the standard
                            # published Jet-A LHV; flagged here explicitly
                            # since the project's "no formula errors" bar
                            # applies to provenance, not just algebra.

    # --- Shaft / matching --- Ref §7, §10
    "lambda_shaft": 0.80,   # source range 0.75-0.85
    "eta_m": 0.98,          # source range ~0.98

    # --- Turbine --- Ref §6, §10
    "eta_tt_stage": 0.90,   # NOT IN SOURCE as an axial-turbine number
                            # (source's §10 table gives eta_tt/eta_ts > 0.7
                            # only for the RADIAL turbine). 0.90 is a
                            # conventional axial-turbine literature value
                            # used as the per-stage total-to-total
                            # efficiency in the stacking procedure.

    # --- Nozzle --- Ref §8, §10
    "eta_N": 0.95,          # source: "high (~0.95+, typical)"
}

# §4.2 typical per-stage stagnation-temperature-rise bands, for sizing
# sanity checks (not used inside the solver itself). Ref: p.561-563.
AXIAL_STAGE_DT0_BANDS_K = {
    "subsonic": (10.0, 30.0),
    "transonic": (45.0, 55.0),
    "supersonic": (80.0, 80.0),
}

# §6.1 typical per-stage expansion ratio band for an axial turbine stage.
AXIAL_TURBINE_STAGE_PR_BAND = (2.0, 3.0)   # 4.5 is the source's stated max
AXIAL_TURBINE_STAGE_PR_MAX = 4.5

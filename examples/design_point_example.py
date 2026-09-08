"""
Minimal worked example: solve one single-spool turbojet design point and
print the station table + performance summary.

Run with:  python3 examples/design_point_example.py
(from the aeropropsim/ package root, or after `pip install -e .`)
"""

from aeropropsim.engine import EngineConfig, solve_engine


def main():
    cfg = EngineConfig(
        altitude_m=9000.0,
        mach_flight=0.8,
        compressor_type="axial",
        n_compressor_stages=10,
        pi_c=15.0,
        T04=1450.0,
        turbine_type="axial",
        n_turbine_stages=2,
        nozzle_type="convergent",
        mdot_a=45.0,
    )
    result = solve_engine(cfg)

    print("=" * 70)
    print("AeroPropSim v1 — single design-point solve")
    print("=" * 70)
    print(f"Altitude:            {cfg.altitude_m:>10.0f} m")
    print(f"Flight Mach:         {cfg.mach_flight:>10.2f}")
    print(f"Ambient T / p:       {result.atmosphere['T_a']:>10.1f} K   "
          f"{result.atmosphere['p_a']/1000:>8.1f} kPa")
    print()

    print(f"{'Station':<10}{'T0 [K]':>10}{'p0 [kPa]':>12}{'T [K]':>10}"
          f"{'p [kPa]':>10}{'M':>8}{'V [m/s]':>10}")
    for name, st in result.stations.items():
        print(f"{name:<10}{st.T0:>10.1f}{st.p0/1000:>12.1f}{st.T:>10.1f}"
              f"{st.p/1000:>10.1f}{st.M:>8.3f}{st.V:>10.1f}")
    print()

    print("Compressor:")
    print(f"  stages: {len(result.compressor['stages'])}   "
          f"pi_actual: {result.compressor['pi_actual']:.4f}   "
          f"eta_c(overall, derived): {result.compressor.get('eta_c_overall_derived', float('nan')):.4f}")
    for i, s in enumerate(result.compressor["stages"], 1):
        print(f"    stage {i}: T01_in={s['T01_in']:.1f} K  dT0={s['dT0']:.1f} K  "
              f"pi_stage={s['pi_stage']:.4f}")
    print()

    print("Combustor:")
    print(f"  f (fuel-air ratio): {result.combustor['f']:.5f}")
    print()

    print("Turbine:")
    print(f"  stages: {len(result.turbine['stages'])}   "
          f"pr_actual: {result.turbine['pr_actual']:.4f}")
    for i, s in enumerate(result.turbine["stages"], 1):
        print(f"    stage {i}: T01_in={s['T01_in']:.1f} K  dT0={s['dT0']:.1f} K  "
              f"pr_stage={s['pr_stage']:.4f}")
    print()

    print("Nozzle:")
    print(f"  choked: {result.nozzle['choked']}   "
          f"V_exit: {result.nozzle['V_exit']:.1f} m/s   "
          f"p_exit: {result.nozzle['p_exit']/1000:.1f} kPa")
    print()

    perf = result.performance
    print("Performance:")
    print(f"  Thrust:              {perf['thrust']/1000:.2f} kN")
    print(f"  Specific thrust:     {perf['specific_thrust']:.1f} N/(kg/s)")
    print(f"  TSFC:                {perf['tsfc']*1000*3600:.4f} kg/(kN.hr)")
    print(f"  eta_thermal:         {perf['eta_thermal']:.4f}")
    print(f"  eta_propulsive:      {perf['eta_propulsive']:.4f}")
    print(f"  eta_overall:         {perf['eta_overall']:.4f}")


if __name__ == "__main__":
    main()

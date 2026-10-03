
# Laws of Thermodynamics 
___

Understanding the the micro phenomena allows us to understand deeply the macro phenomenas. Thermodynamics allows us to establish a foundation on what parameters to consider when studying the movement of fluids. It is the study of energy in which it is governed by laws which expressed the contrained by nature and reality.

### 1st Law
> **"Energy Cannot be Created nor Destroyed but can only be Transformed or Change from one form to another."**

### 2nd Law
> **"Total Entropy, or Disorder of an Isolated System Always increases over time due to spontaneous Process."**

### 3rd Law
> **"Entropy Reaches Zero at Absolute Zero Temperature"**

### Zeroth Law
> **"If two systems are each in thermal equilibrium with a third system, they are also in thermal equilibrium with each other."**

# Conservation of Energy
___

Energy in a thermodynamic system is not created or destroyed; it is transferred and transformed. In aircraft and engine systems, the most important forms are internal energy, flow work, heat transfer, and shaft work.

## Entropy
Entropy is a measure of the dispersal of energy or the number of microscopic arrangements available to a system. In simple terms, it tells us how spread out or unavailable the energy has become.

$$\Delta S = \int \frac{\delta Q_{rev}}{T}$$

- Higher entropy means more molecular disorder and less useful energy for doing work.
- The second law states that the entropy of an isolated system tends to increase.
- In engines, entropy generation is linked to irreversibility such as friction, turbulence, and heat transfer across finite temperature differences.

### Entropy Particle Card
For an ideal gas, entropy change from one state to another is:

$$\Delta S = N c_v \ln\left(\frac{T_2}{T_1}\right) + N R \ln\left(\frac{V_2}{V_1}\right)$$

where:
- $N$ = amount of gas
- $c_v$ = specific heat at constant volume
- $R$ = gas constant
- $T_1, T_2$ = initial and final temperature
- $V_1, V_2$ = initial and final volume

This is the best practical interpretation for the particle model: we do not track individual microstates directly, but we show how increasing temperature and increasing volume allow a gas to occupy more accessible arrangements.

```particle-card
{
  "title": "Entropy and Molecular Distribution",
  "subtitle": "The gas evolves from an initial state (T₁, V₁) to a final state (T₂, V₂) over an adjustable period.",
  "model": "entropy",
  "particleCount": 42,
  "referenceTemperature": 300,
  "referenceVolume": 1,
  "cv": 20.8,
  "R": 8.314,
  "temperatureInitial": {
    "value": 10,
    "min": 1,
    "max": 1000,
    "step": 1,
    "unit": "K"
  },
  "temperatureFinal": {
    "value": 100,
    "min": 0,
    "max": 1000,
    "step": 1,
    "unit": "K"
  },
  "volumeInitial": {
    "value": 1,
    "min": 0.1,
    "max": 10,
    "step": 0.01,
    "unit": "m^3"
  },
  "volumeFinal": {
    "value": 2,
    "min": 0.1,
    "max": 10,
    "step": 0.01,
    "unit": "m^3"
  },
  "duration": {
    "value": 2,
    "min": 0,
    "max": 5,
    "step": 0.1,
    "unit": "s"
  },
  "moles": {
    "value": 1,
    "min": 0,
    "max": 5,
    "step": 0.01,
    "unit": "mol"
  },
  "notes": [
    "The transition begins at state 1 and ends at state 2; both temperature and volume evolve over the selected duration.",
    "Entropy change is calculated from the endpoint ratios: ΔS = N c_v ln(T₂/T₁) + N R ln(V₂/V₁).",
    "If T₂ is set to 0 K, the particles stop when the transition reaches that endpoint.",
    "Raising temperature increases molecular kinetic energy, so the gas spreads its energy over more energetic microscopic states.",
    "Increasing volume gives particles more possible positions, which increases the number of accessible arrangements.",
    "For an isentropic process, entropy change is zero because the ratio terms combine to leave ΔS = 0."
  ]
}
```

### Entropy interpretation
- $T \uparrow$ → particles move faster → more energetic states → $\Delta S > 0$
- $V \uparrow$ → more space for particles → more arrangements → $\Delta S > 0$
- $\Delta S = 0$ → isentropic process, no net increase in entropy

## Enthalpy
Enthalpy is the total heat content of a flowing fluid or system and combines internal energy with flow work.

$$h = u + pv$$

- $h$ = specific enthalpy
- $u$ = specific internal energy
- $p$ = pressure
- $v$ = specific volume

In gas turbine and jet engine analysis, enthalpy is often more useful than internal energy alone because the fluid is moving and doing work as it flows.

## Energy
Energy is the capacity to do work or transfer heat. It appears in many forms, including:

- thermal energy
- kinetic energy
- potential energy
- chemical energy
- mechanical work

For a closed system, the first law is:

$$\Delta E = Q - W$$

where $Q$ is heat added to the system and $W$ is work done by the system.

## Work
Work is energy transferred when a force causes displacement or a pressure acts through a volume change.

$$\delta W = p\,dV$$

For boundary work in a piston or closed system:

$$W = \int_{1}^{2} p\,dV$$

- Positive work means work is done by the system.
- Negative work means work is done on the system.
- In engines, work is produced when expanding gases push against a piston or turbine blade.

```particle-card
{
  "title": "Thermodynamic State and Energy Transfer",
  "subtitle": "Adjust temperature, mass, and volume to see how gas pressure responds as energy is redistributed.",
  "model": "ideal-gas",
  "particleCount": 40,
  "gas": {
    "R": 287,
    "unit": "J/(kg·K)"
  },
  "temperature": {
    "value": 300,
    "min": 100,
    "max": 900,
    "step": 1,
    "unit": "K"
  },
  "mass": {
    "value": 1.4,
    "min": 0.1,
    "max": 5,
    "step": 0.01,
    "unit": "kg"
  },
  "volume": {
    "value": 1.2,
    "min": 0.1,
    "max": 5,
    "step": 0.01,
    "unit": "m^3"
  },
  "notes": [
    "Entropy rises as energy becomes more spread out and less useful for mechanical work.",
    "Enthalpy combines internal energy with flow work, making it especially useful in moving gas systems.",
    "Work is energy transferred by a force through displacement or by pressure acting across a changing volume.",
    "Increasing temperature raises pressure when mass and volume stay fixed, which is how energy input affects a gas state."
  ]
}
```

# Temperature Pressure and Density
```particle-card
{
  "title": "Temperature, Mass, Volume, and Pressure",
  "subtitle": "Adjust temperature, mass, and volume to observe ideal-gas behavior.",
  "model": "ideal-gas",
  "particleCount": 36,
  "gas": {
    "R": 287,
    "unit": "J/(kg·K)"
  },
  "temperature": {
    "value": 288.15,
    "min": 100,
    "max": 900,
    "step": 1,
    "unit": "K"
  },
  "mass": {
    "value": 1.225,
    "min": 0.1,
    "max": 5,
    "step": 0.01,
    "unit": "kg"
  },
  "volume": {
    "value": 1,
    "min": 0.1,
    "max": 5,
    "step": 0.01,
    "unit": "m^3"
  },
  "notes": [
    "Increasing temperature increases pressure when mass and volume remain constant.",
    "Increasing mass increases density and pressure.",
    "Increasing volume decreases density and pressure."
  ]
}
```

# Thermodynamic Processes

A thermodynamic process describes how a working fluid changes from one state to another. The most important processes in powerplant and gas-turbine work are defined by which property stays constant.

## Constant Pressure (Isobaric)
In an isobaric process, pressure remains constant while volume and temperature change.

$$p = \text{constant}$$

Work done is:

$$W = \int_{1}^{2} p\,dV = p(V_2 - V_1)$$

- Heating a gas at constant pressure causes expansion.
- This process is common in piston engines during the power stroke and in heat exchangers where pressure is maintained.
- The gas does useful work as it expands.

## Constant Volume (Isochoric)
In an isochoric process, volume remains constant while pressure and temperature change.

$$V = \text{constant}$$

Because there is no boundary movement:

$$W = 0$$

- All heat added goes into raising internal energy.
- Pressure rises with temperature for a fixed volume.
- This is important during combustion in a closed cylinder before expansion begins.

## Constant Temperature (Isothermal)
In an isothermal process, temperature remains constant.

$$T = \text{constant}$$

For an ideal gas:

$$pV = \text{constant}$$

Work done is:

$$W = mRT\ln\left(\frac{V_2}{V_1}\right)$$

- The gas expands or compresses while maintaining the same temperature.
- Heat transfer occurs continuously to balance internal energy changes.
- This is a useful idealized model for slow compression or expansion.

## Adiabatic Process
An adiabatic process has no heat transfer with the surroundings.

$$Q = 0$$

From the first law:

$$\Delta U = -W$$

- If the gas expands, it does work and cools.
- If the gas compresses, work is done on it and it heats up.
- Real engine processes are often close to adiabatic but not perfectly so.

## Isentropic Process
An isentropic process is both adiabatic and reversible.

$$Q = 0 \quad \text{and} \quad \Delta S = 0$$

For an ideal gas:

$$pV^\gamma = \text{constant}$$

where $\gamma = \frac{c_p}{c_v}$.

This is the ideal model for:
- compressor compression
- turbine expansion
- nozzle flow
- ideal engine cycles

## Polytropic Process
A polytropic process is a more general form that includes many real processes.

$$pV^n = \text{constant}$$

where $n$ is the polytropic index.

- $n = 0$ gives isobaric process
- $n = 1$ gives isothermal process
- $n = \gamma$ gives isentropic process
- $n \to \infty$ approximates isochoric behavior in some limiting cases

This model is useful because real compressors, turbines, and cylinders often do not behave perfectly as ideal isobaric, isothermal, or isentropic systems.

## Summary of Process Relationships

| Process | Constant property | Equation |
| --- | --- | --- |
| Isobaric | Pressure | $p = \text{constant}$ |
| Isochoric | Volume | $V = \text{constant}$ |
| Isothermal | Temperature | $T = \text{constant}$ |
| Adiabatic | Heat transfer | $Q = 0$ |
| Isentropic | Entropy and heat transfer | $\Delta S = 0$, $Q = 0$ |
| Polytropic | General case | $pV^n = \text{constant}$ |

## Otto Cycle
The Otto cycle is the ideal cycle for spark-ignition reciprocating engines.

It consists of:
- isentropic compression
- constant-volume heat addition
- isentropic expansion
- constant-volume heat rejection

## Brayton Cycle
The Brayton cycle is the ideal cycle for gas turbines and jet engines.

It consists of:
- isentropic compression
- constant-pressure heat addition
- isentropic expansion
- constant-pressure heat rejection

## Key idea
Power-producing devices rely on pressure and temperature changes caused by compression, combustion, and expansion. Understanding the process type helps determine the work produced and the efficiency of the cycle.

# Reciprocating Engine
## Reciprocating Parts and Components
## Performance Variables


# Turbine Engine
## Turbine Engine Types
## Performance Variables


# Rocket Engine
## Reciprocating Parts and Components
## Performance Variables


# Reciprocating Engine
## Reciprocating Parts and Components
## Performance Variables


# Turbine Engine
## Turbine Engine Types
## Performance Variables


# Rocket Engine
## Reciprocating Parts and Components
## Performance Variables

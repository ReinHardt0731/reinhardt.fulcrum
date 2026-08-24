# Fundamentals of Aerodynamics

Aerodynamics is the study of motion of air and how thermodynamic properties changes as an object is being subjected to a moving air. Air is made up of

![Air](../asset/Air_composition.PNG)


## Properties of Air
Pressure Temperature and Density

The particle card shows how temperature, relative volume, and pressure relate in a simplified ideal-gas model. Particle speed follows the square root of temperature, while wall pulses and wall color show measured collision pressure.

```particle-card
{
  "title": "Temperature, Volume, and Pressure",
  "subtitle": "Adjust temperature and relative volume to observe particle motion and wall pressure.",
  "particleCount": 36,
  "temperature": {
    "value": 300,
    "min": 100,
    "max": 900,
    "step": 10,
    "unit": "K"
  },
  "volume": {
    "value": 1,
    "min": 0.5,
    "max": 2,
    "step": 0.05,
    "unit": "relative"
  },
  "notes": [
    "Higher temperature increases average particle speed.",
    "At constant temperature, reducing volume increases pressure."
  ]
}
```

Assumptions when dealing with aerodynamic problems involves
### Incompressibility
This implies a condition where density is constant along the flow field.

(Put a compressibility MAP or range)

### Inviscid
Inviscid Implies a condition where 
### Adiabatic 
### Isentropic

## Geopotential and Geomtric Altitude

$$g = g_0\left[\frac{r}{h_a}\right]^2$$

where 

$$h_a = r + h_G$$

Therefore

$$g = g_0\left[\frac{r}{ r + h_G}\right]^2$$

Example: Problem Solving



## Atmosphere
Atmosphere is Divided into Several Layers 
![atmosphere](../asset/atmosphere.PNG)

### Isentropic Layers

$$\frac{P}{P_0} = \left[\frac{T}{T_0}\right]^{\frac{\gamma}{\gamma-1}}$$
$$T = T_0 + ah$$
$$ \frac{P}{P_0} = \left[1 + \frac{ah}{T_0} \right]^{5.26}$$
$$ \frac{\rho}{\rho_0} = \left[1 + \frac{ah}{T_0} \right]^{4.26}$$
### Isothermal Layers
$$P = $$

## Conservation of Mass, Energy and Momentum

Images are rendered responsively and include alternative text for accessibility.

$$\rho_1 A_1 V_1 = \rho_2 A_2 V_1$$

For Incompressible assumption we assume that 

$$\rho_1 = \rho_2$$

Thus

$$A_1 V_1 =  A_2 V_2$$

```equation-card
{
  "title": "Continuity Equation",
  "subtitle": "Adjust two variables and observe how the remaining active variable follows while volumetric flow is preserved.",
  "equation": "A_1 V_1 = A_2 V_2",
  "behavior": {"activeVariables": ["A_1", "V_2"]},
  "variables": [
    {"symbol": "A_1", "displaySymbol": "A_1", "name": "Area 1", "unit": "m^2", "axis": "left", "value": 5.8, "min": 1, "max": 10, "step": 0.1, "interactive": true},
    {"symbol": "A_2", "displaySymbol": "A_2", "name": "Area 2", "unit": "m^2", "axis": "left", "value": 5.8, "min": 1, "max": 10, "step": 0.1, "interactive": true},
    {"symbol": "V_1", "displaySymbol": "V_1", "name": "Velocity 1", "unit": "m/s", "axis": "right", "value": 29.2, "min": 2, "max": 50, "step": 0.2, "interactive": true},
    {"symbol": "V_2", "displaySymbol": "V_2", "name": "Velocity 2", "unit": "m/s", "axis": "right", "value": 29.2, "min": 2, "max": 50, "step": 0.2, "interactive": true}
  ],
  "graph": {
    "type": "variable-behavior",
    "relationship": {"left": "A_1 * V_1", "right": "A_2 * V_2"},
    "axes": {
      "left": {"label": "Area", "unit": "m^2"},
      "right": {"label": "Velocity", "unit": "m/s"}
    }
  },
  "notes": [
    "Area variables use the left axis.",
    "Velocity variables use the right axis.",
    "Select two circles to choose the active variables.",
    "Assumes steady, incompressible flow."
  ]
}
```
Example:

## Mach Number and Speed of Sound

$$a^2 = \gamma RT$$
$$ M = \frac{V}{a^2}$$

## Compressibility Effect on Stagnation
$$c_pT_\infin + \frac{V^2_\infin}{2} =c_pT + \frac{V^2}{2} $$
$$c_pT_\infin + \frac{V^2_\infin}{2} =c_pT + \frac{V^2}{2} $$
## Viscous Effects
\m
### Flat Plate Theory
## Coeffecient of Pressure
### Cp Distribution on Subsonic to Supersonic
### Cp Distribution During Stall
## Critical Pressure and Velocity
## Lift Due to Circulation

SUMMARY:




# Applied Aerodynamics

### Steady Aircraft Assumption
### Drag  Polar Equation

## Thrust and Minimum Thrust Required
## Power and Minimum Power Required
## Excess Power and Rate of Climb
## Time to Climb
## Glide Performance
## Service Ceiling and Absolute Ceiling
## Range And Endurance Propeller Driven Aircraft
## Range And Endurance of Jet Aircraft
## Load Factor

# High Speed Aerodynamics 

### Assumptions

## Normal Shock Wave
## Oblique Shock Wave
## Expansion Fan
## Design Implications

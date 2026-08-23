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

ASsumptions when dealing with aerodynamic problems
### Incompressible
### Inviscid
### Adiabatic 
### Isentropic




## Atmosphere

![Repository capture](../asset/Capture.PNG)

The image path above is relative to this Markdown file:

- Markdown file: `markdowns/image-rendering-sample.md`
- Image asset: `asset/Capture.PNG`

## Conservation of Mass, Energy and Momentum

Images are rendered responsively and include alternative text for accessibility.

 Interactive 3D Model

The uploaded GLB model below demonstrates the local interactive model viewer.

```model-card
{
  "title": "Handcrafted 3D Turbine",
  "src": "../asset/handcrafted_3d_turbine_schindler_d1_2025.glb",
  "alt": "Interactive 3D handcrafted turbine model",
  "controls": true,
  "autoRotate": false,
  "cameraOrbit": "45deg 65deg 2.5m",
  "exposure": 1,
  "annotations": [
    {
      "id": "blade",
      "label": "Turbine blade",
      "description": "The blade redirects airflow and contributes to turbine rotation.",
      "position": "0.15m 0.42m 0.08m",
      "normal": "0 1 0"
    },
    {
      "id": "shaft",
      "label": "Central shaft",
      "description": "The shaft transfers rotational motion through the turbine assembly.",
      "position": "0m 0m 0m",
      "normal": "0 0 1"
    }
  ]
}
```

 Interactive Equation Card

The card below demonstrates how Markdown can describe an equation, slider inputs, a derived value, and a graph that redraws when the sliders move.

```equation-card
{
  "title": "Oblique-Shock Relationship",
  "subtitle": "Change the deflection angle and Mach number to explore the relationship.",
  "equation": "\\tan(\\theta) = 2 \\cot(\\beta) \\frac{M^2\\sin^2(\\beta)-1}{M^2(\\gamma+\\cos(2\\beta))+2}",
  "variables": [
    {
      "symbol": "theta",
      "displaySymbol": "\\theta",
      "name": "Deflection angle",
      "description": "The flow turning angle for the current case.",
      "unit": "deg",
      "value": 9.4,
      "min": 0,
      "max": 20,
      "step": 0.1,
      "interactive": true
    },
    {
      "symbol": "M",
      "displaySymbol": "M",
      "name": "Mach number",
      "description": "The upstream flow Mach number for the case.",
      "unit": "",
      "value": 1.58,
      "min": 1.01,
      "max": 5,
      "step": 0.01,
      "interactive": true
    },
    {
      "symbol": "gamma",
      "displaySymbol": "\\gamma",
      "name": "Specific heat ratio",
      "description": "A fixed air-property constant for air.",
      "unit": "",
      "value": 1.4,
      "interactive": false
    }
  ],
  "derived": [
    {
      "symbol": "beta",
      "displaySymbol": "\\beta",
      "name": "Wave angle",
      "unit": "deg",
      "solver": {
        "type": "theta-beta-m",
        "theta": "theta",
        "mach": "M",
        "gamma": "gamma",
        "branch": "weak"
      },
      "description": "Numerically solved from the current deflection angle, Mach number, and heat ratio."
    }
  ],
  "graph": {
    "expression": "M * x * (1 - x / 20)",
    "xVariable": "theta",
    "xLabel": "Deflection angle (theta)",
    "yLabel": "Wave response",
    "xMin": 0,
    "xMax": 20,
    "yMin": 0,
    "yMax": 20
  },
  "notes": [
    "Move a slider to update the value, marker, and curve together.",
    "The card is fully client-side and works on static hosting."
  ]
}
```

 
```youtube-card
{
  "url": "https://www.youtube.com/watch?v=E3i_XHlVCeU&t=1s",
  "title": "Aerodynamics",
  "start": 45,
  "end": 180
}
```
## Mach Number and Speed of Sound
## Compressibility Effect on Stagnation
## Viscous Effects
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


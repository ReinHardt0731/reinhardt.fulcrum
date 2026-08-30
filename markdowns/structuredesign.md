# Aircraft Design and Structures Fundamentals
___

## Aircraft Design Pipeline
Aircraft design is the **engineering process of creating an aircraft that satisfies a defined set of mission, performance, operational, structural, economic, and regulatory requirements.**

The design process begins with determining **what the aircraft must do** before determining **how the aircraft should be built**.
---

**Mission Profile**
The **mission profile** describes the intended operation of the aircraft.
It defines the conditions and tasks that the aircraft must be capable of performing.
### Main Mission Requirements
- **Payload and type**
- **Range and/or loiter requirements**
- **Cruise speed and altitude**
- **Take-off and landing field length**
- **Fuel reserves**
- **Climb requirements**
- **Maneuvering requirements**
- **Certification basis**
### Certification Basis
The aircraft must be designed according to its intended certification category, such as:
- Experimental
- FAR/14 CFR Part 23
- FAR/14 CFR Part 25
- Military requirements
### Basic Concept
**Mission → Requirements → Aircraft Design**
The mission is therefore the **starting point of the aircraft design process**.

**Design Requirements**
The mission profile is translated into measurable **design requirements**.
These requirements become the targets that the aircraft must satisfy.
**Important Design Requirements**

| Requirement | What it Determines |
|---|---|
| **Range** | Distance the aircraft must travel |
| **Take-off distance** | Required runway performance |
| **Stalling velocity** | Low-speed performance and wing characteristics |
| **Endurance** | How long the aircraft must remain airborne |
| **Maximum velocity** | Maximum required speed |
| **Rate of climb** | Climb performance |
| **Turn rate / turn radius** | Maneuverability, especially for combat aircraft |
| **Maximum load factor** | Structural and maneuvering strength |
| **Service ceiling** | Maximum operational altitude |
| **Cost** | Economic feasibility |
| **Reliability and maintainability** | Operational practicality |
| **Maximum size** | Compatibility with hangars, gates, infrastructure, etc. |
~~##
### Key Idea

The aircraft is **not designed first and then given a mission**.

Instead:

**Mission Requirements → Design Targets → Aircraft Configuration**
~~##
---

### Conceptual Design

The **conceptual design stage** determines the overall configuration of the aircraft.

At this stage, the designer is asking:

> **"What kind of aircraft should we build to satisfy the mission?"**

The exact dimensions and structural details are not yet finalized.

**Major Activities**

- Select the general aircraft configuration.
- Estimate aircraft size.
- Estimate aircraft weight.
- Select the general wing configuration.
- Select the tail configuration.
- Select the propulsion system.
- Determine approximate engine placement.
- Estimate wing loading.
- Estimate thrust-to-weight or power-to-weight ratio.
- Estimate basic aerodynamic performance.
- Compare alternative configurations.

**Typical Configuration Decisions**

**Wing**

- High wing
- Mid wing
- Low wing
- Swept or unswept
- High or low aspect ratio
- Cantilever or externally braced

**Tail**

- Conventional tail
- T-tail
- V-tail
- H-tail
- Twin vertical tail
- Canard

**Propulsion**

- Piston-propeller
- Turboprop
- Turbojet
- Turbofan
- Electric
- Hybrid

>**Main Goal: The goal is to identify a **feasible aircraft concept** that can potentially satisfy the mission requirements.**

---

### Preliminary Design

Once a promising concept has been selected, the design becomes more detailed.

The **preliminary design stage** determines the major dimensions and characteristics of the aircraft.

**Major Activities**

- Refine aircraft weight estimation.
- Determine wing area.
- Determine wing span.
- Determine aspect ratio.
- Determine fuselage dimensions.
- Size the horizontal and vertical stabilizers.
- Determine control surface sizes.
- Refine engine selection and placement.
- Determine fuel capacity.
- Analyze aerodynamic performance.
- Analyze stability and control.
- Perform structural assessments.
- Check landing gear requirements.
- Evaluate aircraft systems and equipment.

Important Parameters:

**Wing Loading**

$$
\frac{W}{S}
$$

where:

- $W$ = aircraft weight
- $S$ = wing area

Wing loading affects:

- Take-off performance
- Landing performance
- Cruise performance
- Maneuvering
- Structural requirements

**Aspect Ratio**

$$
AR = \frac{b^2}{S}
$$

where:

- $AR$ = aspect ratio
- $b$ = wing span
- $S$ = wing area

A higher aspect ratio generally reduces induced drag but can increase structural weight.

> **Preliminary Design Philosophy : Concept → Size → Analyze → Refine**

The design is repeatedly modified until the major requirements are satisfied.

---

### Detailed Design

The **detailed design stage** converts the selected aircraft concept into an aircraft that can actually be manufactured.

At this stage, individual components and systems are designed in much greater detail.

**Major Activities**

- Detailed structural design
- Detailed aerodynamic design
- Component sizing
- Material selection
- Fastener and joint design
- Detailed control-system design
- Landing gear design
- Fuel-system design
- Hydraulic and pneumatic system design
- Electrical system design
- Avionics integration
- Manufacturing considerations
- Maintenance considerations
- Safety and certification analysis

**Structural Design**

The designer determines:

- Skin thickness
- Spar dimensions
- Rib dimensions
- Stringer dimensions
- Frame dimensions
- Longeron dimensions
- Joint and fastener requirements
- Structural load paths

**Manufacturing Considerations**

The design must consider how components will actually be produced.

Possible methods include:

- Machining
- Milling
- Chemical etching
- Riveting
- Bonding
- Composite manufacturing

---

### Analysis and Verification

The aircraft design must be analyzed to determine whether it actually satisfies the requirements.

Major Analyses

**Aerodynamic Analysis**

Determines:

- Lift
- Drag
- Moment
- Stall behavior
- Aerodynamic efficiency

Common tools include:

- Analytical methods
- Wind-tunnel testing
- VLM
- CFD

**Performance Analysis**

Determines:

- Take-off performance
- Landing performance
- Climb rate
- Cruise speed
- Maximum speed
- Range
- Endurance
- Service ceiling

**Stability and Control Analysis**

Determines:

- Longitudinal stability
- Lateral stability
- Directional stability
- Control authority
- Trim requirements

**Structural Analysis**

Determines:

- Stress
- Strain
- Deflection
- Buckling
- Fatigue
- Structural strength
- Safety margins

---

### Optimization and Iteration

Aircraft design is **iterative**.

A change to one part of the aircraft can affect many other parts.

For example:

**Larger Wing**

→ Higher wing area  
→ Lower wing loading  
→ Better low-speed performance  
→ Potentially higher structural weight  
→ Potentially higher drag  
→ Changes aircraft weight  
→ Changes performance

Therefore, the aircraft cannot normally be designed by moving through the stages only once.

### Design Loop

```flow-chart
Mission Requirements
        ↓
Conceptual Design
        ↓
Preliminary Design
        ↓
Analysis
        ↓
Evaluation
        ↓
Optimization
        ↓
Design Refinement
        ↓
Detailed Design
        ↓
Verification
        ↓
Final Design
```

## Aircraft Structural Elements
___
| Element | Geometry | Thickness vs. Other Dimensions | Typical Loading | Aircraft Examples |
|---|---|---|---|---|
| **Bar Element** | Essentially **1D** | Two dimensions are small compared with its length | Axial tension/compression; can also carry bending/torsion | Stringer, longeron, truss member |
| **Plate Element** | Essentially **2D, flat** | Thickness is small compared with length and width | In-plane forces + **bending** | Flat web, floor panel, spar web |
| **Shell Element** | Essentially **2D, curved** | Thickness is small compared with its surface dimensions | Membrane forces + **bending** | Fuselage skin, curved wing skin |

## Structures | Group
___
Aircraft structures are classified into three structural groups based on their **structural importance, degree of stress, and the consequences of failure**:

| Structural Group | Description | Consequence of Failure | Importance |
|---|---|---|---|
| **Primary Structure** | Structural material that is significantly stressed and whose failure would seriously compromise the structural integrity of the aircraft. | Could result in **catastrophic failure**. | **Critical** |
| **Secondary Structure** | Structural material that is stressed, but to a lesser degree than primary structure. | Would not normally cause catastrophic failure, but may restrict or limit aircraft operation. | **Important** |
| **Tertiary Structure** | Structural material that is not stressed or is only nominally stressed. | Would not cause catastrophic failure. | **Least Critical** |

### 1. Primary Structure

**Primary structure** consists of structural members that carry significant aircraft loads. Failure of a primary structural component can seriously compromise the structural integrity of the aircraft and may result in catastrophic failure.

### **Examples**

Examples of primary structural components include:

- Main wing spars
- Major structural attachments
- Major fuselage load-carrying members
- Other structural members that carry significant flight loads
- Seat mounting rails, where classified as primary structure

> **Key Idea:**  
> **Primary = Failure can seriously threaten the aircraft's structural integrity.**

---

### 2. Secondary Structure

**Secondary structure** consists of structural material that is stressed, but to a lesser degree than primary structure.

Failure of secondary structure would **not normally result in catastrophic failure**, although it may restrict or limit the operation of the aircraft.

> **Key Idea:**  
> **Secondary = Failure may restrict aircraft operation but does not normally cause catastrophic structural failure.**

---

### 3. Tertiary Structure

**Tertiary structure** consists of structural material that is **not stressed or is only nominally stressed**.

Failure of tertiary structure would **not result in catastrophic failure** of the aircraft.

> **Key Idea:**  
> **Tertiary = Failure does not threaten the aircraft's structural integrity.**

---

### How to Differentiate the Three

The classification is primarily based on the **consequences of structural failure**.

| Question | Classification |
|---|---|
| Could failure seriously compromise aircraft structural integrity and potentially cause catastrophic failure? | **Primary** |
| Would failure not normally cause catastrophe but could restrict aircraft operation? | **Secondary** |
| Is the structure unstressed or only nominally stressed, with no catastrophic consequence if it fails? | **Tertiary** |

### Quick Memory Aid

> **Remember:** Structural classification is **not simply based on the size of the component**. The important consideration is the **structural role and consequence of failure** 

**Primary → Aircraft Integrity**  
**Secondary → Aircraft Operation**  
**Tertiary → Non-critical Structure**

## Fuselage Design and Structure
___

The **fuselage** forms the main body of the aircraft. It is the structure to which major aircraft components may be attached, including:

- Wings
- Tailplane
- Canards
- Vertical fin
- Engine, in the case of a single-engine aircraft
- Landing gear, on some aircraft designs

In modern civil air transport aircraft, the fuselage generally takes the form of a **tube**. It provides space for:

- Flight deck
- Passenger cabin
- Freight holds
- Equipment required to operate the aircraft

For passenger aircraft operating above **10,000 ft**, the fuselage also forms a **pressure hull**, allowing a cabin altitude of approximately **8,000 ft** to be maintained during normal flight.

---

### Frame Construction

The fuselage is constructed from several structural members that work together to provide **strength, rigidity, shape, and load distribution**.

### Major Fuselage Structural Components

| Structural Member | Function |
|---|---|
| **Bulkheads** | Provide major structural boundaries within the fuselage. In pressurized aircraft, pressure bulkheads form the ends of the pressure cabin. |
| **Longerons** | Heavy longitudinal structural members that reinforce the fuselage and carry structural loads. |
| **Frames** | Strengthen the fuselage, transfer and share loads, and help prevent crack propagation. |
| **Formers** | Maintain the profile or shape of the fuselage skin between frames. |
| **Stringers** | Lighter longitudinal members that reinforce the fuselage skin. |
| **Skin** | Forms the outer surface of the fuselage and participates in carrying structural loads. |

### Reinforcement Around Openings

Windows, doors, and access hatches require portions of the fuselage skin to be removed.

The surrounding structure is therefore reinforced with:

- A **frame around the aperture**
- Heavier longitudinal members called **longerons**

The purpose of this reinforcement is to carry the loads that would otherwise have been carried by the removed skin.

Fuselage frames are also stiffened so that they can:

- Transfer loads
- Share loads
- Help prevent crack propagation

---

### Monocoque Structures

The term **monocoque** means that the **skin carries all the loads imposed on the structure**.The skin itself provides the structural strength and rigidity of the fuselage.
A simple example of monocoque construction is an **aluminium beverage can**.

Although formers may be attached to the inside of the skin to establish the required shape, the **skin itself carries the flight and ground loads**.
```model-card
{
  "title": "Monocoque Struture",
  "src": "../asset/monocoque.glb",
  "cameraOrbit": "45deg 75deg 3m",
  "autoRotate": true,
  "controls": true,
  "exposure": 1
   
}
```
**Main Disadvantage**

Because the skin carries all the structural loads, damage to the skin can significantly reduce the load-carrying capability of the structure.

Damage may include:

- Dents
- Creases
- Perforations
- Deformation

If the skin is sufficiently damaged, the structure may fail.

**Why Monocoque Construction Is Limited**

Monocoque construction is not commonly used for modern alloy-skinned aircraft because:

- Access hatches, doors, and their mountings introduce additional stresses into the skin.
- The skin would have to be made sufficiently thick to carry the required air loads.
- A sufficiently thick skin would become **unacceptably heavy**.
- The additional weight would reduce the useful payload.

For these reasons, most modern aircraft use **semi-monocoque construction** instead.

---

### Semi-Monocoque Structures

In a **semi-monocoque structure**, the loads imposed on the skin are shared by a series of **frames, stringers, and formers** that are attached to it.

**Structural Members**
```model-card
{
  "title": "Semi-Monocoque Struture",
  "src": "../asset/semi_monocoque.glb",
  "cameraOrbit": "45deg 75deg 3m",
  "autoRotate": true,
  "controls": true,
  "exposure": 1
   
}
```

| Structural Member | Function |
|---|---|
| **Frames** | Strengthen the fuselage and spread the load. |
| **Stringers** | Lighter longitudinal members that reinforce the skin. |
| **Formers** | Maintain the skin's profile between frames. |
| **Skin** | Carries part of the structural load while working together with the other structural members. |

**Load Sharing**

Unlike monocoque construction, the skin is **not solely responsible** for carrying the loads.

The structural members share the load:

**Skin + Frames + Stringers + Formers → Shared Load Paths**

Because the loads are shared among several structural members, semi-monocoque construction is **more tolerant of damage to the skin**.

If localized damage occurs to the skin, the remaining structural members can continue to carry the load.

**Advantages**

Semi-monocoque construction:

- Shares loads between the skin and internal structural members.
- Is more tolerant of skin damage.
- Overcomes many of the disadvantages of monocoque construction.
- Provides a good **strength-to-weight ratio**.

---

### Reinforced Shell Structure

Air transport aircraft must meet the **fail-safe philosophy**.

The principle is:

> **No single component failure should cause the loss of the aeroplane.**

This requires **redundancy** within the structure.

**Redundancy**

A fail-safe structure contains **parallel load paths**.

If one structural member becomes damaged, the remaining structure can continue to carry the load, provided the damage is not catastrophic.

The aircraft may become impaired, but the failure of one individual component should not result in the loss of the aircraft.

**Reinforced Shell**

The **reinforced shell** uses multiple interconnected structural members to provide the required strength and redundancy.

The fuselage structure consists of:

1. **Bulkheads**
2. **Longerons**
3. **Frames**
4. **Formers**
5. **Stringers**
6. **Skin**

These structural members work together to carry and distribute loads.

**Main Characteristics**

The reinforced shell provides:

- **Redundancy**
- **Parallel load paths**
- Multiple structural members capable of sharing loads
- Greater tolerance to localized structural damage

**Fail-Safe Structure**

→ Failure of a single component should not result in loss of the aeroplane.

### Key Concept

| Construction | Load-Carrying Concept |
|---|---|
| **Monocoque** | Skin carries the loads. |
| **Semi-Monocoque** | Skin + frames + stringers + formers share the loads. |
| **Reinforced Shell** | Multiple structural members provide redundant and parallel load paths. |

---

| Method / Construction | Main Principle |
|---|---|
| **Monocoque** | Skin carries the structural loads. |
| **Semi-Monocoque** | Skin and additional structural members share the loads. |
| **Reinforced Shell** | Multiple structural members provide redundant and parallel load paths. |
| **Riveting** | Components are joined using rivets through drilled holes. |
| **Bonding** | Metallic components are joined using adhesive. |
| **Milling** | Unnecessary material is mechanically removed while retaining material needed for strength and rigidity. |
| **Chemical Etching** | Material is selectively removed while retaining material needed for strength and rigidity. |
___
## Tail Design and Configurations
___

**Aircraft stability** describes the tendency of an aircraft to maintain or return to its equilibrium condition after a disturbance. It is generally divided into **static stability** and **dynamic stability**.

### Static Stability

**Static stability** is the tendency of an aircraft to initially develop a **restoring tendency** after being disturbed from its equilibrium condition.

It describes what happens **immediately after a disturbance**. For an aircraft to be statically stable, the initial aerodynamic response should act in a direction that tends to return the aircraft toward its original equilibrium condition.

### Dynamic Stability

**Dynamic stability** describes how the aircraft's motion and response **develop over time** following a disturbance.

An aircraft's dynamic response can be classified according to whether the disturbance motion:

- **Damps out** → Dynamically stable
- **Remains constant** → Neutrally stable
- **Grows with time** → Dynamically unstable

Dynamic stability includes several characteristic modes of aircraft motion.

### Longitudinal Dynamic Modes

**Longitudinal dynamic modes** primarily involve motion about the aircraft's **lateral axis**, including changes in pitch attitude, angle of attack, airspeed, and altitude.

**Phugoid motion** is a **long-period longitudinal oscillation** characterized primarily by an exchange between the aircraft's **kinetic and potential energy**.

A simplified representation of the oscillation can be expressed as:

$$
\theta(t)=\theta_0e^{-\lambda t}\sin(\omega t)
$$

where:

- $\theta_0$ = initial pitch amplitude
- $\lambda$ = damping coefficient
- $\omega$ = oscillation frequency

The value of $\lambda$ determines the behavior of the oscillation:

$$
\lambda > 0 \rightarrow \text{Damped}
$$

$$
\lambda = 0 \rightarrow \text{Neutral}
$$

$$
\lambda < 0 \rightarrow \text{Divergent}
$$

```model-card
{
  "title": "Phugoid Motion",
  "src": "../asset/neutral_phugoid.glb",
  "cameraOrbit": "45deg 75deg 3m",
  "controls": true,
  "animations": ["Empty", "propeller"],
  "autoplay": true,
  "loop": true,
  "animationSpeed": 1,
  "playbackControls": false
}
```

**Short-period motion** is a rapid longitudinal oscillation involving primarily **pitch attitude and angle of attack**. Compared with the phugoid, it has a much higher frequency and generally involves relatively small changes in airspeed.

### Lateral-Directional Dynamic Modes

**Lateral-directional dynamic modes** involve motion primarily about the aircraft's **longitudinal and vertical axes**, producing combinations of roll and yaw.

**Dutch roll** is an oscillatory lateral-directional mode involving a coupled **yawing and rolling motion**.

```model-card
{
  "title": "Dutch Roll Oscillation",
  "src": "../asset/BlendTutorial.glb",
  "cameraOrbit": "45deg 75deg 3m",
  "controls": true,
  "animations": ["Empty", "propeller"],
  "autoplay": true,
  "loop": true,
  "animationSpeed": 1,
  "playbackControls": false
}
```

**Spiral mode** is a slow lateral-directional mode in which the aircraft gradually develops an increasing or decreasing bank angle. A sufficiently unstable spiral mode can develop into a **spiral dive**.

```model-card
{
  "title": "Spiral Dive",
  "src": "../asset/spiral_dive.glb",
  "cameraOrbit": "45deg 75deg 3m",
  "controls": true,
  "animations": ["Empty", "propeller"],
  "autoplay": true,
  "loop": true,
  "animationSpeed": 1,
  "playbackControls": false
}
```

**Roll subsidence** is a non-oscillatory lateral mode in which the aircraft's roll rate gradually decreases after a rolling disturbance due to aerodynamic roll damping.

### Elevator

**The elevator** is the primary conventional longitudinal control surface. It produces a **pitching moment** about the aircraft's lateral axis and is used to control pitch attitude, angle of attack, and longitudinal trim.

The elevator is commonly used for:

- **Pitch control**
- **Rotation during takeoff**
- **Pitch attitude control**
- **Flight-path control**
- **Longitudinal trim**

**A canard** is a horizontal aerodynamic surface located **forward of the main wing**. Depending on the aircraft configuration, the canard may perform functions similar to a conventional horizontal tail while also contributing to lift and longitudinal stability or control.

Canards may be:

- **Fixed**
- **Fully movable**
- **Integrated with a foreplane control system**

**Advantages of canards:**

- Can contribute to lift
- Provides longitudinal control
- Can improve maneuverability
- Can be integrated into the aircraft's overall aerodynamic design

**Disadvantages of canards:**

- Can affect airflow reaching the main wing
- Requires careful longitudinal stability design
- May introduce additional aerodynamic and structural complexity

### Rudder

**The rudder** is the primary directional control surface. It produces a **yawing moment** about the aircraft's vertical axis.

The rudder is commonly used for:

- **Directional control**
- **Coordinated turns**
- **Yaw control**
- **Crosswind correction**
- **Counteracting adverse yaw**

**The vertical stabilizer**, also called the **vertical tail**, provides directional stability by generating a restoring yawing moment when the aircraft experiences sideslip. The rudder is normally mounted on the trailing edge of the vertical stabilizer.

**A dorsal fin** is a small aerodynamic surface extending from the upper portion of the fuselage into the base or forward portion of the vertical stabilizer.

Its functions include:

- Increasing effective vertical-tail area
- Improving directional stability
- Improving directional control at high angles of attack
- Helping delay airflow separation from the vertical tail

**A ventral fin** is a vertical aerodynamic surface extending downward from the fuselage. It provides additional directional stability and can supplement the vertical stabilizer.

Its functions include:

- Increasing directional stability
- Providing additional vertical surface area
- Improving yaw stability at high angles of attack
- Helping maintain directional control when the main vertical tail becomes less effective

A major disadvantage is that a ventral fin can reduce **ground clearance**, which must be considered during takeoff, landing, and ground operations.

### Conventional Tail

**The conventional tail** consists of a horizontal stabilizer and elevator mounted on the aft portion of the fuselage, together with a vertical stabilizer and rudder.

**Advantages:**

- Simple and well-established configuration
- Relatively straightforward structural design
- Easy maintenance and inspection
- Good overall aerodynamic effectiveness

**Disadvantages:**

- Horizontal tail may be affected by fuselage and wing wake
- Tail surfaces may experience disturbed airflow
- Requires sufficient ground clearance depending on aircraft geometry

### T-Tail

**A T-tail** places the horizontal stabilizer on top of the vertical stabilizer, forming a "T" shape.

```model-card
{
  "title": "T Tail Configuration",
  "src": "../asset/T_tail.glb",
  "alt": "T Tail",
  "controls": true,
  "autoRotate": true,
  "cameraOrbit": "45deg 65deg 2.5m",
  "exposure": 1
}
```

**Advantages:**

- Horizontal tail is positioned above much of the fuselage and wing wake
- Provides good ground clearance for the horizontal tail
- Useful for aircraft with rear-mounted engines
- Can provide favorable airflow at certain flight conditions

**Disadvantages:**

- Heavier vertical stabilizer structure
- Increased structural loads at the vertical tail
- More difficult maintenance access
- Potential for **deep-stall** behavior at high angles of attack

### V-Tail

**A V-tail** combines the functions of the horizontal and vertical tail surfaces into two surfaces arranged in a V configuration.

The control system must combine elevator and rudder commands through **control mixing**.

**Advantages:**

- Fewer tail surfaces
- Potential reduction in wetted area
- Distinct aerodynamic and structural arrangement
- Can reduce the number of separate tail surfaces

**Disadvantages:**

- Requires control mixing
- Pitch and yaw control are coupled
- More complex control-system design
- Aerodynamic interactions between control inputs must be considered

### H-Tail

**An H-tail** uses two vertical stabilizers connected by a horizontal stabilizer, producing an arrangement resembling the letter "H".

**Advantages:**

- Can provide good directional stability
- Useful for aircraft requiring multiple vertical tails
- Can provide redundancy in directional-control surfaces
- Useful where engine, propeller, or fuselage geometry influences tail placement

**Disadvantages:**

- Additional structural weight
- Increased aerodynamic drag
- More components to manufacture and maintain
- More complex structural and aerodynamic interactions

### Tail Configuration Considerations

**Tail configuration affects aircraft stability and controllability** through the size, location, and aerodynamic effectiveness of the horizontal and vertical tail surfaces.

**Stability:** The tail must provide sufficient restoring moments to maintain the desired longitudinal and directional stability characteristics.

**Control:** The tail must provide sufficient control authority for pitch and yaw throughout the aircraft's operating envelope.

**Structural considerations:** Tail configuration influences structural loads, weight, stiffness, and attachment requirements.

**Aerodynamic considerations:** The tail must operate effectively within the airflow around the aircraft. Wake effects, downwash, propeller slipstream, engine exhaust, and fuselage interference can influence tail effectiveness.

**Operational considerations:** The final tail configuration is selected by balancing aerodynamic performance, stability, controllability, structural requirements, weight, manufacturing complexity, and operational requirements.

## Wing Configuration and Construction
### Wing Parameters
### High Wing
### Mid Wing
### Low Wing
### Multi Wing
### Full and Semi Cantilever

## Primary and  Secondary Control Surfaces
### Aeleron, Rudder and Elevator
### Flaps
### Trim Tab, Servo Tab

## PowerPlant Placement and Configuration
## Landing Gear Structure and Configuration



# Aircraft Systems

## ATA Chapters
## Environmental Control System
## Ice and Rain Protection
## Fuel Storage System
## Flight Instruments
## Engine Instruments
## AutoPilot System
## Hydraulic and Pneumatic System



# Engineering Mechanics

## Statics of Rigid Bodies

An object at rest will remain at rest unless acted upon by an outside force.

For a rigid body in equilibrium:

$$\sum \mathbf{F}=0$$

$$\sum M=0$$

Newton's Second Law provides the general relationship between force and acceleration:

$$\mathbf{F}=m\mathbf{a}$$

For statics, acceleration is zero:

$$\mathbf{a}=0$$

Therefore:

$$\sum \mathbf{F}=0$$

### Interactive Resultant Force Vector

Drag the arrowhead to manipulate one force vector directly. Its Cartesian components, magnitude, and angle from the positive X axis update as you move it.

```single-vector-card
{
  "title": "Manipulate a Single Force Vector",
  "subtitle": "Drag the arrowhead to explore force components, magnitude, and direction.",
  "vector": { "x": 50, "y": 35 },
  "limits": { "min": -100, "max": 100, "step": 1 },
  "notes": [
    "Fx and Fy are the projections of the resultant force on the X and Y axes.",
    "The angle is measured counterclockwise from the positive X axis."
  ]
}
```

### Static Free-Body Force System

The physical model below describes a simply supported beam. The card draws the geometry and loads without adding interactive controls or solving reactions.

```force-system-model-card
{
  "type": "force_system",
  "title": "Simply Supported Beam",
  "subtitle": "A point load acts downward at the beam midpoint.",
  "geometry": {
    "points": [
      { "id": "P1", "x": 0, "y": 0 },
      { "id": "P2", "x": 8, "y": 0 },
      { "id": "P3", "x": 4, "y": 0 }
    ],
    "beams": [
      { "id": "B1", "start": "P1", "end": "P2" }
    ]
  },
  "forces": [
    {
      "id": "F1",
      "type": "point",
      "point": "P3",
      "beam": "B1",
      "magnitude": 10,
      "unit": "kN",
      "direction": 270
    }
  ],
  "supports": [
    { "id": "A", "type": "pin", "point": "P1" },
    { "id": "B", "type": "roller", "point": "P2" }
  ]
}
```

The rendered diagram keeps these coordinates for geometry and displays only the support-relative dimensions `a = 4` and `b = 4`.

### Static Loaded Frame

This second static model follows the stepped frame example: a diagonal member, an upper horizontal member, and a short vertical member carry loads in several directions. Coordinates remain available to the model for geometry and future solving, while the rendered card shows beam lengths and force locations.

```force-system-model-card
{
  "type": "force_system",
  "title": "Loaded Stepped Frame",
  "subtitle": "A multi-member frame with vertical and horizontal point loads.",
  "geometry": {
    "points": [
      { "id": "A0", "x": 0, "y": 0 },
      { "id": "B0", "x": 6, "y": 8 },
      { "id": "C0", "x": 11, "y": 8 },
      { "id": "D0", "x": 14, "y": 8 },
      { "id": "E0", "x": 16, "y": 8 },
      { "id": "F0", "x": 16, "y": 4 },
      { "id": "G0", "x": 3, "y": 4 },
      { "id": "H0", "x": 16, "y": 6 }
    ],
    "beams": [
      { "id": "AB", "start": "A0", "end": "B0" },
      { "id": "BC", "start": "B0", "end": "C0" },
      { "id": "CD", "start": "C0", "end": "D0" },
      { "id": "DE", "start": "D0", "end": "E0" },
      { "id": "EF", "start": "E0", "end": "F0" }
    ]
  },
  "forces": [
    {
      "id": "F1",
      "type": "point",
      "point": "G0",
      "beam": "AB",
      "magnitude": 200,
      "unit": "kN",
      "direction": 270
    },
    {
      "id": "F2",
      "type": "point",
      "point": "C0",
      "beam": "BC",
      "magnitude": 50,
      "unit": "kN",
      "direction": 270
    },
    {
      "id": "F3",
      "type": "point",
      "point": "D0",
      "beam": "CD",
      "magnitude": 50,
      "unit": "kN",
      "direction": 90
    },
    {
      "id": "F4",
      "type": "point",
      "point": "H0",
      "beam": "EF",
      "magnitude": 40,
      "unit": "kN",
      "direction": 30
    }
  ],
  "supports": [
    { "id": "A", "type": "pin", "point": "A0" },
    { "id": "B", "type": "roller", "point": "F0" }
  ]
}
```

### Force Components

For a force $F$ acting at an angle $\theta$ measured counterclockwise from the positive X axis:

$$F_x=F\cos\theta$$

$$F_y=F\sin\theta$$

Therefore, the Cartesian representation of the force is:

$$\mathbf{F}=F_x\mathbf{i}+F_y\mathbf{j}$$

or:

$$\mathbf{F}=F\cos\theta\,\mathbf{i}+F\sin\theta\,\mathbf{j}$$

From trigonometry:

$$\sin\theta=\frac{\text{Opposite}}{\text{Hypotenuse}}$$

$$\cos\theta=\frac{\text{Adjacent}}{\text{Hypotenuse}}$$

Therefore:

$$F_y=|F|\sin\theta$$

$$F_x=|F|\cos\theta$$

The magnitude can be recovered from its components:

$$|\mathbf{F}|=\sqrt{F_x^2+F_y^2}$$

and its direction is:

$$\theta=\tan^{-1}\left(\frac{F_y}{F_x}\right)$$

When determining the angle from components, the signs of $F_x$ and $F_y$ determine the quadrant. In computation, 
$$atan2(Fy, Fx)$$
or if expresed in calculator use `SHIFT` `+` to get the `POL` then input the Fx and Fy.
 $$\text{Pol}(\,F_x,\,F_y)$$

### Resultant of Multiple Forces

When several forces act on a rigid body, they can be replaced by a single resultant force having the same translational effect.

For forces:

$$\mathbf{F}_1,\mathbf{F}_2,\mathbf{F}_3,\ldots$$

the resultant is:

$$\mathbf{R}=\sum\mathbf{F}$$

In Cartesian form:

$$R_x=\sum F_x$$

$$R_y=\sum F_y$$

and:

$$|\mathbf{R}|=\sqrt{R_x^2+R_y^2}$$

The direction is:

$$\theta_R=\operatorname{atan2}(R_y,R_x)$$

Instead of dealing with many forces individually, we can combine them into an equivalent resultant force.

### Force Systems: Balanced and Unbalanced Forces

The net force is the vector sum of concurrent vectors, $P$ and $Q$. Adjust their signed components to see how vector addition produces a resultant force and acceleration.

```force-system-card
{
  "title": "Balanced vs. Unbalanced Concurrent Forces",
  "subtitle": "See how force components combine into a resultant force and acceleration.",
  "mass": { "value": 10, "min": 1, "max": 30, "step": 1 },
  "forces": {
    "P": {
      "x": { "value": 50, "min": -100, "max": 100, "step": 1 },
      "y": { "value": 50, "min": -100, "max": 100, "step": 1 }
    },
    "Q": {
      "x": { "value": -50, "min": -100, "max": 100, "step": 1 },
      "y": { "value": -50, "min": -100, "max": 100, "step": 1 }
    }
  },
  "notes": [
    "Balanced forces do not mean that no forces act. Equal and opposite components cancel, giving ΣF = 0.",
    "When the resultant is not zero, the body accelerates in the direction of the net force."
  ]
}
```

For equilibrium:

$$\sum\mathbf{F}=0$$

For an unbalanced force system:

$$\sum\mathbf{F}\neq0$$

Newton's Second Law gives:

$$\sum\mathbf{F}=m\mathbf{a}$$

## Rotation and Translation

A rigid body can experience two fundamental types of motion.

**Translation** — the body moves from one location to another without changing its orientation.

**Rotation** — the body changes its orientation about a point or axis.

A general planar motion can contain both:

$$\text{Motion}=\text{Translation}+\text{Rotation}$$

For translation:

$$\sum\mathbf{F}=m\mathbf{a}$$

For rotation about a fixed point:

$$\sum M=I\alpha$$

where:

- $I$ = mass moment of inertia
- $\alpha$ = angular acceleration

For statics, both linear and angular acceleration are zero:

$$\sum\mathbf{F}=0$$

$$\sum M=0$$

### Moment at Different Points

A force can cause an object to rotate about a point. This rotational tendency is called a **moment**.

For a force $\mathbf{F}$ applied at a position $\mathbf{r}$ relative to point $O$:

$$\mathbf{M}_O=\mathbf{r}\times\mathbf{F}$$

In 2D:

$$M_O=xF_y-yF_x$$

The magnitude can also be expressed using the perpendicular distance from the point to the force's line of action:

$$M=Fd_\perp$$

where $d_\perp$ is the shortest perpendicular distance.

Using the right-hand rule:

- Counterclockwise → positive
- Clockwise → negative

The moment of a force depends on the point about which the moment is calculated:

$$M_A\neq M_B$$

The cross product can be expanded using a determinant:

$$
\mathbf{r}\times\mathbf{F}=
\begin{vmatrix}
\mathbf{i}&\mathbf{j}&\mathbf{k}\\
x&y&z\\
F_x&F_y&F_z
\end{vmatrix}
$$

For 2D problems, the scalar expression is:

$$M_O=xF_y-yF_x$$

### Interactive Moment

Drag the force or its application point and observe how the moment changes as the perpendicular distance changes.

The fundamental relationship is:

$$M=Fd_\perp$$

The card should show the relationship:

**Force → Line of Action → Perpendicular Distance → Moment**

### Reaction Forces

Supports restrict motion and therefore generate reaction forces.

Common 2D supports include:

| Support | Typical reactions |
|---|---|
| Roller | 1 reaction |
| Pin | $A_x$, $A_y$ |
| Fixed support | $A_x$, $A_y$, $M_A$ |

For a body in planar static equilibrium:

$$\sum F_x=0$$

$$\sum F_y=0$$

$$\sum M=0$$

These equations allow unknown support reactions to be determined.

For a simply supported beam:

$$\sum M_A=0$$

$$\sum F_y=0$$

$$\sum F_x=0$$

Supports create constraints; constraints create reactions.

### Types of Loads

Loads describe how external forces are distributed over a structure.

#### Point Load

A force concentrated at a single location:

$$F$$

#### Distributed Load

A force distributed along a length:

$$w(x)$$

For a uniform distributed load:

$$w=\text{constant}$$

The equivalent resultant is:

$$F_R=wL$$

and acts through the centroid of the load distribution.

For a uniformly distributed load, the resultant acts at the midpoint:

$$x_R=\frac{L}{2}$$

Other common loading types include:

- Point moment / couple
- Uniformly distributed load
- Triangular distributed load
- Trapezoidal distributed load

### Couple Moment

A **couple** consists of two equal and opposite parallel forces separated by a distance.

Its resultant force is zero:

$$\sum F=0$$

but it produces a pure moment:

$$M=Fd$$

A key property of a couple is that its moment is independent of the reference point.

Therefore:

$$M_A=M_B$$

for any points $A$ and $B$.

### Shear and Moment Diagram

For beams, internal forces develop to resist external loads.

Two important internal quantities are:

**Shear force**

$$V(x)$$

**Bending moment**

$$M(x)$$

The relationships between load, shear, and moment are:

$$\frac{dV}{dx}=-w(x)$$

$$\frac{dM}{dx}=V(x)$$

Therefore:

$$\frac{d^2M}{dx^2}=-w(x)$$

A concentrated force produces a jump in the shear diagram.

A concentrated moment produces a jump in the moment diagram.

The maximum bending moment commonly occurs where:

$$V(x)=0$$

### Interactive Shear and Moment Diagram

**Load Diagram → Shear Diagram → Moment Diagram**

Allow the user to move or modify external loads and observe how the internal shear force and bending moment diagrams change.

# Mechanics of Deformable Bodies

Unlike rigid-body statics, deformable-body mechanics considers what happens inside the material when external loads are applied.

A loaded body can experience:

- Stress
- Strain
- Deformation
- Shear
- Bending
- Torsion

The central idea is:

> External loads produce internal stresses, which cause deformation.

## Stress and Strain

### Normal Stress

Normal stress occurs when a force acts perpendicular to a cross-sectional area.

$$\sigma=\frac{F}{A}$$

where:

- $\sigma$ = normal stress
- $F$ = axial force
- $A$ = cross-sectional area

Tension produces tensile stress.

Compression produces compressive stress.

### Normal Strain

Strain describes the relative deformation of a material.

$$\epsilon=\frac{\Delta L}{L_0}$$

where:

- $\epsilon$ = normal strain
- $\Delta L$ = change in length
- $L_0$ = original length

Strain is dimensionless.

### Linear Elastic Relationship

Within the elastic region of a material:

$$\sigma=E\epsilon$$

This is **Hooke's Law** for normal stress.

Therefore:

$$E=\frac{\sigma}{\epsilon}$$

where $E$ is Young's modulus.

The fundamental relationship is:

$$\boxed{\sigma\longleftrightarrow\epsilon\longleftrightarrow E}$$

## Shear Stress and Shear Strain

When forces act parallel to a surface, they produce shear stress.

$$\tau=\frac{V}{A}$$

where:

- $\tau$ = shear stress
- $V$ = shear force
- $A$ = area

Shear strain is:

$$\gamma=\frac{\Delta x}{L}$$

For linear elastic behavior:

$$\tau=G\gamma$$

where $G$ is the shear modulus.

## Bending Stress

When a beam bends, normal stresses develop across its cross-section.

The flexure formula is:

$$\sigma=\frac{My}{I}$$

where:

- $\sigma$ = bending stress
- $M$ = internal bending moment
- $y$ = distance from the neutral axis
- $I$ = area moment of inertia

The maximum bending stress occurs at the farthest point from the neutral axis:

$$\sigma_{\max}=\frac{Mc}{I}$$

where $c$ is the maximum distance from the neutral axis.

## Strain Due to Torque

When a shaft is subjected to torque, it experiences torsional deformation.

The torsion relationship for a circular shaft is:

$$\frac{T}{J}=\frac{\tau}{r}=\frac{G\phi}{L}$$

Therefore:

$$\tau=\frac{Tr}{J}$$

and:

$$\phi=\frac{TL}{GJ}$$

where:

- $T$ = torque
- $J$ = polar moment of inertia
- $\tau$ = shear stress
- $r$ = radial distance
- $G$ = shear modulus
- $\phi$ = angle of twist
- $L$ = shaft length

The maximum shear stress occurs at the outer surface:

$$\tau_{\max}=\frac{Tc}{J}$$

where $c$ is the outer radius.



## Dynamics of Rigid Bodies

# Aircraft Design Law
## Design Law Papers

# Rotary Aircraft

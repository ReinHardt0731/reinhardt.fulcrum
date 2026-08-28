# Aircraft Design and Structure
## Aircraft Design Pipeline
## Aircraft Structural Elements
## Tail Design and Configurations
### Stability
### Elevator 
### Rudder
### Conventional
### T Tail
### V Tail
### H Tail
## Wing Design and Configurations
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
or if expresed in calculator use ```SHIFT``` ```+``` to get the ```POL``` then input the Fx and Fy.
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

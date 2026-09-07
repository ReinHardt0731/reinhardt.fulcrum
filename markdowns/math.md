# Algebra
Algebra describes quantities and relationships using numbers, variables, and operations. A variable represents an unknown or changing value.

When solving, preserve equality: every operation performed on one side of an equation must also be performed on the other side.

## Functions
___
A function assigns exactly one output to each allowed input. We write this relationship as $y=f(x)$, where $x$ is the input and $y$ is the output. The domain is the set of allowed inputs; the range is the set of resulting outputs.

The graph of a function shows how the output changes as the input changes. Compare the shape, slope, turning points, and repetition of each family below.

### Linear Functions
A linear function has a constant rate of change:

$$f(x)=mx+b$$

The parameter $m$ is the slope and $b$ is the $y$-intercept. Its graph is a straight line. If $m>0$ the function increases; if $m<0$ it decreases.

```equation-card-static
{
	"title": "Linear Function",
	"subtitle": "A constant slope produces a straight line.",
	"equation": "f(x) = m x + b",
	"variables": [
		{ "symbol": "m", "displaySymbol": "m", "name": "Slope", "description": "Constant change in output for each unit of input.", "value": 1.5, "unit": "" },
		{ "symbol": "b", "displaySymbol": "b", "name": "Y-intercept", "description": "Output when x = 0.", "value": 2, "unit": "" }
	],
	"graph": {
		"expression": "m * x + b",
		"xVariable": "x",
		"xMin": -5,
		"xMax": 5,
		"yMin": -6,
		"yMax": 10,
		"xLabel": "x",
		"yLabel": "f(x)"
	},
	"notes": ["The slope is the same everywhere on the line."]
}
```

### Quadratic Functions
A quadratic function has the form

$$f(x)=a x^2+b x+c$$

Its graph is a parabola. The coefficient $a$ determines whether the parabola opens upward or downward and controls its width. A quadratic can have a turning point called its vertex.

```equation-card-static
{
	"title": "Quadratic Function",
	"subtitle": "A squared input creates a curved graph with a vertex.",
	"equation": "f(x) = a x^2 + b x + c",
	"variables": [
		{ "symbol": "a", "displaySymbol": "a", "name": "Quadratic coefficient", "description": "Controls opening direction and width.", "value": 1, "unit": "" },
		{ "symbol": "b", "displaySymbol": "b", "name": "Linear coefficient", "description": "Shifts the location of the vertex.", "value": -2, "unit": "" },
		{ "symbol": "c", "displaySymbol": "c", "name": "Constant", "description": "Y-intercept of the parabola.", "value": -1, "unit": "" }
	],
	"graph": {
		"expression": "a * x^2 + b * x + c",
		"xVariable": "x",
		"xMin": -4,
		"xMax": 6,
		"yMin": -4,
		"yMax": 20,
		"xLabel": "x",
		"yLabel": "f(x)"
	},
	"notes": ["The vertex is the turning point of the parabola.", "For this example, the vertex is at x = 1."]
}
```

### Trigonometric Functions
Trigonometric functions repeat at regular intervals. A sinusoidal function can be written as

$$f(x)=A\sin(\omega x+\phi)+D$$

The amplitude $|A|$ measures the distance from the midline, $\omega$ controls the period, $\phi$ shifts the graph horizontally, and $D$ shifts the midline vertically.

```equation-card-static
{
	"title": "Trigonometric Function",
	"subtitle": "A sine wave repeats with a fixed amplitude and period.",
	"equation": "f(x) = A sin(\\omega x) + D",
	"variables": [
		{ "symbol": "A", "displaySymbol": "A", "name": "Amplitude", "description": "Distance from the midline to a peak.", "value": 2, "unit": "" },
		{ "symbol": "omega", "displaySymbol": "\\omega", "name": "Angular frequency", "description": "Controls how quickly the wave repeats.", "value": 1, "unit": "rad per unit" },
		{ "symbol": "D", "displaySymbol": "D", "name": "Midline", "description": "Vertical center of the oscillation.", "value": 0, "unit": "" }
	],
	"graph": {
		"expression": "A * sin(omega * x) + D",
		"xVariable": "x",
		"xMin": -6.28,
		"xMax": 6.28,
		"yMin": -3,
		"yMax": 3,
		"xLabel": "x (radians)",
		"yLabel": "f(x)"
	},
	"notes": ["The period is approximately 2 pi / omega.", "The wave oscillates around the midline y = D."]
}
```

### Damped Trigonometric Functions and Stability
A disturbed system can be modeled by an oscillation whose amplitude changes with time:

$$f(t)=A e^{-ct}\cos(\omega t)$$

Here $c$ is the damping coefficient. The sign of $c$ describes the response after a disturbance:

- **Positive damping ($c>0$):** amplitude decreases, so the motion returns toward equilibrium. This is dynamically stable.
- **Neutral damping ($c=0$):** amplitude remains constant, so the motion neither grows nor decays. This is neutral stability.
- **Negative damping ($c<0$):** amplitude increases, so disturbances grow. This is dynamically unstable.

The three static graphs use the same initial disturbance and frequency. Only the sign of $c$ changes, making the stability difference easy to compare.

```equation-card-static
{
	"title": "Positive Damping: Stable",
	"subtitle": "Oscillations decay toward equilibrium after a disturbance.",
	"equation": "f(t) = A e^(-c t) cos(omega t)",
	"variables": [
		{ "symbol": "A", "displaySymbol": "A", "name": "Initial disturbance", "description": "Starting amplitude.", "value": 1, "unit": "" },
		{ "symbol": "c", "displaySymbol": "c > 0", "name": "Damping coefficient", "description": "Positive damping removes energy from the oscillation.", "value": 0.25, "unit": "per time" },
		{ "symbol": "omega", "displaySymbol": "\\omega", "name": "Natural frequency", "description": "Rate of oscillation.", "value": 2, "unit": "rad per time" }
	],
	"graph": { "expression": "A * exp(-c * x) * cos(omega * x)", "xVariable": "x", "xMin": 0, "xMax": 12, "yMin": -1.2, "yMax": 1.2, "xLabel": "time", "yLabel": "disturbance" },
	"notes": ["The envelope is ±A e^(-c t).", "The disturbance becomes smaller with time."]
}
```

```equation-card-static
{
	"title": "Neutral Damping: Neutral Stability",
	"subtitle": "Oscillations continue at constant amplitude.",
	"equation": "f(t) = A e^(-c t) cos(omega t)",
	"variables": [
		{ "symbol": "A", "displaySymbol": "A", "name": "Initial disturbance", "description": "Starting amplitude.", "value": 1, "unit": "" },
		{ "symbol": "c", "displaySymbol": "c = 0", "name": "Damping coefficient", "description": "No energy is added or removed.", "value": 0, "unit": "per time" },
		{ "symbol": "omega", "displaySymbol": "\\omega", "name": "Natural frequency", "description": "Rate of oscillation.", "value": 2, "unit": "rad per time" }
	],
	"graph": { "expression": "A * exp(-c * x) * cos(omega * x)", "xVariable": "x", "xMin": 0, "xMax": 12, "yMin": -1.2, "yMax": 1.2, "xLabel": "time", "yLabel": "disturbance" },
	"notes": ["The envelope remains ±A.", "The system neither returns to rest nor diverges."]
}
```

```equation-card-static
{
	"title": "Negative Damping: Unstable",
	"subtitle": "Oscillations grow after a disturbance.",
	"equation": "f(t) = A e^(-c t) cos(omega t)",
	"variables": [
		{ "symbol": "A", "displaySymbol": "A", "name": "Initial disturbance", "description": "Starting amplitude.", "value": 1, "unit": "" },
		{ "symbol": "c", "displaySymbol": "c < 0", "name": "Damping coefficient", "description": "Negative damping adds energy to the oscillation.", "value": -0.12, "unit": "per time" },
		{ "symbol": "omega", "displaySymbol": "\\omega", "name": "Natural frequency", "description": "Rate of oscillation.", "value": 2, "unit": "rad per time" }
	],
	"graph": { "expression": "A * exp(-c * x) * cos(omega * x)", "xVariable": "x", "xMin": 0, "xMax": 12, "yMin": -5, "yMax": 5, "xLabel": "time", "yLabel": "disturbance" },
	"notes": ["Because c is negative, e^(-c t) grows.", "A growing response indicates dynamic instability."]
}
```

## Power Rule
For exponents, use
$$a^m a^n=a^{m+n}$$
$$\frac{a^m}{a^n}=a^{m-n}$$
$$\left(a^m\right)^n=a^{mn}$$
A negative exponent is a reciprocal: $a^{-n}=1/a^n$. A fractional exponent represents a root: $a^{1/n}=\sqrt[n]{a}$.

## Logarithm Rule
___
The logarithm $\log_b x$ is the exponent needed to produce $x$ from base $b$:
$$\log_b x=y \Longleftrightarrow b^y=x$$
Useful rules include
$$\log_b(MN)=\log_b M+\log_b N$$
$$\log_b\left(\frac{M}{N}\right)=\log_b M-\log_b N$$
$$\log_b(M^p)=p\log_b M$$

## Word Problems
___
Translate the words into equations, define the unknowns, solve, and check the units. A system of linear equations has several equations involving the same unknowns.
For a determined system, the number of independent equations should match the number of unknowns. With two unknowns, aim to build two independent equations. If there are too few equations, several answers may fit. If the equations are dependent, they do not provide new information. After solving, substitute the values back into every original equation.
For motion, the basic relationship is
$$d=rt$$
where $d$ is distance, $r$ is rate, and $t$ is time.

\\
### A rate and time problem
An aircraft travels at $180$ knots for $2.5$ hours. How far does it travel, ignoring wind?
### Solution:
Use $d=rt$:
$$d=(180\text{ knots})(2.5\text{ h})=450\text{ nautical miles}$$
### Answer:
The aircraft travels $450$ nautical miles.
\\

\\
### An age problem
A parent is four times as old as a child. In six years, the parent will be three times as old as the child. Find their present ages.
### Solution:
Let $p$ be the parent’s age and $c$ be the child’s age. There are two unknowns, so we need two independent equations:
$$p=4c$$
$$p+6=3(c+6)$$
Substitute $p=4c$ into the second equation:
$$4c+6=3c+18$$
$$c=12$$
Then
$$p=4(12)=48$$
Check: in six years, the ages are $54$ and $18$, and $54=3(18)$.
### Answer:
The parent is $48$ years old and the child is $12$ years old.
\\

\\
### A work problem
Two workers complete one job in four hours. During a two-hour test, Worker A completes $\frac{1}{6}$ more of the job than Worker B. How long would each worker take alone?
### Solution:
Let $a$ and $b$ be the fractions of the job completed per hour by Workers A and B. The two unknown rates require two equations.
Together they complete the job in four hours:
$$4a+4b=1\Rightarrow a+b=\frac{1}{4}$$
In two hours, A completes $\frac{1}{6}$ more than B:
$$2a-2b=\frac{1}{6}\Rightarrow a-b=\frac{1}{12}$$
Add the equations:
$$2a=\frac{1}{4}+\frac{1}{12}=\frac{1}{3}\Rightarrow a=\frac{1}{6}$$
Then $b=\frac{1}{4}-\frac{1}{6}=\frac{1}{12}$. The time for one job is the reciprocal of the hourly rate.
### Answer:
Worker A takes $6$ hours alone, and Worker B takes $12$ hours alone.
\\
\\
### A mixture problem
How many liters of $20\%$ solution and $50\%$ solution are needed to make $30$ liters of a $30\%$ solution?
### Solution:
Let $x$ be the liters of $20\%$ solution and $y$ be the liters of $50\%$ solution. The volume equation is
$$x+y=30$$
The amount of active substance equation is
$$0.20x+0.50y=0.30(30)=9$$
Multiply by $100$ to remove decimals:
$$20x+50y=900$$
Using $x=30-y$:
$$20(30-y)+50y=900$$
$$600+30y=900\Rightarrow y=10$$
$$x=30-10=20$$
### Answer:
Use $20$ liters of the $20\%$ solution and $10$ liters of the $50\%$ solution.
\\

\\
### Wind: with and against the wind
An aircraft travels $300$ nautical miles with a tailwind in $2$ hours and the same distance against the wind in $3$ hours. Find the aircraft’s still-air speed and the wind speed.
### Solution:
Let $v$ be the still-air speed and $w$ be the wind speed. With the wind, the ground speed is $v+w$; against the wind, it is $v-w$.
Use $d=rt$ for each trip:
$$v+w=\frac{300}{2}=150$$
$$v-w=\frac{300}{3}=100$$
Add the equations:
$$2v=250\Rightarrow v=125$$
Then $w=150-125=25$.
### Answer:
The still-air speed is $125$ knots and the wind speed is $25$ knots.
\\

\\
### Current: with and against the current
A boat travels $48$ km downstream with a current in $2$ hours and returns the same distance upstream in $3$ hours. Find the boat’s speed in still water and the current speed.
### Solution:
Let $b$ be the boat’s still-water speed and $c$ be the current speed. Downstream the speeds add; upstream they subtract:
$$b+c=\frac{48}{2}=24$$
$$b-c=\frac{48}{3}=16$$
Add the equations:
$$2b=40\Rightarrow b=20$$
Then $c=24-20=4$.
### Answer:
The boat travels at $20$ km/h in still water, and the current is $4$ km/h.
\\

## Venn Diagrams, Permutations, Combinations, and Probability
___
A Venn diagram shows how sets overlap. For sets $A$ and $B$, the union contains everything in either set, while the intersection contains values in both sets.

The probability of an event is

$$P(E)=\frac{\text{favorable outcomes}}{\text{possible outcomes}}$$

# Geometry
___
Geometry studies shape, size, position, and the relationships between figures. A useful habit is to sketch the situation, label known values, choose a formula, and check that the units agree.

## Plane Trigonometry
___
In a right triangle, the sides are related to an acute angle $\theta$ by

$$\sin\theta=\frac{\text{opposite}}{\text{hypotenuse}}$$
$$\cos\theta=\frac{\text{adjacent}}{\text{hypotenuse}}$$
$$\tan\theta=\frac{\text{opposite}}{\text{adjacent}}$$

The Pythagorean theorem relates the three sides:
$$a^2+b^2=c^2$$
where $c$ is the hypotenuse, the side opposite the right angle.

\\
### Find a missing side
A right triangle has legs of $6$ m and $8$ m. Find its hypotenuse.
### Solution:
Apply the Pythagorean theorem:
$$c^2=6^2+8^2=36+64=100$$
$$c=\sqrt{100}=10\text{ m}$$
### Answer:
The hypotenuse is $10$ m.
\\

```equation-card
{
	"title": "Slope and Intercept",
	"subtitle": "Change the slope and y-intercept to see how a line moves.",
	"equation": "y = m x + b",
	"variables": [
		{ "symbol": "m", "name": "Slope", "value": 1, "min": -3, "max": 3, "step": 0.25, "unit": "", "interactive": true },
		{ "symbol": "b", "name": "Y-intercept", "value": 0, "min": -5, "max": 5, "step": 0.5, "unit": "", "interactive": true }
	],
	"graph": {
		"expression": "m * x + b",
		"xVariable": "x",
		"xMin": -6,
		"xMax": 6,
		"yMin": -8,
		"yMax": 8,
		"xLabel": "x",
		"yLabel": "y"
	},
	"notes": ["The slope is the change in y for each unit of x.", "The y-intercept is the value of y when x = 0."]
}
```

## Bearings
___
A bearing describes direction as a clockwise angle measured from north. Use three digits when writing a bearing, such as $045^\circ$, $180^\circ$, or $315^\circ$.

For a displacement with distance $d$ and bearing $\beta$, the north and east components are

$$N=d\cos\beta$$
$$E=d\sin\beta$$

The signs of the components indicate the direction: positive north or east and negative south or west.

## Conic Sections
___
Conic sections are curves formed by intersecting a plane with a double cone. The four families are distinguished by their symmetry, number of branches, and eccentricity $e$.

- A **circle** is closed and has one center. Every point is the same distance from the center.
- An **ellipse** is closed and stretched in one direction. The sum of the distances from any point to two foci is constant.
- A **parabola** is open and has one branch. Every point is equally distant from a focus and a directrix.
- A **hyperbola** is open and has two separate branches. The absolute difference of the distances to two foci is constant.

For a general second-degree equation,

$$Ax^2+Bxy+Cy^2+Dx+Ey+F=0$$

the discriminant $B^2-4AC$ helps classify the curve when it is non-degenerate:

$$B^2-4AC<0\Rightarrow\text{ellipse or circle}$$
$$B^2-4AC=0\Rightarrow\text{parabola}$$
$$B^2-4AC>0\Rightarrow\text{hyperbola}$$
---
### Circle
A circle with center $(h,k)$ and radius $r$ has equation

$$\left(x-h\right)^2+\left(y-k\right)^2=r^2$$

It is closed, has no vertices, and has eccentricity $e=0$. Its circumference and area are

$$C=2\pi r$$
$$A=\pi r^2$$
```equation-card-static
{
	"title": "Circle: Center and Radius",
	"subtitle": "A circle is closed and every point is the same distance from its center.",
	"equation": "x^2 + y^2 = r^2",
	"variables": [
		{ "symbol": "r", "displaySymbol": "r", "name": "Radius", "description": "Distance from the center to every point on the circle.", "value": 3, "unit": "units" }
	],
	"graph": {
		"expressions": ["sqrt(r^2 - x^2)", "-sqrt(r^2 - x^2)"],
		"xVariable": "x",
		"xMin": -5,
		"xMax": 5,
		"yMin": -5,
		"yMax": 5,
		"xLabel": "x",
		"yLabel": "y",
		"closeFiniteBranches": true,
		"annotations": [
			{ "type": "point", "x": 0, "y": 0, "label": "Center (0, 0)" },
			{ "type": "point", "x": 3, "y": 0, "label": "Radius r" }
		]
	},
	"notes": ["The renderer plots the upper half; the lower half is its reflection across the x-axis."]
}
```
---
### Ellipse
An ellipse is closed, with a major axis, a minor axis, and two foci. In the horizontal form, $a$ is the semi-major axis and $b$ is the semi-minor axis:

$$\frac{(x-h)^2}{a^2}+\frac{(y-k)^2}{b^2}=1,\qquad a>b>0$$

The focal distance and eccentricity are

$$c^2=a^2-b^2$$
$$e=\frac{c}{a},\qquad 0<e<1$$

The area is

$$A=\pi ab$$

If the vertical axis is the major axis, interchange the positions of $a^2$ and $b^2$ in the denominators.
```equation-card-static
{
	"title": "Ellipse: Foci and Axes",
	"subtitle": "An ellipse is closed, with a major axis and two interior foci.",
	"equation": "x^2 / a^2 + y^2 / b^2 = 1",
	"variables": [
		{ "symbol": "a", "displaySymbol": "a", "name": "Semi-major axis", "description": "Half the length of the major axis.", "value": 4, "unit": "units" },
		{ "symbol": "b", "displaySymbol": "b", "name": "Semi-minor axis", "description": "Half the length of the minor axis.", "value": 2, "unit": "units" },
		{ "symbol": "c", "displaySymbol": "c", "name": "Focal distance", "description": "Distance from the center to either focus.", "value": 3.464, "unit": "units" }
	],
	"graph": {
		"expressions": ["b * sqrt(1 - x^2 / a^2)", "-b * sqrt(1 - x^2 / a^2)"],
		"xVariable": "x",
		"xMin": -5,
		"xMax": 5,
		"yMin": -3,
		"yMax": 3,
		"xLabel": "x",
		"yLabel": "y",
		"closeFiniteBranches": true,
		"annotations": [
			{ "type": "point", "x": 0, "y": 0, "label": "Center" },
			{ "type": "point", "x": 3.464, "y": 0, "label": "Focus" },
			{ "type": "point", "x": 4, "y": 0, "label": "Vertex" },
			{ "type": "line", "orientation": "vertical", "value": 0, "label": "Minor axis" }
		]
	},
	"notes": ["The lower half is the reflection of the plotted upper half.", "The foci are at (±c, 0), where c² = a² - b²."]
}
```
---
### Parabola
A parabola is open and has one axis of symmetry, one vertex, one focus, and one directrix. For a vertical parabola,

$$y=a\left(x-h\right)^2+k$$

where $(h,k)$ is the vertex. The sign of $a$ determines the opening direction: $a>0$ opens upward and $a<0$ opens downward.

The focus-directrix form is

$$\left(x-h\right)^2=4p(y-k)$$

where the focus is $(h,k+p)$ and the directrix is $y=k-p$. A horizontal parabola uses

$$\left(y-k\right)^2=4p(x-h)$$

The parabola has eccentricity $e=1$.
```equation-card-static
{
	"title": "Parabola: Focus and Directrix",
	"subtitle": "A parabola contains points equally distant from a focus and a directrix.",
	"equation": "x^2 = 4 p y",
	"variables": [
		{ "symbol": "p", "displaySymbol": "p", "name": "Focal parameter", "description": "The vertex-to-focus distance is p.", "value": 1, "unit": "units" }
	],
	"graph": {
		"expression": "x^2 / (4 * p)",
		"xVariable": "x",
		"xMin": -4,
		"xMax": 4,
		"yMin": -2,
		"yMax": 5,
		"xLabel": "x",
		"yLabel": "y",
		"closeFiniteBranches": true,
		"annotations": [
			{ "type": "point", "x": 0, "y": 0, "label": "Vertex" },
			{ "type": "point", "x": 0, "y": 1, "label": "Focus (0, p)" },
			{ "type": "line", "orientation": "horizontal", "value": -1, "label": "Directrix y = -p" }
		]
	},
	"notes": ["The graph opens upward because p is positive.", "The directrix is perpendicular to the axis of symmetry."]
}
```

---
### Hyperbola
A hyperbola is open and has two branches. Its horizontal standard form is

$$\frac{(x-h)^2}{a^2}-\frac{(y-k)^2}{b^2}=1$$

The center is $(h,k)$, the vertices are $(h\pm a,k)$, and the foci are $(h\pm c,k)$, where

$$c^2=a^2+b^2$$
$$e=\frac{c}{a}>1$$

The asymptotes show the directions of the branches:

$$y-k=\pm\frac{b}{a}(x-h)$$

For a vertical hyperbola, interchange the positive and negative terms. Its vertices become $(h,k\pm a)$ and its asymptotes are $y-k=\pm\frac{a}{b}(x-h)$.
```equation-card-static
{
	"title": "Hyperbola: Foci and Asymptotes",
	"subtitle": "A hyperbola has two branches that approach, but never meet, its asymptotes.",
	"equation": "x^2 / a^2 - y^2 / b^2 = 1",
	"variables": [
		{ "symbol": "a", "displaySymbol": "a", "name": "Transverse semi-axis", "description": "Center-to-vertex distance.", "value": 2, "unit": "units" },
		{ "symbol": "b", "displaySymbol": "b", "name": "Conjugate semi-axis", "description": "Controls the asymptote slope.", "value": 1, "unit": "units" },
		{ "symbol": "c", "displaySymbol": "c", "name": "Focal distance", "description": "Center-to-focus distance.", "value": 2.236, "unit": "units" }
	],
	"graph": {
		"expressions": ["b * sqrt(x^2 / a^2 - 1)", "-b * sqrt(x^2 / a^2 - 1)"],
		"xVariable": "x",
		"xMin": -5,
		"xMax": 5,
		"yMin": -4,
		"yMax": 4,
		"xLabel": "x",
		"yLabel": "y",
		"closeFiniteBranches": true,
		"annotations": [
			{ "type": "point", "x": 2, "y": 0, "label": "Vertex" },
			{ "type": "point", "x": 2.236, "y": 0, "label": "Focus" },
			{ "type": "line", "orientation": "diagonal", "x1": -5, "y1": -5, "x2": 5, "y2": 5, "label": "Asymptote" },
			{ "type": "line", "orientation": "diagonal", "x1": -5, "y1": 5, "x2": 5, "y2": -5, "label": "Asymptote" }
		]
	},
	"notes": ["The lower branch is the reflection of the plotted upper branch.", "The foci satisfy c² = a² + b², and the asymptotes are y = ±(b/a)x."]
}
```



***
### Conic Comparison Table
The table uses $(h,k)$ for the center or vertex. In ellipse and hyperbola formulas, $a$ is associated with the major or transverse direction.

| Conic | Standard equation | Defining feature | Key formulas |
| --- | --- | --- | --- |
| Circle | $(x-h)^2+(y-k)^2=r^2$ | Closed curve; every point is distance $r$ from the center | $C=2\pi r$; $A=\pi r^2$; $e=0$ |
| Ellipse | $\frac{(x-h)^2}{a^2}+\frac{(y-k)^2}{b^2}=1$ | Closed curve; sum of distances to two foci is constant | $c^2=a^2-b^2$; $e=c/a$; $A=\pi ab$ |
| Parabola | $(x-h)^2=4p(y-k)$ | Each point is equally distant from a focus and a directrix | Focus $(h,k+p)$; directrix $y=k-p$; $e=1$ |
| Hyperbola | $\frac{(x-h)^2}{a^2}-\frac{(y-k)^2}{b^2}=1$ | Two branches; difference of distances to two foci is constant | $c^2=a^2+b^2$; $e=c/a$; asymptotes $y-k=\pm(b/a)(x-h)$ |

### Interactive Eccentricity Explorer
For an ellipse with semi-major axis $a$, eccentricity controls the semi-minor axis:

$$b=a\sqrt{1-e^2}$$

When $e=0$, the ellipse is a circle. As $e$ approaches $1$, the ellipse becomes flatter. For $e>1$, the conic changes to a hyperbola, using $b=a\sqrt{e^2-1}$. The horizontal grid is intentionally denser so the change in vertical scale is easier to read.

```equation-card
{
	"title": "Eccentricity Explorer",
	"subtitle": "Move eccentricity through 1 to compare an ellipse, the transition, and a hyperbola.",
	"equation": "e <= 1: x^2 / a^2 + y^2 / b^2 = 1;  e >= 1: x^2 / a^2 - y^2 / b^2 = 1",
	"variables": [
		{ "symbol": "a", "name": "Semi-major axis", "value": 4, "min": 2, "max": 5, "step": 0.5, "unit": "units", "interactive": true },
		{ "symbol": "e", "name": "Eccentricity", "value": 0, "min": 0, "max": 1.75, "step": 0.05, "unit": "", "interactive": true }
	],
	"graph": {
		"expressions": [
			{ "expression": "a * sqrt(1 - e^2) * sqrt(1 - x^2 / a^2)", "when": { "e": { "max": 0.999 } } },
			{ "expression": "-a * sqrt(1 - e^2) * sqrt(1 - x^2 / a^2)", "when": { "e": { "max": 0.999 } } },
			{ "expression": "x^2 / (2 * a)", "when": { "e": 1 } },
			{ "expression": "a * sqrt(e^2 - 1) * sqrt(x^2 / a^2 - 1)", "when": { "e": { "min": 1.001 } } },
			{ "expression": "-a * sqrt(e^2 - 1) * sqrt(x^2 / a^2 - 1)", "when": { "e": { "min": 1.001 } } }
		],
		"xVariable": "x",
		"xMin": -6,
		"xMax": 6,
		"yMin": -6,
		"yMax": 6,
		"yTickTarget": 14,
		"xLabel": "x",
		"yLabel": "y",
		"closeFiniteBranches": true,
		"annotations": [
			{ "type": "point", "x": 0, "y": 0, "label": "Center" },
			{ "type": "line", "orientation": "vertical", "value": 0, "label": "Minor axis" }
		]
	},
	"notes": ["For e < 1, the graph is an ellipse; at e = 0 it is a circle.", "For e > 1, the graph is a hyperbola and c = ae."]
}
```

## Polygons
A polygon is a closed plane figure made from line segments. The sum of the interior angles of an $n$-sided polygon is
$$S=(n-2)180^\circ$$
For a regular polygon, each interior angle is
$$\frac{(n-2)180^\circ}{n}$$
The area of a rectangle is $A=lw$, the area of a triangle is $A=\frac{1}{2}bh$, and the area of a parallelogram is $A=bh$.

# Differential and Integral Calculus
Calculus studies change and accumulation. Differential calculus measures instantaneous change, while integral calculus adds small quantities to find totals such as area, distance, and volume.

## Limits and Continuity
A limit describes the value that a function approaches as the input approaches a point:

$$\lim_{x\to a}f(x)=L$$

A function is continuous at $x=a$ when $f(a)$ exists, the limit exists, and the limit equals $f(a)$. For polynomials, direct substitution can usually be used to evaluate limits.

## Rules of Derivative
The derivative gives the instantaneous rate of change or the slope of a curve. From first principles,

$$f'(x)=\lim_{h\to0}\frac{f(x+h)-f(x)}{h}$$

Important rules include

$$\frac{d}{dx}(c)=0$$
$$\frac{d}{dx}(x^n)=nx^{n-1}$$
$$\frac{d}{dx}[cf(x)]=cf'(x)$$
$$\frac{d}{dx}[f(x)+g(x)]=f'(x)+g'(x)$$

The product and quotient rules are

$$\frac{d}{dx}[uv]=u'v+uv'$$
$$\frac{d}{dx}\left[\frac{u}{v}\right]=\frac{u'v-uv'}{v^2}$$

The chain rule handles a function inside another function:

$$\frac{d}{dx}f(g(x))=f'(g(x))g'(x)$$

\\
### Differentiate a polynomial
Find the derivative of $f(x)=4x^3-5x^2+7x-2$.

### Solution:
Differentiate each term using the power rule:

$$f'(x)=12x^2-10x+7$$

The constant $-2$ has derivative zero.

### Answer:
$$f'(x)=12x^2-10x+7$$
\\

```equation-card
{
	"title": "Quadratic Derivative",
	"subtitle": "Adjust the quadratic coefficient and observe the derivative line.",
	"equation": "f'(x) = 2 a x",
	"variables": [
		{ "symbol": "a", "name": "Quadratic coefficient", "value": 1, "min": -2, "max": 2, "step": 0.25, "unit": "", "interactive": true }
	],
	"graph": {
		"expression": "2 * a * x",
		"xVariable": "x",
		"xMin": -5,
		"xMax": 5,
		"yMin": -10,
		"yMax": 10,
		"xLabel": "x",
		"yLabel": "f'(x)"
	},
	"notes": ["For f(x) = a x^2, the derivative is f'(x) = 2 a x.", "The derivative is zero at the vertex x = 0."]
}
```

## Maxima and Minima
Critical points occur where $f'(x)=0$ or where the derivative is undefined. A local maximum changes from increasing to decreasing. A local minimum changes from decreasing to increasing.

The second derivative can help classify a critical point:

$$f''(x)>0\Rightarrow\text{local minimum}$$
$$f''(x)<0\Rightarrow\text{local maximum}$$

\\
### Find a local minimum
Find the minimum of $f(x)=x^2-6x+11$.

### Solution:
Differentiate and set the derivative equal to zero:

$$f'(x)=2x-6$$
$$2x-6=0\Rightarrow x=3$$

Since $f''(x)=2>0$, the point is a minimum. Evaluate the function:

$$f(3)=3^2-6(3)+11=2$$

### Answer:
The minimum occurs at $(3,2)$.
\\

## Time Rates and Related Rates
Related-rates problems connect quantities that change with time. Write an equation relating the variables, differentiate both sides with respect to time, substitute known values, and solve for the required rate.

For a circle, $A=\pi r^2$. Differentiating with respect to time gives

$$\frac{dA}{dt}=2\pi r\frac{dr}{dt}$$

Units matter: $dr/dt$ may be measured in m/s, while $dA/dt$ is measured in m$^2$/s.

## Antiderivatives and Indefinite Integrals
An antiderivative $F(x)$ of $f(x)$ satisfies $F'(x)=f(x)$. The indefinite integral includes an arbitrary constant:

$$\int f(x)\,dx=F(x)+C$$

For powers other than $n=-1$,

$$\int x^n\,dx=\frac{x^{n+1}}{n+1}+C$$

\\
### Integrate a polynomial
Find $\int(6x^2-4x+3)\,dx$.

### Solution:
Integrate term by term:

$$\int(6x^2-4x+3)\,dx=2x^3-2x^2+3x+C$$

Differentiate the result to check:

$$\frac{d}{dx}(2x^3-2x^2+3x+C)=6x^2-4x+3$$

### Answer:
$$2x^3-2x^2+3x+C$$
\\

## Definite Integrals and Area
A definite integral accumulates values between two limits:

$$\int_a^b f(x)\,dx=F(b)-F(a)$$

When $f(x)$ is non-negative on $[a,b]$, the result is the area under the curve. Signed area below the $x$-axis is counted as negative.

```equation-card
{
	"title": "Quadratic Accumulation",
	"subtitle": "Change the coefficient to compare quadratic growth.",
	"equation": "F(x) = c x^3 / 3",
	"variables": [
		{ "symbol": "c", "name": "Coefficient", "value": 1, "min": 0.5, "max": 3, "step": 0.5, "unit": "", "interactive": true }
	],
	"graph": {
		"expression": "c * x^2",
		"xVariable": "x",
		"xMin": 0,
		"xMax": 5,
		"yMin": 0,
		"yMax": 25,
		"xLabel": "x",
		"yLabel": "y"
	},
	"notes": ["The antiderivative of c x^2 is c x^3 / 3.", "The graph shows the function being accumulated."]
}
```

# Differential Equations
A differential equation relates an unknown function to one or more of its derivatives. The order is the highest derivative that appears. A first-order equation contains $y'$, while a second-order equation may contain $y''$.

The general solution contains arbitrary constants. An initial condition, such as $y(0)=y_0$, selects one particular solution.

## Separable Equations
A first-order equation is separable when it can be written as

$$\frac{dy}{dx}=g(x)h(y)$$

Rearrange the variables and integrate both sides:

$$\frac{1}{h(y)}\,dy=g(x)\,dx$$
$$\int\frac{1}{h(y)}\,dy=\int g(x)\,dx$$

Use the initial condition after integrating to determine the constant.

\\
### Solve a separable equation
Solve $\frac{dy}{dx}=2x$ given $y(0)=3$.

### Solution:
Integrate both sides:

$$dy=2x\,dx$$
$$y=x^2+C$$

Apply $y(0)=3$:

$$3=0^2+C\Rightarrow C=3$$

### Answer:
$$y=x^2+3$$
\\

## Exponential Growth and Decay
If the rate of change is proportional to the amount present, the model is

$$\frac{dy}{dt}=ky$$

where $k$ is the proportionality constant. Its solution is

$$y(t)=y_0e^{kt}$$

For $k>0$ the quantity grows; for $k<0$ it decays. The doubling time for growth is $T_2=\ln(2)/k$, and the half-life for decay is $T_{1/2}=\ln(2)/|k|$.

```equation-card
{
	"title": "Exponential Growth and Decay",
	"subtitle": "Adjust the rate constant to compare growth and decay curves.",
	"equation": "y(t) = y_0 e^(k t)",
	"variables": [
		{ "symbol": "y0", "name": "Initial amount", "value": 10, "min": 5, "max": 20, "step": 1, "unit": "", "interactive": true },
		{ "symbol": "k", "name": "Rate constant", "value": 0.2, "min": -0.4, "max": 0.4, "step": 0.05, "unit": "", "interactive": true }
	],
	"graph": {
		"expression": "y0 * exp(k * x)",
		"xVariable": "x",
		"xMin": 0,
		"xMax": 10,
		"yMin": 0,
		"yMax": 90,
		"xLabel": "t",
		"yLabel": "y(t)"
	},
	"notes": ["Positive k produces growth and negative k produces decay.", "The initial value is y(0) = y0."]
}
```

## First-Order Linear Equations
A first-order linear equation has the form

$$\frac{dy}{dx}+P(x)y=Q(x)$$

The integrating factor is

$$\mu(x)=e^{\int P(x)\,dx}$$

Multiplying the equation by $\mu(x)$ converts the left side into the derivative of $\mu(x)y$. Integrate, then apply any initial condition.

## Second-Order Equations
A common second-order homogeneous equation with constant coefficients is

$$ay''+by'+cy=0$$

Try $y=e^{rx}$ to obtain the characteristic equation

$$ar^2+br+c=0$$

For two distinct real roots $r_1$ and $r_2$,

$$y=C_1e^{r_1x}+C_2e^{r_2x}$$

Repeated or complex roots produce different but related forms involving $xe^{rx}$, sine, and cosine.

\\
### Solve a second-order equation
Find the general solution of $y''-5y'+6y=0$.

### Solution:
Form the characteristic equation:

$$r^2-5r+6=0$$
$$(r-2)(r-3)=0$$

The roots are $r_1=2$ and $r_2=3$. Therefore the general solution is

$$y=C_1e^{2x}+C_2e^{3x}$$

### Answer:
$$y=C_1e^{2x}+C_2e^{3x}$$
\\

## Modeling and Checking Solutions
Choose variables with clear units, state assumptions, and interpret the constants. Verify a proposed solution by differentiating it and substituting it back into the original equation. Check the initial condition separately; satisfying the differential equation alone does not select a unique solution.
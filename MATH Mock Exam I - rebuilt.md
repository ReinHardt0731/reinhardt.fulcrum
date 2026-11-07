# Mathematics Mock Exam I - Rebuilt Questions and Worked Answers

Questions and answer choices are reconstructed from `MATH Mock Exam I.md`. Answer keys and worked explanations are retained from `MATH Mock I.md`.

> The source reviewer contains corrections to Q39's answer choices. The original question choices are preserved below, and the discrepancy is flagged with that item.

## Answer Key

| # | Ans | # | Ans | # | Ans | # | Ans | # | Ans |
|---|---|---|---|---|---|---|---|---|---|
| 1 | B | 11 | B | 21 | B | 31 | A | 41 | D |
| 2 | B | 12 | D | 22 | D | 32 | A | 42 | B |
| 3 | D | 13 | D | 23 | A | 33 | C | 43 | D |
| 4 | D | 14 | C | 24 | A | 34 | D | 44 | A |
| 5 | B | 15 | C | 25 | C | 35 | C | 45 | C |
| 6 | C | 16 | A | 26 | B | 36 | C | 46 | B |
| 7 | A | 17 | A | 27 | D | 37 | C | 47 | B |
| 8 | D | 18 | B | 28 | A | 38 | B | 48 | B |
| 9 | D | 19 | B | 29 | B | 39 | B | 49 | A |
| 10 | D | 20 | D | 30 | C | 40 | B | 50 | B |

## 1. Question

Differentiate \( -\cos x \).

- **A.** −sin(x)
- **B.** tan(x)cos(x)
- **C.** sin(x)cos(x)
- **D.** sec(x)sin²(x)

### Answer and explanation

**Answer: B. tan(x) cos(x).**

$$\frac{d}{dx}(-\cos x)=\sin x$$

$$\tan x\cos x=\frac{\sin x}{\cos x}\cos x=\sin x$$

Why the other choices are incorrect:
- −sin(x) → That is the derivative of cos x.
- sin(x) cos(x) → An extra cos x factor.
- sec(x) sin²(x) → Equals sin x tan x, not sin x.

Differentiate Similar Concepts:
- d/dx(sin x) → cos x.
- d/dx(cos x) → −sin x.
- d/dx(−cos x) → +sin x.

💡 Memory Hook:
Two minuses make a plus.

🎯 Board Tip:
Simplify each trig choice to sin and cos before comparing.

---

---

## 2. Question

The biomass in an algae bioreactor used to produce oxygen for a closed-loop spacecraft life-support system is modeled by \(M(t)=Ae^{0.25t}\), where \(t\) is measured in days and \(A\) is the initial biomass. How long will it take for the biomass to double?

- **A.** 1.73 days
- **B.** 2.77 days
- **C.** 3.50 days
- **D.** 4.13 days

### Answer and explanation

**Answer: B. 2.77 days.**

$$2A=Ae^{0.25t}$$

$$t=\frac{\ln 2}{0.25}=2.77\ \text{days}$$

Why the other choices are incorrect:
- 1.73 days → Uses a rate of 0.4 instead of 0.25.
- 3.50 / 4.13 days → Wrong rate or forgetting the natural log.

Differentiate Similar Concepts:
- Doubling time → ln 2 / k.
- Half-life → ln 2 / |k|.

💡 Memory Hook:
Double means ln 2 over the rate.

🎯 Board Tip:
A cancels, so the initial amount does not matter.

---

---

## 3. Question

Find the Laplace transform of \(t^2+4t-5\).

- **A.** (2 − 4s + 5s²)/s³
- **B.** (2 + 4s + 5s²)/s³
- **C.** (2 − 4s − 5s²)/s³
- **D.** (2 + 4s − 5s²)/s³

### Answer and explanation

**Answer: D. (2 + 4s − 5s²) / s³.**

$$\mathcal{L}\{t^n\}=\frac{n!}{s^{n+1}},\qquad \mathcal{L}\{1\}=\frac{1}{s}$$

$$\mathcal{L}\{t^2+4t-5\}=\frac{2}{s^3}+\frac{4}{s^2}-\frac{5}{s}=\frac{2+4s-5s^2}{s^3}$$

Why the other choices are incorrect:
- A, B, C → Sign errors on the 4s or −5s² terms.

Differentiate Similar Concepts:
- L{t²} → 2/s³.
- L{t} → 1/s².
- L{1} → 1/s.

💡 Memory Hook:
n factorial over s to the n plus 1.

🎯 Board Tip:
Put everything over s³ and watch the signs.

---

---

## 4. Question

Alexis can complete a job in \(x+2\) days, and Bianca can complete the same job in \(x^2-4\) days. How many days will they take to complete the job if they work together?

- **A.** x + y/xy
- **B.** x − 2/x²
- **C.** (x² − x − 2)/(x² + x + 2)
- **D.** (x² − 4)/(x − 1)

### Answer and explanation

**Answer: D. (x² − 4)/(x − 1).**

$$\text{Rate together}=\frac{1}{x+2}+\frac{1}{x^2-4}=\frac{(x-2)+1}{(x+2)(x-2)}=\frac{x-1}{x^2-4}$$

$$\text{Time}=\frac{x^2-4}{x-1}$$

Why the other choices are incorrect:
- A, B, C → Add the times instead of the rates, or mis-simplify.

Differentiate Similar Concepts:
- Rates add → 1/A + 1/B.
- Times do not add.

💡 Memory Hook:
Add the rates, flip for the time.

🎯 Board Tip:
Factor x² − 4 = (x + 2)(x − 2) for the common denominator.

---

---

## 5. Question

The arithmetic mean of six numbers is 17. After two numbers are added, the mean of all eight numbers is 19. If the two added numbers differ by 4, what are they?

- **A.** 21, 25
- **B.** 23, 27
- **C.** 8, 12
- **D.** 16, 20

### Answer and explanation

**Answer: B. 23, 27.**

$$\text{Sum of 6 numbers}=6(17)=102$$

$$\text{Sum of 8 numbers}=8(19)=152$$

$$a+b=152-102=50,\qquad b-a=4\;\Rightarrow\;a=23,\ b=27$$

Why the other choices are incorrect:
- 21, 25 → Sum is 46.
- 8, 12 → Sum is 20.
- 16, 20 → Sum is 36.

Differentiate Similar Concepts:
- Mean → Sum divided by count.
- New mean → New sum divided by the new count.

💡 Memory Hook:
Mean times count gives the sum.

🎯 Board Tip:
Check that the pair sums to 50 first.

---

---

## 6. Question

Find the area enclosed by the line \(y=x-1\) and the parabola \(y^2=2x+6\).

- **A.** 12 sq. units
- **B.** 15 sq. units
- **C.** 18 sq. units
- **D.** 24 sq. units

### Answer and explanation

**Answer: C. 18 sq. units.**

Intersection (write x in terms of y):

$$x=y+1,\qquad y^2=2(y+1)+6\;\Rightarrow\;y^2-2y-8=0\;\Rightarrow\;y=-2,\ 4$$

$$A=\int_{-2}^{4}\left[(y+1)-\frac{y^2-6}{2}\right]dy=\int_{-2}^{4}\left(y+4-\frac{y^2}{2}\right)dy$$

$$A=\left[\frac{y^2}{2}+4y-\frac{y^3}{6}\right]_{-2}^{4}=13.33+4.67=18$$

Why the other choices are incorrect:
- 12 / 15 / 24 → Wrong limits or integrating in x with a single curve.

Differentiate Similar Concepts:
- Horizontal strips (dy) → Best when the region is bounded by sideways parabolas.
- Vertical strips (dx) → Need a split at x = −3 and x = −1.

💡 Memory Hook:
Sideways parabola, integrate in y.

🎯 Board Tip:
Find the intersections before setting up the integral.

---

---

## 7. Question

An aviation-parts distributor records three transactions involving bushings \((x)\), seals \((y)\), and washers \((w)\). Returns are represented by negative values. The transactions are \(3x-2y+w=11\), \(x+5y-2w=-9\), and \(2x+y-3w=-6\). What is the value of \(w\), the value of one washer?

- **A.** 3
- **B.** 2
- **C.** 4
- **D.** −2

### Answer and explanation

**Answer: A. 3.**

From Order 1, w = 11 − 3x + 2y. Substituting into the other two:

$$7x+y=13$$

$$11x-5y=27$$

$$x=2,\quad y=-1,\quad w=11-6-2=3$$

Check Order 2: 2 − 5 − 6 = −9 ✓. Check Order 3: 4 − 1 − 9 = −6 ✓.

Why the other choices are incorrect:
- 2, 4, −2 → Fail Order 1, 2 or 3 when substituted.

Differentiate Similar Concepts:
- Elimination → Remove one variable at a time.
- Cramer's rule → Same result using determinants.

💡 Memory Hook:
Solve for the easy variable, then substitute.

🎯 Board Tip:
Always plug the answer back into all three equations.

---

---

## 8. Question

A velocity field is defined by \(u=\frac{y}{x^2+y^2}\) and \(v=-\frac{x}{x^2+y^2}\), where \(u\) and \(v\) are the horizontal and vertical velocity components. A streamline has slope \(\frac{dy}{dx}=\frac vu\). Which equation describes the streamline through \((0,5)\)?

- **A.** x² − y² = 25
- **B.** x² + y² = 5
- **C.** x² − y² = 5
- **D.** x² + y² = 25

### Answer and explanation

**Answer: D. x² + y² = 25.**

$$\frac{dy}{dx}=\frac{v}{u}=\frac{-x}{y}\;\Rightarrow\;y\,dy=-x\,dx\;\Rightarrow\;x^2+y^2=C$$

$$C=0^2+5^2=25$$

Why the other choices are incorrect:
- x² − y² = 25 / x² − y² = 5 → Sign error when integrating.
- x² + y² = 5 → Forgot to square the 5.

Differentiate Similar Concepts:
- Streamline → Tangent to the velocity, so dy/dx = v/u.
- Vortex flow → Circular streamlines.

💡 Memory Hook:
Slope v over u, separate, integrate.

🎯 Board Tip:
This is a vortex, so the streamlines are circles about the origin.

---

---

## 9. Question

A curve has a first derivative that is a nonconstant linear function of \(x\). Which type of curve can it represent?

- **A.** Circle
- **B.** Straight Line
- **C.** Hyperbola
- **D.** Parabola

### Answer and explanation

**Answer: D. Parabola.**

If y′ = mx + b with m ≠ 0, then integrating gives a quadratic in x, which is a parabola.

$$y=\tfrac{m}{2}x^2+bx+c$$

Why the other choices are incorrect:
- Straight line → The derivative of a line is constant.
- Circle / Hyperbola → Derivatives are not linear in x.

Differentiate Similar Concepts:
- Constant first derivative → Line.
- Linear first derivative → Parabola.

💡 Memory Hook:
Linear slope, quadratic curve.

🎯 Board Tip:
Integrate once and look at the degree.

---

---

## 10. Question

The parents' ages currently sum to twice the sum of their children's ages. Five years ago, the parents' age sum was three times the children's age sum. In 20 years, the two sums will be equal. How many children are there?

- **A.** 3
- **B.** 4
- **C.** 5
- **D.** 6

### Answer and explanation

**Answer: D. 6.**

Let P be the parents' age sum (2 parents), C the children's sum, n the number of children.

$$P=2C$$

$$\text{5 years ago: } P-10=3(C-5n)$$

$$\text{20 years hence: } P+40=C+20n$$

$$2C-10=3C-15n\;\Rightarrow\;C=15n-10$$

$$2C+40=C+20n\;\Rightarrow\;C=20n-40$$

$$15n-10=20n-40\;\Rightarrow\;n=6$$

Why the other choices are incorrect:
- 3, 4, 5 → Do not satisfy both conditions.

Differentiate Similar Concepts:
- Age sums → Change by the count of people × years.
- Single age → Changes by years only.

💡 Memory Hook:
Each person adds the years.

🎯 Board Tip:
Parents change by 2 × years, children by n × years.

---

---

## 11. Question

Evaluate the following determinant and call its value \(x\):

```latex
x = \begin{vmatrix} 4 & -1 & 2 & 3 \\ 2 & 0 & 2 & 1 \\ 10 & 3 & 0 & 1 \\ 14 & 2 & 4 & 5 \end{vmatrix}
```

- **A.** −32
- **B.** −28
- **C.** 16
- **D.** 52

### Answer and explanation

**Answer: B. −28.**

Use row 2 (which has a 1 in column 4) to clear column 4: R1 − 3R2, R3 − R2, R4 − 5R2. Then expand along column 4.

$$x=\begin{vmatrix}-2&-1&-4\\8&3&-2\\4&2&-6\end{vmatrix}$$

$$x=-2(-18+4)+1(-48+8)-4(16-12)=28-40-16=-28$$

Why the other choices are incorrect:
- −32 / 16 / 52 → Sign errors in the cofactor expansion.

Differentiate Similar Concepts:
- Row operations (adding multiples) → Do not change the determinant.
- Row swaps → Change the sign.

💡 Memory Hook:
Zero out a column, then expand.

🎯 Board Tip:
Cofactor sign is (−1)^(i+j). Here it is + for position (2, 4).

---

---

## 12. Question

The bearing of A from B is N 30 degrees W. What is the bearing of B from A?

- **A.** E 30 deg S
- **B.** S 30 deg W
- **C.** N 30 deg W
- **D.** S 30 deg E

### Answer and explanation

**Answer: D. S 30° E.**

The reverse bearing swaps both letters (N ↔ S and W ↔ E) and keeps the angle.

Why the other choices are incorrect:
- E 30° S → Wrong reference direction.
- S 30° W → Only one letter swapped.
- N 30° W → The same as the given bearing.

Differentiate Similar Concepts:
- Bearing of A from B → Direction from B to A.
- Bearing of B from A → The reverse direction.

💡 Memory Hook:
Flip both letters.

🎯 Board Tip:
Draw the two points and check the sign of each component.

---

---

## 13. Question

Two concurrent forces act at the origin. A force of 800 lb points into the first quadrant, 40 degrees clockwise from the positive \(y\)-axis. A force of 500 lb points into the fourth quadrant, 35 degrees below the positive \(x\)-axis. Find the magnitude of their resultant and its direction measured counterclockwise from the positive \(x\)-axis.

- **A.** R = 980 lb, θ = 35.6 degrees
- **B.** R = 1,120 lb, θ = 54.3 degrees
- **C.** R = 1120 lb, θ = 70.6 degrees
- **D.** R = 980 lb, θ = 19.4 degrees

### Answer and explanation

**Answer: D. R = 980 lb, θ = 19.4°.**

$$R_x=800\sin 40^\circ+500\cos 35^\circ=514.2+409.6=923.8\ \text{lb}$$

$$R_y=800\cos 40^\circ-500\sin 35^\circ=612.8-286.8=326.0\ \text{lb}$$

$$R=\sqrt{923.8^2+326.0^2}=979.6\approx 980\ \text{lb}$$

$$\theta=\tan^{-1}\!\left(\frac{326.0}{923.8}\right)=19.4^\circ$$

Why the other choices are incorrect:
- R = 980, θ = 35.6° → Right magnitude, but the wrong angle.
- R = 1,120 lb (54.3° / 70.6°) → Wrong components or the wrong F₁ angle reference.

Differentiate Similar Concepts:
- Angle from +y → x uses sin, y uses cos.
- Angle from +x → x uses cos, y uses sin.

💡 Memory Hook:
Check which axis the angle is measured from.

🎯 Board Tip:
Sketch the forces, then sum the components.

---

---

## 14. Question

A box contains 10 screws, including 4 defective screws. Two screws are selected at random without replacement. What is the probability that neither selected screw is defective?

- **A.** 13%
- **B.** 27%
- **C.** 33%
- **D.** 56%

### Answer and explanation

**Answer: C. 33%.**

$$P=\frac{6}{10}\cdot\frac{5}{9}=\frac{30}{90}=\frac{1}{3}\approx 33\%$$

Why the other choices are incorrect:
- 13% → That is the probability that both are defective (4/10 · 3/9 = 12/90).
- 27% / 56% → Mixes up "neither", "both" and "at least one".

Differentiate Similar Concepts:
- Without replacement → Denominator drops each draw.
- With replacement → Same denominator each time.

💡 Memory Hook:
Good, then good again, with one fewer.

🎯 Board Tip:
Write the event in words first: "neither" means both are good.

---

---

## 15. Question

A spherical triangle has angles \(A=93\text{ degrees }40\text{ minutes}\), \(B=64\text{ degrees }12\text{ minutes}\), and \(C=116\text{ degrees }51\text{ minutes}\), and an area of 16,531 m^2. What is the radius of the sphere?

- **A.** 100 km
- **B.** 254 cm
- **C.** 328 ft
- **D.** 10 m

### Answer and explanation

**Answer: C. 328 ft.**

$$E=A+B+C-180^\circ=274^\circ43'-180^\circ=94^\circ43'=94.717^\circ$$

$$\text{Area}=\frac{\pi R^2E}{180^\circ}\;\Rightarrow\;R^2=\frac{180(16{,}531)}{\pi(94.717)}\approx 10{,}000$$

$$R=100\ \text{m}=328\ \text{ft}$$

Why the other choices are incorrect:
- 100 km → Wrong unit.
- 254 cm / 10 m → Wrong magnitude.

Differentiate Similar Concepts:
- Spherical excess → E = A + B + C − 180°.
- Plane triangle → Angles sum to exactly 180°.

💡 Memory Hook:
Excess is the angle sum minus 180°.

🎯 Board Tip:
100 m is also 328 ft. Check the unit in the answer.

---

---

## 16. Question

A triangle has side lengths 9 cm, 11 cm, and 15 cm. Find its area.

- **A.** 49.16 sq. cm
- **B.** 24.58 sq. cm
- **C.** 11.75 sq. cm
- **D.** 660.9 sq. cm

### Answer and explanation

**Answer: A. 49.16 sq. cm.**

$$s=\frac{9+11+15}{2}=17.5$$

$$A=\sqrt{s(s-a)(s-b)(s-c)}=\sqrt{17.5(8.5)(6.5)(2.5)}=49.16\ \text{cm}^2$$

Why the other choices are incorrect:
- 24.58 → Half of the answer (used ½ with Heron's formula).
- 11.75 / 660.9 → Wrong formula or arithmetic.

Differentiate Similar Concepts:
- Heron's formula → Three sides known.
- ½ab sin C → Two sides and the included angle.

💡 Memory Hook:
s is half the perimeter.

🎯 Board Tip:
Heron's formula has no extra ½.

---

---

## 17. Question

A steel ball is fired vertically upward at 80 m/s. A second ball is fired from the same point 5 seconds later. What initial velocity must the second ball have for the balls to meet 150 m above the ground?

- **A.** 61.3 m/s
- **B.** 56.2 m/s
- **C.** 45.1 m/s
- **D.** 65.4 m/s

### Answer and explanation

**Answer: A. 61.3 m/s.**

First ball reaches 150 m twice (going up, then coming down):

$$150=80t-4.9t^2\;\Rightarrow\;t=2.16\ \text{s or }14.17\ \text{s}$$

The second ball is shot at t = 5 s, so the meeting is at t = 14.17 s (first ball falling). The second ball travels for:

$$t_2=14.17-5=9.17\ \text{s}$$

$$150=v_0t_2-4.9t_2^2\;\Rightarrow\;v_0=\frac{150+4.9(9.17)^2}{9.17}=61.3\ \text{m/s}$$

Why the other choices are incorrect:
- 56.2 / 45.1 / 65.4 m/s → Use the wrong meeting time (for example t = 2.16 s, which is before the second ball is fired).

Differentiate Similar Concepts:
- Two roots → Up and down passes at the same height.
- Time offset → Subtract the delay from the second ball's flight time.

💡 Memory Hook:
Second ball catches the first on its way down.

🎯 Board Tip:
Reject the root that occurs before the second ball is launched.

---

---

## 18. Question

Write the cosine term \(10\cos(40\pi t)\) in exponential form.

- **A.** 5e^(j40(π)t)
- **B.** 5e^(j40(π)t) + 5e^(−j40(π)t)
- **C.** 10e^(−j40(π)t) 0 *(as printed)*
- **D.** 10e^(j40(π)t)

### Answer and explanation

**Answer: B. 5e^(j40πt) + 5e^(−j40πt).**

$$\cos\theta=\frac{e^{j\theta}+e^{-j\theta}}{2}$$

$$10\cos 40\pi t=5e^{j40\pi t}+5e^{-j40\pi t}$$

Why the other choices are incorrect:
- 5e^(j40πt) → Missing the conjugate term.
- 10e^(j40πt) / 10e^(−j40πt) → Only one exponential, with the wrong coefficient.

Differentiate Similar Concepts:
- cos θ → (e^{jθ} + e^{−jθ})/2.
- sin θ → (e^{jθ} − e^{−jθ})/(2j).

💡 Memory Hook:
Cosine is the average of the pair.

🎯 Board Tip:
Real signals always need both exponentials.

---

---

## 19. Question

Find the volume of a cone with a height of 9 cm and a radius of 5 cm.

- **A.** 157.14 cu. cm
- **B.** 235.62 cu. cm
- **C.** 158.90 cu. cm
- **D.** 942.48 cu. cm

### Answer and explanation

**Answer: B. 235.62 cu. cm.**

$$V=\frac{1}{3}\pi r^2h=\frac{1}{3}\pi(5)^2(9)=75\pi=235.62\ \text{cm}^3$$

Why the other choices are incorrect:
- 942.48 → Cylinder with the wrong radius or height.
- 157.14 / 158.90 → Wrong arithmetic.

Differentiate Similar Concepts:
- Cone → ⅓πr²h.
- Cylinder → πr²h.

💡 Memory Hook:
Cone is one-third of the cylinder.

🎯 Board Tip:
Do not mix up height and slant height.

---

---

## 20. Question

A ship's captain observes the top of a lighthouse at an elevation angle of 60 degrees. Five minutes later, the captain observes the same point at 30 degrees. The captain's eye is 6 m above sea level, and the lighthouse is 60 m high. Find the ship's speed.

- **A.** 0.265 m/s
- **B.** 0.155 m/s
- **C.** 0.169 m/s
- **D.** 0.21 m/s

### Answer and explanation

**Answer: D. 0.21 m/s.**

Height of the top above the captain's eye is 60 − 6 = 54 m.

$$d_1=\frac{54}{\tan 60^\circ}=31.18\ \text{m},\qquad d_2=\frac{54}{\tan 30^\circ}=93.53\ \text{m}$$

$$v=\frac{d_2-d_1}{t}=\frac{62.35}{300}=0.208\approx 0.21\ \text{m/s}$$

Why the other choices are incorrect:
- 0.265 / 0.155 / 0.169 m/s → Use the wrong height (for example 60 m) or the wrong time.

Differentiate Similar Concepts:
- Eye level → Subtract it from the height.
- Elevation angle → Measured from the horizontal at the eye.

💡 Memory Hook:
Use the height above the eye, not above sea level.

🎯 Board Tip:
Convert 5 minutes to 300 s.

---

---

## 21. Question

Kepler's third law states that the square of an orbit's period \((T)\) varies directly with the cube of its semimajor axis \((a)\). Earth's semimajor axis is \(1.49527\times10^{11}\) m and its orbital period is 365.256 days. Find Mars's orbital period if its semimajor axis is \(2.2783\times10^{11}\) m.

- **A.** 512.11 days
- **B.** 686.96 days
- **C.** 824.33 days
- **D.** 1022.45 days

### Answer and explanation

**Answer: B. 686.96 days.**

$$\frac{T_M^2}{T_E^2}=\frac{a_M^3}{a_E^3}$$

$$T_M=365.256\left(\frac{2.2783\times10^{11}}{1.49527\times10^{11}}\right)^{3/2}=365.256(1.8808)=686.96\ \text{days}$$

Why the other choices are incorrect:
- 512.11 → Used a ratio to the first power or a wrong exponent.
- 824.33 / 1022.45 → Used a² and a³ the wrong way around.

Differentiate Similar Concepts:
- T² ∝ a³ → Kepler's third law.
- T ∝ a^(3/2) → Same law, solved for T.

💡 Memory Hook:
Period goes as a to the three-halves.

🎯 Board Tip:
Take the ratio so the units cancel.

---

---

## 22. Question

A satellite dish is a paraboloid of revolution, 8 ft wide at its opening and 3 ft deep. How far from the dish's vertex (the base center) should the receiver be placed, at the focus?

- **A.** 1 foot, 6 inches from the base
- **B.** 2 feet, 3 inches from the base
- **C.** 1 foot, 3 inches from the base
- **D.** 1 foot, 4 inches from the base

### Answer and explanation

**Answer: D. 1 foot, 4 inches from the base.**

Place the vertex at the origin: x² = 4py. The rim point is (4, 3).

$$4^2=4p(3)\;\Rightarrow\;p=\frac{4}{3}\ \text{ft}=1\ \text{ft }4\ \text{in}$$

Why the other choices are incorrect:
- 1 ft 6 in / 2 ft 3 in / 1 ft 3 in → Wrong p from arithmetic errors.

Differentiate Similar Concepts:
- Focal length p → Distance from vertex to focus.
- Depth → Distance from vertex to the rim plane.

💡 Memory Hook:
x² = 4py, plug in the rim point.

🎯 Board Tip:
Half the opening is x, and the depth is y.

---

---

## 23. Question

A triangle has side lengths \(x\), \(y\), and \(z\), with a fixed perimeter of 18 cm. What is the greatest possible area?

- **A.** 15.59 cm²
- **B.** 18.71 cm²
- **C.** 17.15 cm²
- **D.** 14.03 cm²

### Answer and explanation

**Answer: A. 15.59 cm².**

For a fixed perimeter, the maximum area is the equilateral triangle, so each side is 18/3 = 6 cm.

$$A=\frac{\sqrt{3}}{4}s^2=\frac{\sqrt{3}}{4}(6)^2=15.59\ \text{cm}^2$$

Why the other choices are incorrect:
- 17.15 / 18.71 / 14.03 → Larger or smaller than the equilateral triangle's area, so not valid (equilateral is the maximum).

Differentiate Similar Concepts:
- Fixed perimeter → Equilateral gives the max area.
- Fixed area → Equilateral gives the min perimeter.

💡 Memory Hook:
Most symmetrical, most area.

🎯 Board Tip:
Check a result against Heron's formula.

---

---

## 24. Question

Which conic section has eccentricity zero?

- **A.** Circle
- **B.** Ellipse
- **C.** Parabola
- **D.** Hyperbola

### Answer and explanation

**Answer: A. Circle.**

Eccentricity: circle = 0, ellipse between 0 and 1, parabola = 1, hyperbola > 1.

Why the other choices are incorrect:
- Ellipse → 0 < e < 1.
- Parabola → e = 1.
- Hyperbola → e > 1.

Differentiate Similar Concepts:
- Circle → e = 0.
- Ellipse → e < 1.
- Parabola → e = 1.
- Hyperbola → e > 1.

💡 Memory Hook:
Circle is zero, perfectly round.

🎯 Board Tip:
Memorize the order 0, <1, 1, >1.

---

---

## 25. Question

Find the distance between points \(A(5,-4)\) and \(B(-3,2)\).

- **A.** 11
- **B.** 9
- **C.** 10
- **D.** 8

### Answer and explanation

**Answer: C. 10.**

$$d=\sqrt{(5-(-3))^2+(-4-2)^2}=\sqrt{64+36}=10$$

Why the other choices are incorrect:
- 11 / 9 / 8 → Arithmetic or sign errors in the differences.

Differentiate Similar Concepts:
- Distance → Square root of the sum of squared differences.
- Midpoint → Average of the coordinates.

💡 Memory Hook:
Pythagoras on the coordinate differences.

🎯 Board Tip:
This is a 6-8-10 triangle.

---

---

## 26. Question

A store sells 200 flat-screen TVs per week for $350 each. For every $10 rebate, weekly sales increase by 20 TVs. The revenue and price functions are \(R(x)=450x-\frac{x^2}{2}\) and \(p(x)=450-\frac{x}{2}\), respectively. What rebate should the store offer to maximize profit?

- **A.** 100 dollars
- **B.** 125 dollars
- **C.** 150 dollars
- **D.** 200 dollars

### Answer and explanation

**Answer: B. 125 dollars.**

Here x is the number of TVs sold and p(x) = 450 − x/2 is the price. No cost is given, so maximizing profit means maximizing revenue.

$$R'(x)=450-x=0\;\Rightarrow\;x=450\ \text{TVs}$$

$$R''(x)=-1<0\;\Rightarrow\;\text{maximum}$$

$$p(450)=450-225=225\ \text{dollars},\qquad \text{Rebate}=350-225=125\ \text{dollars}$$

Check: the original price is p(200) = 350, so a $125 rebate gives 12.5 steps of $10, and 12.5 × 20 = 250 more TVs, so 200 + 250 = 450 ✓.

Why the other choices are incorrect:
- 100 / 150 / 200 dollars → They do not come from R′(x) = 0.
- Answering 225 or 450 → Those are the price and the quantity, not the rebate.

Differentiate Similar Concepts:
- Price p(x) → What each buyer pays.
- Rebate → Original price minus the new price.
- Revenue R(x) → x · p(x).

💡 Memory Hook:
Set R′ to zero, then subtract the new price from the old.

🎯 Board Tip:
Read the last line of the problem. It asks for the rebate, not the price or the quantity.

---

---

## 27. Question

For \(y=\frac{x^3}{3}-2x^2+3x+1\), which value of \(x\) gives a local minimum?

- **A.** 0
- **B.** 1
- **C.** 2
- **D.** 3

### Answer and explanation

**Answer: D. 3.**

$$y'=x^2-4x+3=(x-1)(x-3)=0\;\Rightarrow\;x=1,\ 3$$

$$y''=2x-4:\quad y''(1)=-2\ (\text{max}),\qquad y''(3)=+2\ (\text{min})$$

Why the other choices are incorrect:
- 1 → It is a critical point, but it is a local maximum.
- 0 / 2 → Neither is a critical point. x = 2 is the inflection point, where y″ = 0.

Differentiate Similar Concepts:
- y″ > 0 → Concave up, local minimum.
- y″ < 0 → Concave down, local maximum.
- y″ = 0 with a sign change → Inflection point.

💡 Memory Hook:
Positive second derivative holds water, so it is a minimum.

🎯 Board Tip:
Finding the critical points is half the job. Always run the second-derivative test.

---

---

## 28. Question

A train travels at 10 mi/h along a circular track with a radius of 1,500 ft. Through what angle does it turn in one minute?

- **A.** 33.61 degrees
- **B.** 16.13 degrees
- **C.** 56.21 degrees
- **D.** 0.59 degrees

### Answer and explanation

**Answer: A. 33.61 degrees.**

$$10\ \text{mi/h}=\frac{10(5280)}{60}=880\ \text{ft/min}$$

$$\theta=\frac{s}{r}=\frac{880}{1500}=0.5867\ \text{rad}=0.5867\left(\frac{180^\circ}{\pi}\right)=33.61^\circ$$

Why the other choices are incorrect:
- 0.59 degrees → This is the angle in radians (0.5867), not converted to degrees.
- 56.21 / 16.13 degrees → Wrong unit conversion for the speed or the time.

Differentiate Similar Concepts:
- Arc length → s = rθ, with θ in radians.
- Radians to degrees → Multiply by 180/π.

💡 Memory Hook:
s = rθ, and only in radians.

🎯 Board Tip:
Convert mi/h to ft/min first, so the units match the radius in feet.

---

---

## 29. Question

Find the area bounded by the curve \(y=8-x^2\) and the \(x\)-axis.

- **A.** 15.08 unit²
- **B.** 30.17 unit²
- **C.** 36 unit²
- **D.** 45.12 unit²

### Answer and explanation

**Answer: B. 30.17 unit².**

The curve meets the x-axis at x = ±2√2.

$$A=2\int_0^{2\sqrt2}(8-x^2)\,dx=2\left[8x-\frac{x^3}{3}\right]_0^{2\sqrt2}=2\left(16\sqrt2-\frac{16\sqrt2}{3}\right)=\frac{64\sqrt2}{3}=30.17$$

Why the other choices are incorrect:
- 15.08 → Only half of the region (0 to 2√2, without doubling).
- 36 / 45.12 → Wrong limits.

Differentiate Similar Concepts:
- Symmetric region → Double the half-integral.
- Area under the curve → ∫ y dx, with y ≥ 0 on the interval.

💡 Memory Hook:
Roots are the limits, and symmetry doubles the half.

🎯 Board Tip:
Check the sign of y between the limits before integrating.

---

---

## 30. Question

Ian makes an open-top box from a 28 in by 24 in rectangular sheet of cardboard by cutting a square of side \(x\) from each corner and folding up the sides. What value of \(x\) maximizes the box's volume?

- **A.** 13.04 inches
- **B.** 6.00 inches
- **C.** 4.30 inches
- **D.** 8.60 inches

### Answer and explanation

**Answer: C. 4.30 inches.**

$$V=x(28-2x)(24-2x)=4x^3-104x^2+672x$$

$$V'=12x^2-208x+672=0\;\Rightarrow\;3x^2-52x+168=0$$

$$x=\frac{52\pm\sqrt{2704-2016}}{6}=\frac{52\pm26.23}{6}=4.30\ \text{or}\ 13.04$$

x = 13.04 is rejected because 24 − 2(13.04) is negative. Also V″(4.30) = 24(4.30) − 208 < 0, so x = 4.30 is the maximum.

Why the other choices are incorrect:
- 13.04 → The other root, which gives a negative width.
- 6.00 / 8.60 → Not roots of V′ = 0.

Differentiate Similar Concepts:
- Valid domain → 0 < x < 12 (half of the shorter side).
- Both roots of V′ → Only the one inside the domain counts.

💡 Memory Hook:
Roots of V′, then throw out the one that is out of range.

🎯 Board Tip:
The cut x must be less than half of the smaller side.

---

---

## 31. Question

In how many distinct ways can 8 people be seated around a round table?

- **A.** 5,040 ways
- **B.** 20,160 ways
- **C.** 40,320 ways
- **D.** 16,777,216 ways

### Answer and explanation

**Answer: A. 5,040 ways.**

$$(n-1)!=7!=5040$$

Why the other choices are incorrect:
- 40,320 → 8!, which is the count for a straight line, not a circle.
- 20,160 → 8!/2, which applies only if clockwise and counterclockwise count as the same (necklace).
- 16,777,216 → 8⁸, which allows repeats.

Differentiate Similar Concepts:
- Circular permutation → (n − 1)!
- Linear permutation → n!
- Necklace (flip allowed) → (n − 1)!/2

💡 Memory Hook:
Fix one person, then arrange the rest.

🎯 Board Tip:
Rotations count as the same seating, so divide by n.

---

---

## 32. Question

Rationalize the denominator of \(\frac{2}{3-\sqrt5}\).

- **A.** (3 + √5)/2
- **B.** 3 + √5
- **C.** 3 − √5
- **D.** (3 − √5)/2

### Answer and explanation

**Answer: A. (3 + √5)/2.**

$$\frac{2}{3-\sqrt5}\cdot\frac{3+\sqrt5}{3+\sqrt5}=\frac{2(3+\sqrt5)}{9-5}=\frac{3+\sqrt5}{2}$$

Why the other choices are incorrect:
- 3 + √5 → Forgot to divide by 2.
- 3 − √5 and (3 − √5)/2 → Used the wrong sign, so the denominator is not rationalized.

Differentiate Similar Concepts:
- Conjugate of (a − √b) → (a + √b).
- (a − √b)(a + √b) → a² − b.

💡 Memory Hook:
Flip the sign to kill the root.

🎯 Board Tip:
Check the answer by decimal: 2/(0.764) = 2.618 = (3 + 2.236)/2 ✓.

---

---

## 33. Question

A man walks along a bridge at 5 ft/s as a boat traveling at 10 ft/s passes directly beneath him. The bridge is 10 ft above the boat. Assuming the boat travels perpendicular to the bridge, how fast are they separating 1 second later?

- **A.** 8 fps
- **B.** 8.25 fps
- **C.** 8.33 fps
- **D.** 8.67 fps

### Answer and explanation

**Answer: C. 8.33 fps.**

$$D^2=10^2+(5t)^2+(10t)^2=100+125t^2$$

$$2D\frac{dD}{dt}=250t\;\Rightarrow\;\frac{dD}{dt}=\frac{125t}{D}$$

At t = 1: D = √225 = 15 ft, so dD/dt = 125/15 = 8.33 fps.

Why the other choices are incorrect:
- 8 / 8.25 / 8.67 fps → Wrong distance D, or the 10 ft vertical gap was left out of the setup.

Differentiate Similar Concepts:
- Related rates → Write the distance equation first, then differentiate with respect to time.
- Speeds do not simply add → Directions matter.

💡 Memory Hook:
Build D², differentiate, then plug in the time.

🎯 Board Tip:
Do not substitute t = 1 until after differentiating.

---

---

## 34. Question

A ball is dropped from the CN Tower's upper observation deck. Its height is modeled by \(h=449.36+0.96t-4.90t^2\), where \(h\) is in meters and \(t\) is in seconds. How long until the ball hits the ground?

- **A.** 4.5 s
- **B.** 6.1 s
- **C.** 8.35 s
- **D.** 9.7 s

### Answer and explanation

**Answer: D. 9.7 s.**

Set h = 0:

$$4.9t^2-0.96t-449.36=0$$

$$t=\frac{0.96\pm\sqrt{0.96^2+4(4.9)(449.36)}}{2(4.9)}=\frac{0.96\pm93.85}{9.8}$$

$$t=9.68\ \text{s}\approx 9.7\ \text{s}\quad(\text{reject }t=-9.48\ \text{s})$$

Why the other choices are incorrect:
- 4.5 / 6.1 / 8.35 s → Do not make h = 0 when substituted.

Differentiate Similar Concepts:
- Positive root → Physical time.
- Negative root → Rejected, since it is before the drop.

💡 Memory Hook:
Hits the ground means h = 0, and time is positive.

🎯 Board Tip:
Substitute your answer back to check that h is close to 0.

---

---

## 35. Question

Find the slope of the tangent to \(y=2x-x^2+x^3\) at \(x=1\).

- **A.** 1
- **B.** 2
- **C.** 3
- **D.** 4

### Answer and explanation

**Answer: C. 3.**

$$y'=2-2x+3x^2\;\Rightarrow\;y'(1)=2-2+3=3$$

Why the other choices are incorrect:
- 1 → Treated the derivative of x³ as x² (dropped the 3).
- 2 → That is y(1), the height of the curve, not the slope.
- 4 → Arithmetic error.

Differentiate Similar Concepts:
- y(1) → The point's height.
- y′(1) → The slope of the tangent.

💡 Memory Hook:
Slope means derivative, so differentiate first and then plug in.

🎯 Board Tip:
Do not plug x into the original function when the question asks for the slope.

---

---

## 36. Question

A triangle has area 39.19 cm^2 and two side lengths of 8 cm and 14 cm. Find the radius of its inscribed circle.

- **A.** 2.25 cm
- **B.** 2.35 cm
- **C.** 2.45 cm
- **D.** 2.55 cm

### Answer and explanation

**Answer: C. 2.45 cm.**

$$39.19=\tfrac12(8)(14)\sin C\;\Rightarrow\;\sin C=0.700,\quad C=44.4^\circ$$

$$c^2=8^2+14^2-2(8)(14)\cos 44.4^\circ=100\;\Rightarrow\;c=10$$

$$s=\frac{8+14+10}{2}=16,\qquad r=\frac{A}{s}=\frac{39.19}{16}=2.45\ \text{cm}$$

If C were obtuse (135.6°), then c = 20.5 and r = 1.84, which is not a choice, so the acute case applies.

Why the other choices are incorrect:
- 2.25 / 2.35 / 2.55 cm → Arithmetic errors in the third side or in s.

Differentiate Similar Concepts:
- Inradius → r = A / s.
- Circumradius → R = abc / (4A).

💡 Memory Hook:
Inradius equals area over semiperimeter.

🎯 Board Tip:
Find the third side first, since r = A/s needs all three sides.

---

---

## 37. Question

Find the acute angle between the lines \(2x+y-8=0\) and \(x+3y+4=0\).

- **A.** 30 degrees
- **B.** 35 degrees
- **C.** 45 degrees
- **D.** 60 degrees

### Answer and explanation

**Answer: C. 45 degrees.**

$$m_1=-2,\qquad m_2=-\tfrac13$$

$$\tan\theta=\left|\frac{m_2-m_1}{1+m_1m_2}\right|=\left|\frac{-\tfrac13+2}{1+\tfrac23}\right|=\frac{5/3}{5/3}=1\;\Rightarrow\;\theta=45^\circ$$

Why the other choices are incorrect:
- 30 / 35 / 60 degrees → Do not have tan θ = 1.

Differentiate Similar Concepts:
- Slope of Ax + By + C = 0 → −A/B.
- Perpendicular lines → m₁m₂ = −1.
- Parallel lines → m₁ = m₂.

💡 Memory Hook:
Slope is minus A over B, then use the angle formula.

🎯 Board Tip:
Use the absolute value to get the acute angle.

---

---

## 38. Question

Find the radius of the circle \(x^2+y^2-4=0\).

- **A.** 4
- **B.** 2
- **C.** 16
- **D.** 0.25

### Answer and explanation

**Answer: B. 2.**

$$x^2+y^2=4=r^2\;\Rightarrow\;r=2$$

Why the other choices are incorrect:
- 4 → That is r², not r.
- 16 / 0.25 → Squared or inverted the value.

Differentiate Similar Concepts:
- x² + y² = r² → Circle centered at the origin.
- (x − h)² + (y − k)² = r² → Center at (h, k).

💡 Memory Hook:
The number on the right is r squared.

🎯 Board Tip:
Take the square root.

---

---

## 39. Question

Find the differential equation representing the family of lines that pass through the origin.

- **A.** ydx − xdy = 0
- **B.** xdy − ydx = 0
- **C.** xdx + ydy = 0
- **D.** ydx + xdy = 0

> **Source discrepancy:** The exam source prints choices A and B as equivalent equations with opposite signs, so both represent the same differential equation. The answer source replaces A with `x dx - y dy = 0` and keeps B as the answer. The original exam choices are retained here; the answer-source explanation below uses its revised choice set.

### Answer and explanation

**Answer: B. x dy − y dx = 0.**

$$y=mx\;\Rightarrow\;m=\frac{y}{x},\qquad \frac{dy}{dx}=m=\frac{y}{x}\;\Rightarrow\;x\,dy-y\,dx=0$$

Why the other choices are incorrect:
- x dx − y dy = 0 → That is the family of hyperbolas x² − y² = C.
- x dx + y dy = 0 → That is the family of circles about the origin.
- y dx + x dy = 0 → That is the family of hyperbolas xy = C.

Differentiate Similar Concepts:
- Lines through the origin → y = mx.
- Circles about the origin → x² + y² = C.
- Hyperbolas xy = C → y dx + x dy = 0.
- Hyperbolas x² − y² = C → x dx − y dy = 0.

💡 Memory Hook:
Eliminate the constant m by using m = y/x.

🎯 Board Tip:
One arbitrary constant means a first-order equation.

---

---

## 40. Question

A cylinder and a cone are joined along a circular base. The cylinder has radius 9 cm and height 13 cm; the cone has the same base radius and a slant height of 15 cm. Find the total exterior surface area of the combined solid.

- **A.** 450 sq. cm
- **B.** 1414 sq. cm
- **C.** 1755 sq. cm
- **D.** 204 sq. cm

### Answer and explanation

**Answer: B. 1414 sq. cm.**

Surfaces that show: the cylinder's bottom base, the cylinder's side, and the cone's lateral surface. The joined face is hidden.

$$A=\pi r^2+2\pi rh+\pi rl=\pi(81+234+135)=450\pi=1413.7\approx 1414\ \text{cm}^2$$

Why the other choices are incorrect:
- 450 sq. cm → Forgot the factor of π.
- 1755 / 204 sq. cm → Wrong combination of surfaces.

Differentiate Similar Concepts:
- Cone lateral area → πrl, using slant height.
- Cylinder lateral area → 2πrh.
- Joined faces → Not counted in the total.

💡 Memory Hook:
Count only the surfaces you can touch.

🎯 Board Tip:
The cone's slant height is used for the area, and its vertical height is only for the volume.

---

---

## 41. Question

How much water must be added to 64 oz of a 10% salt solution to obtain a 2% salt solution?

- **A.** 128 ounces
- **B.** 154 ounces
- **C.** 208 ounces
- **D.** 256 ounces

### Answer and explanation

**Answer: D. 256 ounces.**

$$0.10(64)=0.02(64+x)\;\Rightarrow\;6.4=0.02(64+x)\;\Rightarrow\;64+x=320\;\Rightarrow\;x=256\ \text{oz}$$

Why the other choices are incorrect:
- 128 / 154 / 208 oz → Do not keep the salt amount at 6.4 oz in the final mixture.
- 320 oz → That is the total volume, not the water added.

Differentiate Similar Concepts:
- Dilution → The amount of salt does not change.
- Water added → Final volume minus the original volume.

💡 Memory Hook:
Salt stays the same, water changes.

🎯 Board Tip:
Subtract the starting volume from the final volume.

---

---

## 42. Question

A triangle has side lengths 18 in, 5 in, and 20 in. A similar triangle has a longest side of 80 in. What is the length of its shorter side?

- **A.** 10 in
- **B.** 20 in
- **C.** 30 in
- **D.** 40 in

### Answer and explanation

**Answer: B. 20 in.**

$$k=\frac{80}{20}=4\;\Rightarrow\;\text{shorter side}=4(5)=20\ \text{in}$$

Why the other choices are incorrect:
- 10 / 30 / 40 in → Wrong scale factor or the wrong side.

Differentiate Similar Concepts:
- Similar figures → Sides are proportional.
- Areas → Scale by k².

💡 Memory Hook:
Longest matches longest, shortest matches shortest.

🎯 Board Tip:
Find k = 80/20 first, then multiply the shortest side by it.

---

---

## 43. Question

Find the area of the triangle with vertices \((-4,0)\), \((7,0)\), and \((3,2)\).

- **A.** 8 sq. units
- **B.** 9 sq. units
- **C.** 10 sq. units
- **D.** 11 sq. units

### Answer and explanation

**Answer: D. 11 sq. units.**

The base lies on the x-axis from −4 to 7, so it is 11 units. The height is the y-coordinate of (3, 2), which is 2.

$$A=\tfrac12(11)(2)=11\ \text{sq. units}$$

Why the other choices are incorrect:
- 8 / 9 / 10 → Wrong base length.

Differentiate Similar Concepts:
- Triangle with a side on an axis → ½ × base × height.
- General vertices → Shoelace formula.

💡 Memory Hook:
Spot the base on the axis, then read the height.

🎯 Board Tip:
Sketch the points quickly before computing.

---

---

## 44. Question

Let \(X\) be the number of 48 voice lines in use at a particular time. Assume \(X\) is discrete uniform on the integers from 0 through 48. Find its standard deviation.

- **A.** 14
- **B.** 24
- **C.** 48
- **D.** 200

### Answer and explanation

**Answer: A. 14.**

There are N = 49 values (0, 1, …, 48).

$$\sigma^2=\frac{N^2-1}{12}=\frac{49^2-1}{12}=\frac{2400}{12}=200$$

$$\sigma=\sqrt{200}=14.14\approx 14$$

Why the other choices are incorrect:
- 200 → That is the variance, not the standard deviation.
- 24 / 48 → Half of the range and the range itself.

Differentiate Similar Concepts:
- Variance → σ².
- Standard deviation → √(variance).
- Count of values → Range + 1.

💡 Memory Hook:
Count the values first. 0 to 48 has 49.

🎯 Board Tip:
Take the square root at the end.

---

---

## 45. Question

An airplane's airspeed is 300 mph, and the wind blows east at 50 mph. What compass heading should the airplane fly to maintain a course of 30 degrees, and what will its ground speed be?

- **A.** 19.7 deg, 307.4 mph
- **B.** 20.1 deg, 309.4 mph
- **C.** 21.7 deg, 321.8 mph
- **D.** 22.3 deg, 319.2 mph

### Answer and explanation

**Answer: C. 21.7°, 321.8 mph.**

The wind pushes the plane east, so the plane must aim west of its course. The wind component perpendicular to the course is 50 sin 60° = 43.3 mph.

$$\sin\alpha=\frac{43.3}{300}=0.1443\;\Rightarrow\;\alpha=8.3^\circ$$

$$\text{Heading}=30^\circ-8.3^\circ=21.7^\circ$$

$$\text{Ground speed}=300\cos 8.3^\circ+50\cos 60^\circ=296.8+25=321.8\ \text{mph}$$

Why the other choices are incorrect:
- 19.7° / 20.1° / 22.3° → Wrong correction angle or wind direction.
- 307.4 / 309.4 / 319.2 mph → Do not match the ground-speed equation.

Differentiate Similar Concepts:
- Heading → Where the nose points.
- Course (track) → Where the plane actually moves over the ground.
- Ground speed = Air vector + wind vector.

💡 Memory Hook:
Aim into the wind, then add the along-track part of the wind.

🎯 Board Tip:
Check the heading and the speed together, because both must be in the same choice.

---

---

## 46. Question

Find the sum of the first 10 terms of the geometric progression \(2,4,8,\ldots\).

- **A.** 1023
- **B.** 2046
- **C.** 225
- **D.** 1596

### Answer and explanation

**Answer: B. 2046.**

$$S_n=\frac{a(r^n-1)}{r-1}=\frac{2(2^{10}-1)}{2-1}=2(1023)=2046$$

Why the other choices are incorrect:
- 1023 → Forgot the first term a = 2.
- 225 / 1596 → Arithmetic-progression or arithmetic errors.

Differentiate Similar Concepts:
- GP sum → a(rⁿ − 1)/(r − 1).
- AP sum → n/2 (a₁ + aₙ).

💡 Memory Hook:
Double each time, so the sum is nearly the next term doubled.

🎯 Board Tip:
Sum of 2, 4, …, 1024 = 2048 − 2 = 2046.

---

---

## 47. Question

What is the smaller angle between the clock hands at 3:12 p.m.?

- **A.** 12 degrees
- **B.** 24 degrees
- **C.** 72 degrees
- **D.** 96 degrees

### Answer and explanation

**Answer: B. 24 degrees.**

$$\text{Minute hand}=12(6^\circ)=72^\circ$$

$$\text{Hour hand}=3(30^\circ)+12(0.5^\circ)=96^\circ$$

$$\theta=96^\circ-72^\circ=24^\circ$$

Why the other choices are incorrect:
- 72° → Position of the minute hand only.
- 96° → Position of the hour hand only.
- 12° → Wrong hour-hand movement.

Differentiate Similar Concepts:
- Minute hand → 6° per minute.
- Hour hand → 30° per hour, or 0.5° per minute.

💡 Memory Hook:
Six per minute, half per minute for the hour hand.

🎯 Board Tip:
Do not forget that the hour hand has already moved past the 3.

---

---

## 48. Question

Airplane A departs an airfield on a bearing of S 42 degrees 35 minutes W at 5 kph. Two hours later, Airplane B departs the same airfield on a bearing of N 46 degrees 20 minutes W at 7 kph. How many hours after B departs will B be directly north of A?

- **A.** 3.68
- **B.** 4.03
- **C.** 5.12
- **D.** 4.83

### Answer and explanation

**Answer: B. 4.03 hours.**

Let t be the time after B departs, so A has flown for t + 2 hours. B is exactly north of A when both have the same westward distance.

$$5(t+2)\sin 42^\circ35'=7t\sin 46^\circ20'$$

$$3.3835(t+2)=5.0637\,t\;\Rightarrow\;t=\frac{6.767}{1.680}=4.03\ \text{h}$$

Measured from A's departure the same moment is 6.03 h, which is why the question was reworded to count from B's departure.

Why the other choices are incorrect:
- 3.68 / 5.12 / 4.83 → Do not equalize the westward distances.

Differentiate Similar Concepts:
- Due north of A → Same east–west position.
- Bearing N θ W → West component = d sin θ, north component = d cos θ.

💡 Memory Hook:
Directly north means the same x, so set the west components equal.

🎯 Board Tip:
Mind the head start. A has been flying 2 hours longer.

---

---

## 49. Question

At the point \((4,3)\), the normal to a curve lies along the line \(3x-4y=0\). Which equation could describe the curve?

- **A.** x² + y² = 25
- **B.** x² − y² = 7 ✓ *(a checkmark is penciled beside this option in the photo)*
- **C.** y² = 2.25x
- **D.** x² + 4y² = 25

### Answer and explanation

**Answer: A. x² + y² = 25.** (The pencil check beside choice b on the photographed page is not the correct answer. Choice b fails the normal-line test shown below.)

The line 3x − 4y = 0 passes through the origin and through (4, 3). A curve whose normal at every point passes through the origin is a circle centered at the origin.

$$4^2+3^2=25\;\Rightarrow\;x^2+y^2=25$$

Check: gradient at (4, 3) is (8, 6), so the normal has slope 6/8 = 3/4, giving y = (3/4)x, or 3x − 4y = 0 ✓.

Why the other choices are incorrect:
- x² − y² = 7 → Passes through (4, 3), but its normal there has slope −3/4, giving 3x + 4y = 24.
- y² = 2.25x → Passes through (4, 3), but its normal slope there is −8/3.
- x² + 4y² = 25 → Does not pass through (4, 3), since 16 + 36 = 52.

Differentiate Similar Concepts:
- Normal line → Perpendicular to the tangent, along the gradient.
- Normals of a circle → All pass through the center.

💡 Memory Hook:
A normal through the origin means a circle around the origin.

🎯 Board Tip:
Test whether (4, 3) is on each curve before doing any calculus.

---

---

## 50. Question

Evaluate \(\log_3(\log_2 10)\).

- **A.** 0.631
- **B.** 1.093
- **C.** 2.322
- **D.** 0.434

### Answer and explanation

**Answer: B. 1.093.**

$$\log_2 10=\frac{\ln 10}{\ln 2}=3.3219$$

$$\log_3(3.3219)=\frac{\ln 3.3219}{\ln 3}=\frac{1.2005}{1.0986}=1.093$$

Why the other choices are incorrect:
- 0.631 → That is log₃ 2.
- 2.322 → That is log₂ 5.
- 0.434 → That is log₁₀ e, or 1/ln 10.

Differentiate Similar Concepts:
- Change of base → log_b a = ln a / ln b.
- Nested logs → Evaluate the inside first.

💡 Memory Hook:
Inside out, and change of base twice.

🎯 Board Tip:
Keep at least four decimals in the inner log before taking the outer one.

---

***** NOTHING FOLLOWS *****

## Transcription notes

The source exam was transcribed from angled, watermarked photos. Verify these details against the original image if available:

- **Q4, choice A:** The source reads `x + y/xy`, which appears malformed; it is retained as transcribed.
- **Q11:** The determinant matrix was flagged for verification against the image.
- **Q18, choice C:** The source includes an extra `0`; it is retained as transcribed.

*End of reviewer.*

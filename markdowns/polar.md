# Drag Polar and Minimum Power Required

Derivation of the conditions for minimum power required in steady level flight, with numbers for the flying wing (YB-49 type) problem.

## 1. Setup

Parabolic drag polar:

$$C_D = C_{D,0} + K C_L^2, \qquad K = \frac{1}{\pi e\, AR}$$

In steady level flight ($L = W$), the power required is $P_R = DV$. Using $D = \dfrac{W}{C_L/C_D}$ and $V = \sqrt{\dfrac{2W}{\rho S C_L}}$:

$$P_R = WV\,\frac{C_D}{C_L} = \sqrt{\frac{2W^3}{\rho S}}\;\frac{C_D}{C_L^{3/2}}$$

## 2. Minimize $P_R$

For a given $W$, $\rho$ and $S$, $P_R$ is minimum when $C_L^{3/2}/C_D$ is maximum. Differentiating $C_D/C_L^{3/2}$ with respect to $C_L$ and setting the result to zero:

$$\frac{3}{2}\,C_D = C_L\frac{dC_D}{dC_L} = C_L\,(2K C_L)$$

$$3\left(C_{D,0} + K C_L^2\right) = 4K C_L^2$$

$$\boxed{K C_L^2 = 3\,C_{D,0}}$$

## 3. Results

- **Lift coefficient:**
  $$C_L = \sqrt{\frac{3\,C_{D,0}}{K}} = \sqrt{3\pi e\, AR\, C_{D,0}}$$
- **Drag coefficient:**
  $$C_D = C_{D,0} + 3C_{D,0} = 4\,C_{D,0}$$
  so the induced drag is 3 times the parasite drag.
- **Comparison with minimum drag:** at minimum power $C_D = 4C_{D,0}$, versus $C_D = 2C_{D,0}$ at minimum drag.
- **Lift-to-drag ratio:**
  $$\left(\frac{L}{D}\right)_{\min P} = \frac{C_L}{4C_{D,0}} = \frac{\sqrt{3}}{2}\left(\frac{L}{D}\right)_{\max} \approx 0.866\left(\frac{L}{D}\right)_{\max}$$
- **Velocity:**
  $$V_{\min P} = \sqrt{\frac{2W}{\rho S C_L}} = \left(\frac{1}{\sqrt{3}}\right)^{1/2} V_{\min D} = 0.760\,V_{\min D}$$
- **Minimum power:**
  $$P_{R,\min} = \frac{W V_{\min P}}{L/D} = \sqrt{\frac{2W^3}{\rho S}}\;\frac{4\,C_{D,0}}{\left(3C_{D,0}/K\right)^{3/4}}$$

## 4. Numbers for the flying wing

Given: $W = 7.5\times10^{5}\ \text{N}$, $S = 206\ \text{m}^2$, $AR = 10$, $e = 0.95$, density altitude 3 km ($\rho \approx 0.909\ \text{kg/m}^3$).

Using $C_{D,0} = 0.0055$ and $K = \dfrac{1}{\pi(0.95)(10)} = 0.0335$:

- $C_L = \sqrt{\dfrac{3(0.0055)}{0.0335}} \approx 0.70$
- $C_D = 4(0.0055) = 0.022$
- $V_{\min P} = \sqrt{\dfrac{2(7.5\times10^{5})}{(0.909)(206)(0.70)}} \approx 107\ \text{m/s}$
- $L/D = \dfrac{0.70}{0.022} \approx 32$
- $D = \dfrac{W}{L/D} \approx 23.5\ \text{kN}$
- $P_{R,\min} = DV \approx 2.5\ \text{MW}$

So the 100 m/s flight condition in the previous problem (total drag $\approx 2.53\times10^{4}\ \text{N}$) is already close to the minimum-power speed.

**Assumption:** $C_{D,0}$ is treated as constant. In reality the NACA 4412 section drag varies with $c_l$ and Reynolds number, so these values are approximate.
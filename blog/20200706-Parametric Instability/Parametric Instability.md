# Parametric Instability

[Main Page](https://huangzesen.github.io)

Created: 2020-07-05

Last Updated: 2020-07-06

This is a note about parametric instability, for more details, refer to chapter 27 in Landau Book 1.

## Elements of Parametric Instability

To begin, consider a oscillating system with time-varying parameter, e.g.:
$$
m\frac{d}{dt}\dot{x}+k(t)x=0
$$
The equation above can be rewritten as:
$$
\ddot{x}+\omega^2(t)x=0
\label{27.2}
$$
Now assume the parameter-controlled term $\omega(t)$ is periodic with period $T$, i.e. $\omega(t+T)=\omega(t)$. There are two solutions to this equation (there are two linearly independent solutions to a second-order differential equaiton), namely $x_1(t)$ and $x_2(t)$. 

Since $\omega(t+T)=\omega(t)$, the equation does not change it's form with transformation $t\rightarrow t+T$, The solutions after the transformation, namely $x_1(t+T)$ and $x_2(t+T)$ should be the linear combination of $x_1(t)$ and $x_2(t)$, in other words:
$$
\begin{pmatrix}
a_{11} & a_{12}\\
a_{21} & a_{22} 
\end{pmatrix}

\begin{pmatrix}
x_1(t)\\
x_2(t)
\end{pmatrix}
=
\begin{pmatrix}
x_1(t+T)\\
x_2(t+T)
\end{pmatrix}
$$
Without lost of generality, the matrix on the left hand side can be linearly transformed to diagonal matrix (provided that there's no duplicate solutions in this system).
$$
\begin{pmatrix}
\mu_1 & 0\\
0 & \mu_2 
\end{pmatrix}

\begin{pmatrix}
x_1'(t)\\
x_2'(t)
\end{pmatrix}
=
\begin{pmatrix}
x_1'(t+T)\\
x_2'(t+T)
\end{pmatrix}
$$
Here the primed variables are linearly transformed solutions in the new coordinate system. In the following analysis, I will drop the prime for simplicity. 
$$
x_1(t+T)=\mu_1 x_1(t)\\
x_2(t+T)=\mu_2 x_2(t)
$$
What is the restrictions on $\mu_1$ and $\mu_2$? Now let's plug in $x_1$ and $x_2$ into the original equation:
$$
\ddot{x}_1+\omega^2(t)x_1=0\\
\ddot{x}_2+\omega^2(t)x_2=0
$$
Multiply $x_2$ on the first equation and $x_1 $ on the second equation and then substitute the second one from the first one, we have:
$$
x_2\ddot{x}_1-x_1\ddot{x}_2=0\\
\Rightarrow \frac{d}{dt}(x_2 \dot{x}_1-x_1 \dot{x}_2)=0\\
x_2\dot{x}_1-x_1\dot{x_2}=const
$$

This equation holds for the same constant at both $t=t$ and $t=t+T$, which implies $\mu_1\mu_2=1$. There are some detailed discussions in L&L chap27, but the basic idea being that if $\mu_1$ and $\mu_2$ begin real, there's one, e.g. $\mu_1$ larger than unity and the other, here $\mu_2$ less than unity. 

Moreover, the usual form of solutions that can meet the conditions here is:
$$
x_1(t+T)=\mu_1^{t/T}\Pi_1(t)\\
x_2(t+T)=\mu_2^{t/T}\Pi_2(t)
$$
Where $\Pi_1$ and $\Pi_2$ are pure periodic functions. Hence one of the solutions grows exponentially while the other damps exponentially. This is what called <u>Parametric Instability</u>.

## An Important Example -- Mathieu Equation

An important case of parametric instability is when $\omega(t)$ has only small difference to $\omega_0$ and is simple periodic function:
$$
\omega^2(t)=\omega^2_0(1+hcos\gamma t)
$$
Where $h\ll1$ and positive. In the following analysis, if frequency of $\omega(t)$, $\gamma$ is close to $2\omega_0$, then the parametric instability becomes very strong. Hence we assume:

$$
\gamma=2\omega_0+\epsilon
$$

Where $\epsilon\ll \omega_0$.

Solve equation of motion (This equation is also called Mathieu Equation):
$$
\ddot{x}+\omega_0^2[1+hcos(2\omega_0+\epsilon)t]x=0
$$
Assume the solution has the form:
$$
x(t)=a(t)cos(\omega_0+\epsilon/2)+b(t)sin(\omega_0+\epsilon/2)
$$
And $a(t), b(t)\propto e^{st}$, L&L §27 gives:
$$
s^2=\frac{1}{4}\left[\left(\frac{h\omega_0}{2}\right)^2-\epsilon^2\right]
$$
And the condition for parametric instability:
$$
-\frac{h\omega_0}{2}<\epsilon<\frac{h\omega_0}{2}
$$
For more detailed derivation, check L&L Book1 §27.

## Parametric Instability in Alfven Wave

Derby, N. F., Jr. (1978). Modulational instability of finite-amplitude, circularly polarized Alfven waves. *The Astrophysical Journal*, *224*, 1013–1016. https://doi.org/10.1086/156451

### Ideal MHD Equations

$$
\frac{\partial\rho}{\partial t}+\nabla\cdot(
\rho \boldsymbol{V})=0
$$

$$
\rho\left(\frac{\partial}{\partial t}+\boldsymbol{V} \cdot \nabla\right) \boldsymbol{V}=-\nabla P+(\nabla \times \boldsymbol{B}) \times \boldsymbol{B} / 4 \pi
$$

$$
\frac{\partial \boldsymbol{B}}{\partial t}=\nabla \times(V \times \boldsymbol{B})
$$

$$
\frac{d P}{d \rho}=c_{s}^{2}
$$

An exact, self-consistent solution to these equations is large-amplitude, circularly polarized wave propagating along a uniform magnetic field. This equilibrium solution has constant pressure $P_0$ and constant mass density $\rho_0$. If $z$ direction is chosen to be parallel to the background uniform field, the magnetic field and velocity field quantities can be written as:
$$
\boldsymbol{B}_{0}(z, t)=\left(B_{0 \perp} \cos \psi, B_{0 \perp} \sin \psi, B_{0 z}\right)
$$

$$
\boldsymbol{V}_{0}(z, t)=-u b(\cos \psi, \sin \psi, 0)
$$

Where $b\equiv \boldsymbol{B}_{0\perp}/\boldsymbol{B}_{0z}$, $\psi\equiv k_0z-\omega_0t$ and phase speed $\boldsymbol{u}\equiv\omega_0/k_0=\pm\boldsymbol{B_{0z}}/\sqrt{4\pi\rho_0}$. 

The aforementioned quantities are equilibrium state of a large amplitude Alfven wave. 

### Response to Small Perturbation

Now study the <u>behavior (response) of the equilibrium state in the presence of small perturbations</u> that propagate parallel to the original wave.

>This is why it is called **Parametric Instability**, the overlayed small perturbation act as small time-varying periodic drivers modifing the system's Eigen-frequency, similar to Eq( $\ref{27.2}$)

Results show that:

A large-amplitude, circularly polarized Alfvén wave is subject to a parametric instability that causes it to <u>decay into three waves</u>,a longitudinal and a transverse wave propagating parallel to the parent wave and a transverse wave propagating antiparallel. 
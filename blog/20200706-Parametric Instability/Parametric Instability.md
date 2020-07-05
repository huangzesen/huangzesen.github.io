# Parametric Instability

[Main Page](https://huangzesen.github.io)

2020-07-06

This is a note about parametric instability, for more details, refer to chapter 27 in Landau Book 1.

## Elements of Parametric Instability

Assume now we have a oscillating system with it's parameters changing over time, e.g.:
$$
\ddot{x}+\omega^2(t)x=0
$$
Now assume the parameter-controled term $\omega(t)$ is periodic with period $T$, i.e. $\omega(t+T)=\omega(t)$. There are two solutions to this equation (there are two linearly independent solutions to a second-order differential equaiton), namely $x_1(t)$ and $x_2(t)$. 

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
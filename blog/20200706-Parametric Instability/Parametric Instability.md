# Parametric Instability

2020-07-06

This is a note about parametric instability, for more details, refer to chapter 27 in Landau Book 1.

## Elements of Parametric Instability

Assume now we have a system with it's parameters changing over time, e.g.:
$$
\ddot{x}+\omega^2(t)x=0
$$
Now assume the parameter-controled term $\omega(t)$ is periodic with period $T$, i.e. $\omega(t+T)=\omega(t)$. There are two solutions to this equation (there are two linearly independent solutions to a second-order differential equaiton), namely $x_1(t)$ and $x_2(t)$. 

Since $\omega(t+T)=\omega(t)$, the equation does not change it's form with transformation $t\rightarrow t+T$, The solutions after the transformation, namely $x_1(t+T)$ and $x_2(t+T)$ should be the linearly combination of $x_1(t)$ and $x_2(t)$, in other words:
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